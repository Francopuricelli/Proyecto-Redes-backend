/**
 * Servicio de Autenticación
 * 
 * Contiene toda la lógica de negocio relacionada con:
 * - Registro de nuevos usuarios con validaciones
 * - Login con credenciales (usuario/email + contraseña)
 * - Generación de tokens JWT con expiración de 15 minutos
 * - Validación de contraseñas (8+ caracteres, 1 mayúscula, 1 número)
 * - Renovación de tokens JWT
 * - Subida de imágenes de perfil a Cloudinary
 * 
 * Seguridad:
 * - Contraseñas hasheadas con bcrypt (delegado a UsersService)
 * - Tokens JWT firmados con clave secreta
 * - Validación de edad mínima (13 años)
 * - Validación de unicidad de correo y nombre de usuario
 * - Verificación de estado activo del usuario
 */
import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/schemas/user.schema';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';

@Injectable()
export class AuthService {
  constructor(
    // UsersService: Operaciones CRUD de usuarios
    private usersService: UsersService,
    // JwtService: Generación y validación de tokens JWT
    private jwtService: JwtService,
    // CloudinaryService: Subida de imágenes a Cloudinary CDN
    private cloudinaryService: CloudinaryService,
  ) {}

  /**
   * Valida y construye el DTO de registro desde el body del request
   * 
   * Resuelve problemas de encoding con el campo "contraseña" que puede venir
   * con caracteres especiales mal codificados desde el frontend.
   * 
   * Proceso:
   * 1. Busca el campo de contraseña con manejo de encoding (contraseña, contrase*, etc.)
   * 2. Construye manualmente el RegisterDto desde el body
   * 3. Transforma el objeto plano en una instancia de clase con plainToInstance
   * 4. Valida el DTO usando class-validator decorators (@IsEmail, @MinLength, etc.)
   * 5. Si hay errores de validación, lanza BadRequestException con mensajes
   * 6. Si hay archivo, lo sube a Cloudinary y obtiene la URL segura
   * 
   * @param body - Objeto con datos del formulario de registro
   * @param file - Archivo de imagen de perfil opcional (jpg, jpeg, png, max 5MB)
   * @returns Objeto con DTO validado y URL de imagen de Cloudinary (si aplica)
   * @throws BadRequestException si la validación del DTO falla
   * 
   * Ejemplo de uso:
   * const { dto, imagenPerfil } = await validateAndBuildRegisterDto(req.body, req.file);
   */
  async validateAndBuildRegisterDto(body: any, file?: Express.Multer.File): Promise<{ dto: RegisterDto; imagenPerfil?: string }> {
    // Encontrar el campo de contraseña (puede venir con encoding issues)
    const passwordKey = Object.keys(body).find(key => 
      key === 'contraseña' || key.includes('contrase')
    );
    const password = passwordKey ? body[passwordKey] : undefined;
    
    // Construir el DTO manualmente desde el body
    const registerDto: RegisterDto = {
      nombre: body.nombre,
      apellido: body.apellido,
      correo: body.correo,
      nombreUsuario: body.nombreUsuario,
      contraseña: password,
      fechaNacimiento: body.fechaNacimiento,
      descripcionBreve: body.descripcionBreve,
    };
    
    // Validar el DTO usando class-validator
    // plainToInstance convierte el objeto plano en instancia de clase RegisterDto
    const dtoInstance = plainToInstance(RegisterDto, registerDto);
    // validate() ejecuta todos los decorators de class-validator (@IsEmail, @MinLength, etc.)
    const errors = await validate(dtoInstance);
    
    if (errors.length > 0) {
      // Extraer mensajes de error de cada constraint violada
      const messages = errors.map(error => Object.values(error.constraints || {})).flat();
      throw new BadRequestException(messages);
    }
    
    let imagenPerfil: string | undefined;
    
    // Si hay archivo, subirlo a Cloudinary en la carpeta 'perfiles'
    if (file) {
      const result = await this.cloudinaryService.uploadImage(file, 'perfiles');
      imagenPerfil = result.secure_url; // URL HTTPS de la imagen
    }

    return { dto: registerDto, imagenPerfil };
  }

