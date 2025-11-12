/**
 * Controlador de Autenticación
 * 
 * Maneja todos los endpoints relacionados con la autenticación de usuarios:
 * - Registro de nuevos usuarios con imagen de perfil opcional
 * - Login con credenciales (usuario/email + contraseña)
 * - Validación de tokens JWT
 * - Renovación de tokens JWT
 * 
 * Todos los endpoints devuelven tokens JWT con 15 minutos de expiración.
 * Las rutas POST /auth/autorizar y POST /auth/refrescar requieren autenticación con JwtAuthGuard.
 */
import { Controller, Post, Body, UseInterceptors, UploadedFile, ValidationPipe, HttpStatus, HttpCode, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(
    // AuthService contiene toda la lógica de negocio de autenticación
    private readonly authService: AuthService,
  ) {}

  /**
   * POST /auth/registro
   * 
   * Endpoint para registrar un nuevo usuario en la plataforma.
   * Acepta datos del usuario y opcionalmente una imagen de perfil.
   * 
   * FileInterceptor:
   * - Campo: 'imagenPerfil' (opcional)
   * - Formatos aceptados: JPG, JPEG, PNG
   * - Tamaño máximo: 5MB
   * - Si se proporciona imagen, se sube a Cloudinary automáticamente
   * 
   * Proceso:
   * 1. FileInterceptor valida formato y tamaño del archivo
   * 2. AuthService valida los datos del DTO (edad, email, contraseña, etc.)
   * 3. Si hay imagen, se sube a Cloudinary
   * 4. Se crea el usuario en MongoDB con contraseña hasheada
   * 5. Se devuelve token JWT + datos del usuario
   * 
   * @param body - Datos del usuario (nombre, email, contraseña, fechaNacimiento, etc.)
   * @param file - Archivo de imagen de perfil (opcional)
   * @returns Token JWT, usuario creado y fecha de expiración
   */
  @Post('registro')
  @UseInterceptors(FileInterceptor('imagenPerfil', {
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
        return cb(new Error('Solo se permiten archivos JPG, JPEG y PNG'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  async register(
    @Body() body: any,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    // Delega a AuthService para validar y construir el DTO
    const { dto, imagenPerfil } = await this.authService.validateAndBuildRegisterDto(body, file);
    // Delega a AuthService para crear el usuario y generar el token
    return this.authService.register(dto, imagenPerfil);
  }

  /**
   * POST /auth/login
   * 
   * Endpoint para iniciar sesión con credenciales.
   * Acepta nombre de usuario O email + contraseña.
   * 
   * ValidationPipe:
   * - Valida automáticamente el LoginDto usando class-validator
   * - Verifica que usuario y contraseña estén presentes
   * 
   * Proceso:
   * 1. ValidationPipe valida el DTO
   * 2. AuthService busca usuario por nombre de usuario O email
   * 3. AuthService verifica la contraseña con bcrypt
   * 4. Si las credenciales son válidas, genera token JWT
   * 5. Devuelve token + datos del usuario
   * 
   * @param loginDto - Credenciales de login (usuario/email + contraseña)
   * @returns Token JWT, usuario encontrado y fecha de expiración
   */
  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    // Delega a AuthService para validar credenciales y generar token
    return this.authService.login(loginDto);
  }

  /**
   * POST /auth/autorizar
   * 
   * Endpoint protegido que valida si el token JWT del usuario es válido.
   * Se usa en el frontend para verificar si el usuario tiene una sesión activa.
   * 
   * JwtAuthGuard:
   * - Extrae el token del header Authorization: Bearer <token>
   * - Valida que el token no haya expirado
   * - Decodifica el payload y extrae el user.id
   * - Si el token es inválido, lanza 401 Unauthorized
   * 
   * Proceso:
   * 1. JwtAuthGuard valida el token automáticamente
   * 2. Si es válido, extrae req.user del payload del JWT
   * 3. AuthService busca los datos actualizados del usuario en MongoDB
   * 4. Devuelve los datos completos del usuario (sin contraseña)
   * 
   * Usado en:
   * - AuthInterceptor del frontend para validar sesión en cada request
   * - Guards de Angular para proteger rutas
   * 
   * @param req - Request con req.user inyectado por JwtAuthGuard
   * @returns Datos completos del usuario autenticado
   */
  @Post('autorizar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async autorizar(@Request() req) {
    // Si llega aquí, el token es válido (JwtAuthGuard lo validó)
    return this.authService.getUserData(req.user.id);
  }

  /**
   * POST /auth/refrescar
   * 
   * Endpoint protegido para renovar el token JWT del usuario.
   * Los tokens expiran en 15 minutos, este endpoint permite obtener uno nuevo.
   * 
   * JwtAuthGuard:
   * - Valida que el token actual sea válido
   * - Si el token expiró, lanza 401 Unauthorized
   * - Extrae req.user del payload del JWT
   * 
   * Proceso:
   * 1. JwtAuthGuard valida el token actual
   * 2. Si es válido, extrae req.user.id
   * 3. AuthService genera un NUEVO token JWT con nueva fecha de expiración
   * 4. Devuelve el nuevo token + datos del usuario + nueva fecha de expiración
   * 
   * Usado en:
   * - Frontend para renovar tokens antes de que expiren
   * - Mantener sesiones activas sin forzar re-login
   * 
   * Nota: El token actual debe ser válido para poder refrescarlo.
   * Si ya expiró, el usuario debe hacer login nuevamente.
   * 
   * @param req - Request con req.user inyectado por JwtAuthGuard
   * @returns Nuevo token JWT, usuario y nueva fecha de expiración
   */
  @Post('refrescar')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  async refrescar(@Request() req) {
    // Si llega aquí, el token es válido (JwtAuthGuard lo validó)
    return this.authService.refreshToken(req.user.id);
  }
}