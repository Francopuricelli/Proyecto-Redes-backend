import { Injectable, ConflictException, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from './schemas/user.schema';
import { RegisterDto } from '../auth/dto/register.dto';
import * as bcrypt from 'bcrypt';

/**
 * Servicio que maneja toda la lógica de negocio relacionada con usuarios.
 * Este servicio contiene métodos para crear, buscar, actualizar y validar usuarios.
 * Siguiendo el patrón de arquitectura NestJS, toda la lógica de negocio está aquí,
 * mientras que el controlador solo maneja HTTP.
 */
@Injectable()
export class UsersService {
  constructor(
    // Inyecta el modelo de Mongoose para interactuar con la base de datos
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  /**
   * Crea un nuevo usuario en la base de datos.
   * @param registerDto - Datos del usuario a registrar
   * @returns El usuario creado
   */
  async create(registerDto: RegisterDto): Promise<User> {
    // Encripta la contraseña usando bcrypt con 10 rondas de salt
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(registerDto.contraseña, saltRounds);

    // Crea una nueva instancia del modelo con la contraseña encriptada
    const createdUser = new this.userModel({
      ...registerDto,
      contraseña: hashedPassword,
      fechaNacimiento: new Date(registerDto.fechaNacimiento),
    });

    return createdUser.save();
  }

  /**
   * Busca un usuario por su ID, excluyendo la contraseña del resultado.
   * @param id - ID del usuario
   * @returns Usuario encontrado o null
   */
  async findOne(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('-contraseña').exec();
  }

  /**
   * Busca un usuario por su ID (alias de findOne).
   * @param id - ID del usuario
   * @returns Usuario encontrado o null
   */
  async findById(id: string): Promise<User | null> {
    return this.userModel.findById(id).select('-contraseña').exec();
  }

  /**
   * Busca un usuario por su correo electrónico.
   * INCLUYE la contraseña (necesaria para validación de login).
   * @param correo - Correo electrónico del usuario
   * @returns Usuario encontrado o null
   */
  async findByEmail(correo: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ correo }).exec();
  }

  /**
   * Busca un usuario por su nombre de usuario.
   * @param nombreUsuario - Nombre de usuario
   * @returns Usuario encontrado o null
   */
  async findByUsername(nombreUsuario: string): Promise<UserDocument | null> {
    return this.userModel.findOne({ nombreUsuario }).exec();
  }

  /**
   * Busca un usuario por correo O nombre de usuario.
   * Útil para el login donde el usuario puede usar cualquiera de los dos.
   * @param usuario - Correo o nombre de usuario
   * @returns Usuario encontrado o null
   */
  async findByEmailOrUsername(usuario: string): Promise<UserDocument | null> {
    return this.userModel.findOne({
      $or: [
        { correo: usuario },
        { nombreUsuario: usuario }
      ]
    }).exec();
  }

  /**
   * Valida si una contraseña coincide con el hash almacenado.
   * @param user - Documento del usuario con contraseña hasheada
   * @param password - Contraseña en texto plano a validar
   * @returns true si la contraseña es correcta, false si no
   */
  async validatePassword(user: UserDocument, password: string): Promise<boolean> {
    return bcrypt.compare(password, user.contraseña);
  }

  /**
   * Actualiza los datos de un usuario.
   * @param id - ID del usuario a actualizar
   * @param updateData - Datos parciales a actualizar
   * @returns Usuario actualizado sin contraseña
   */
  async update(id: string, updateData: Partial<User>): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(id, updateData, { new: true }).select('-contraseña').exec();
  }

  // ========== MÉTODOS PARA ADMINISTRACIÓN DE USUARIOS ==========

  /**
   * Obtiene todos los usuarios del sistema (solo admin).
   * @returns Lista de todos los usuarios sin contraseñas
   */
  async findAll(): Promise<User[]> {
    return this.userModel.find().select('-contraseña').exec();
  }

  /**
   * Valida que un nuevo usuario cumpla con todos los requisitos.
   * Lanza excepciones si hay algún problema de validación.
   * @param createUserDto - Datos del usuario a validar
   * @throws ConflictException si el correo o nombre de usuario ya existe
   * @throws BadRequestException si la edad es menor a 13 o la contraseña es débil
   */
  async validateUserCreation(createUserDto: RegisterDto & { perfil?: string }): Promise<void> {
    // Validar si el correo ya existe en la base de datos
    const existingEmail = await this.findByEmail(createUserDto.correo);
    if (existingEmail) {
      throw new ConflictException('El correo electrónico ya está registrado');
    }

    // Validar si el nombre de usuario ya existe en la base de datos
    const existingUsername = await this.findByUsername(createUserDto.nombreUsuario);
    if (existingUsername) {
      throw new ConflictException('El nombre de usuario ya está registrado');
    }

    // Validar edad (debe ser mayor de 13 años según políticas de redes sociales)
    const birthDate = new Date(createUserDto.fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    // Ajustar edad si aún no ha cumplido años este año
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 13) {
      throw new BadRequestException('El usuario debe ser mayor de 13 años');
    }

    // Validar que la contraseña cumpla con los requisitos de seguridad
    const hasUppercase = /[A-Z]/.test(createUserDto.contraseña); // Al menos una mayúscula
    const hasNumber = /\d/.test(createUserDto.contraseña); // Al menos un número
    const hasMinLength = createUserDto.contraseña.length >= 8; // Mínimo 8 caracteres
    
    if (!(hasUppercase && hasNumber && hasMinLength)) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número');
    }
  }

  /**
   * Crea un usuario desde el panel de administración.
   * Permite especificar el perfil (usuario o administrador).
   * @param userData - Datos del usuario incluyendo perfil opcional
   * @returns Usuario creado
   */
  async createUserAsAdmin(userData: RegisterDto & { perfil?: string }): Promise<User> {
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(userData.contraseña, saltRounds);

    const createdUser = new this.userModel({
      ...userData,
      contraseña: hashedPassword,
      fechaNacimiento: new Date(userData.fechaNacimiento),
      perfil: userData.perfil || 'usuario', // Por defecto es 'usuario'
      activo: true, // Los usuarios creados por admin están activos por defecto
    });

    return createdUser.save();
  }

  /**
   * Desactiva un usuario (soft delete).
   * El usuario no se elimina, solo se marca como inactivo.
   * @param id - ID del usuario a desactivar
   * @returns Usuario desactivado
   */
  async deactivate(id: string): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(id, { activo: false }, { new: true }).select('-contraseña').exec();
  }

  /**
   * Reactiva un usuario previamente desactivado.
   * @param id - ID del usuario a activar
   * @returns Usuario activado
   */
  async activate(id: string): Promise<User | null> {
    return this.userModel.findByIdAndUpdate(id, { activo: true }, { new: true }).select('-contraseña').exec();
  }
}
  