  /**
   * Registra un nuevo usuario en la plataforma
   * 
   * Validaciones:
   * 1. Verifica que el correo no esté registrado (lanza ConflictException)
   * 2. Verifica que el nombre de usuario no esté registrado (lanza ConflictException)
   * 3. Valida edad mínima de 13 años (lanza BadRequestException)
   * 4. Valida formato de contraseña: 8+ caracteres, 1 mayúscula, 1 número
   * 
   * Proceso:
   * 1. Busca si existe usuario con el mismo correo
   * 2. Busca si existe usuario con el mismo nombre de usuario
   * 3. Calcula la edad basándose en fechaNacimiento
   * 4. Valida formato de contraseña con regex
   * 5. Crea el usuario en MongoDB (UsersService hashea la contraseña con bcrypt)
   * 6. Genera token JWT con payload: { correo, sub: _id, perfil }
   * 7. Prepara respuesta con usuario (sin contraseña) + token
   * 
   * @param registerDto - DTO validado con datos del usuario
   * @param imagenPerfil - URL de Cloudinary de la imagen de perfil (opcional)
   * @returns Usuario creado (sin contraseña) + token JWT de acceso
   * @throws ConflictException si correo o nombre de usuario ya existen
   * @throws BadRequestException si edad < 13 años o contraseña inválida
   * 
   * Ejemplo de respuesta:
   * {
   *   user: { id: "...", nombre: "Juan", correo: "juan@example.com", ... },
   *   access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   * }
   */
  async register(registerDto: RegisterDto, imagenPerfil?: string): Promise<{ user: User; access_token: string }> {
    // Verificar si el correo ya existe
    const existingEmail = await this.usersService.findByEmail(registerDto.correo);
    if (existingEmail) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // Verificar si el nombre de usuario ya existe
    const existingUsername = await this.usersService.findByUsername(registerDto.nombreUsuario);
    if (existingUsername) {
      throw new ConflictException('El nombre de usuario ya está registrado');
    }

    // Validar edad (mayor de 13 años)
    // Calcula la edad exacta considerando mes y día
    const birthDate = new Date(registerDto.fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Ajustar edad si el cumpleaños no ha llegado este año
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 13) {
      throw new BadRequestException('Debe ser mayor de 13 años para registrarse');
    }

    // Validar contraseña con método privado
    if (!this.validatePassword(registerDto.contraseña)) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número');
    }

    // Crear usuario en MongoDB
    // UsersService se encarga de hashear la contraseña con bcrypt
    const userData = {
      ...registerDto,
      imagenPerfil: imagenPerfil || undefined,
    };

    const user = await this.usersService.create(userData);
    const userObj = (user as any).toObject();
    
    // Preparar payload del JWT
    const payload = { 
      correo: user.correo, 
      sub: (user as any)._id, // sub = subject (ID del usuario)
      perfil: userObj.perfil // 'usuario' o 'administrador'
    };
    
    // Agregar el campo id desde _id para el frontend
    const userResponse: any = {
      ...userObj,
      id: (user as any)._id.toString()
    };
    // Remover contraseña de la respuesta por seguridad
    delete userResponse.contraseña;
    
    return {
      user: userResponse,
      access_token: this.jwtService.sign(payload), // Genera token JWT firmado
    };
  }

  /**
   * Inicia sesión de un usuario con sus credenciales
   * 
   * Acepta nombre de usuario O correo electrónico + contraseña.
   * UsersService busca por ambos campos automáticamente.
   * 
   * Proceso:
   * 1. Busca usuario por nombre de usuario O correo (findByEmailOrUsername)
   * 2. Si no existe, lanza UnauthorizedException (no revelar cuál campo es incorrecto)
   * 3. Valida contraseña con bcrypt (UsersService.validatePassword)
   * 4. Si contraseña inválida, lanza UnauthorizedException
   * 5. Verifica que el usuario esté activo (activo === true)
   * 6. Si está desactivado, lanza UnauthorizedException con mensaje específico
   * 7. Genera token JWT con payload: { correo, sub: _id, perfil }
   * 8. Prepara respuesta con usuario (sin contraseña) + token
   * 
   * @param loginDto - Credenciales de login (usuario/correo + contraseña)
   * @returns Usuario encontrado (sin contraseña) + token JWT de acceso
   * @throws UnauthorizedException si credenciales inválidas o cuenta desactivada
   * 
   * Seguridad:
   * - No revela si el error es por usuario inexistente o contraseña incorrecta
   * - Mensaje genérico "Credenciales inválidas" para ambos casos
   * - Previene enumeración de usuarios válidos
   * 
   * Ejemplo de respuesta:
   * {
   *   user: { id: "...", nombre: "Juan", correo: "juan@example.com", ... },
   *   access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   * }
   */
  async login(loginDto: LoginDto): Promise<{ user: User; access_token: string }> {
    // Buscar usuario por nombre de usuario O correo
    const user = await this.usersService.findByEmailOrUsername(loginDto.usuario);
    
    if (!user) {
      // No revelar si el usuario existe o no (seguridad)
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Validar contraseña con bcrypt
    const isPasswordValid = await this.usersService.validatePassword(user, loginDto.contraseña);
    
    if (!isPasswordValid) {
      // Mismo mensaje genérico para cualquier error de credenciales
      throw new UnauthorizedException('Credenciales inválidas');
    }

    // Verificar si el usuario está activo
    const userObj = user.toObject();
    if (userObj.activo === false) {
      throw new UnauthorizedException('Su cuenta ha sido desactivada. Contacte al administrador.');
    }

    // Preparar payload del JWT
    const payload = { 
      correo: user.correo, 
      sub: (user as any)._id, // sub = subject (ID del usuario)
      perfil: userObj.perfil // 'usuario' o 'administrador'
    };
    
    // Remover la contraseña del objeto usuario para la respuesta
    const { contraseña, ...userWithoutPassword } = userObj;
    
    // Agregar el campo id desde _id para el frontend
    const userResponse: any = {
      ...userWithoutPassword,
      id: (userWithoutPassword as any)._id.toString()
    };
    
    return {
      user: userResponse as User,
      access_token: this.jwtService.sign(payload), // Genera token JWT firmado
    };
  }

  /**
   * Valida el formato de una contraseña
   * 
   * Requisitos de contraseña:
   * - Al menos 8 caracteres de longitud
   * - Al menos una letra mayúscula (A-Z)
   * - Al menos un número (0-9)
   * 
   * Usa expresiones regulares para validar cada requisito.
   * 
   * @param password - Contraseña a validar
   * @returns true si cumple todos los requisitos, false si no
   * 
   * Ejemplos:
   * - "Password1" -> true (8 caracteres, mayúscula P, número 1)
   * - "password1" -> false (sin mayúscula)
   * - "Password" -> false (sin número)
   * - "Pass1" -> false (menos de 8 caracteres)
   */
  private validatePassword(password: string): boolean {
    const hasUppercase = /[A-Z]/.test(password); // Regex para mayúsculas
    const hasNumber = /\d/.test(password); // Regex para dígitos
    const hasMinLength = password.length >= 8; // Longitud mínima
    
    return hasUppercase && hasNumber && hasMinLength; // Todos deben cumplirse
  }

  /**
   * Obtiene los datos completos de un usuario por su ID
   * 
   * Usado por el endpoint POST /auth/autorizar para validar sesiones.
   * JwtAuthGuard ya validó el token, este método obtiene datos actualizados de MongoDB.
   * 
   * Proceso:
   * 1. Busca usuario por ID en MongoDB (UsersService.findById)
   * 2. findById ya excluye la contraseña del resultado
   * 3. Si no existe, lanza UnauthorizedException
   * 4. Convierte el documento Mongoose a objeto plano
   * 5. Agrega campo 'id' desde '_id' para compatibilidad con frontend
   * 
   * @param userId - ID del usuario (extraído del payload del JWT)
   * @returns Datos completos del usuario sin contraseña
   * @throws UnauthorizedException si el usuario no existe
   * 
   * Nota: findById ya excluye el campo contraseña con .select('-contraseña')
   */
  async getUserData(userId: string): Promise<any> {
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    // findById ya excluye la contraseña y devuelve el objeto limpio
    // Convertir a objeto plano y agregar el campo id desde _id para el frontend
    const userObj = typeof (user as any).toObject === 'function' ? (user as any).toObject() : user;
    const userResponse: any = {
      ...userObj,
      id: userObj._id?.toString() || userId
    };
    
    return userResponse;
  }

  /**
   * Renueva el token JWT de un usuario
   * 
   * Los tokens expiran en 15 minutos. Este método genera uno nuevo
   * para mantener la sesión activa sin forzar re-login.
   * 
   * Proceso:
   * 1. Busca usuario por ID en MongoDB
   * 2. Si no existe, lanza UnauthorizedException
   * 3. Verifica que el usuario esté activo (activo === true)
   * 4. Si está desactivado, lanza UnauthorizedException
   * 5. Genera NUEVO token JWT con payload: { correo, sub: _id, perfil }
   * 6. Devuelve el nuevo token con nueva fecha de expiración
   * 
   * @param userId - ID del usuario (extraído del token actual por JwtAuthGuard)
   * @returns Nuevo token JWT con 15 minutos de expiración
   * @throws UnauthorizedException si usuario no existe o está desactivado
   * 
   * Nota: El token actual debe ser VÁLIDO para poder refrescarlo.
   * Si ya expiró, JwtAuthGuard rechazará el request con 401.
   * 
   * Ejemplo de respuesta:
   * {
   *   access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
   * }
   */
  async refreshToken(userId: string): Promise<{ access_token: string }> {
    const user = await this.usersService.findById(userId);
    
    if (!user) {
      throw new UnauthorizedException('Usuario no encontrado');
    }

    const userObj = typeof (user as any).toObject === 'function' ? (user as any).toObject() : user;
    
    // Verificar si el usuario está activo
    if (userObj.activo === false) {
      throw new UnauthorizedException('Su cuenta ha sido desactivada. Contacte al administrador.');
    }

    // Preparar payload del JWT
    const payload = { 
      correo: userObj.correo, 
      sub: userObj._id || userId, // sub = subject (ID del usuario)
      perfil: userObj.perfil // 'usuario' o 'administrador'
    };
    
    return {
      access_token: this.jwtService.sign(payload), // Genera NUEVO token JWT firmado
    };
  }
}