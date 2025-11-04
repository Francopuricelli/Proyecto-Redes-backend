import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { User } from '../users/schemas/user.schema';

@Injectable()
export class AuthService {
  constructor(
    private usersService: UsersService,
    private jwtService: JwtService,
  ) {}

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
    const birthDate = new Date(registerDto.fechaNacimiento);
    const today = new Date();
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    
    if (age < 13) {
      throw new BadRequestException('Debe ser mayor de 13 años para registrarse');
    }

    // Validar contraseña
    if (!this.validatePassword(registerDto.contraseña)) {
      throw new BadRequestException('La contraseña debe tener al menos 8 caracteres, una mayúscula y un número');
    }

    // Crear usuario
    const userData = {
      ...registerDto,
      imagenPerfil: imagenPerfil || undefined,
    };

    const user = await this.usersService.create(userData);
    const payload = { correo: user.correo, sub: (user as any)._id };
    
    // Agregar el campo id desde _id para el frontend
    const userResponse: any = {
      ...(user as any).toObject(),
      id: (user as any)._id.toString()
    };
    // Remover contraseña
    delete userResponse.contraseña;
    
    return {
      user: userResponse,
      access_token: this.jwtService.sign(payload),
    };
  }

  async login(loginDto: LoginDto): Promise<{ user: User; access_token: string }> {
    const user = await this.usersService.findByEmailOrUsername(loginDto.usuario);
    
    if (!user) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const isPasswordValid = await this.usersService.validatePassword(user, loginDto.contraseña);
    
    if (!isPasswordValid) {
      throw new UnauthorizedException('Credenciales inválidas');
    }

    const payload = { correo: user.correo, sub: (user as any)._id };
    
    // Remover la contraseña del objeto usuario para la respuesta
    const { contraseña, ...userWithoutPassword } = user.toObject();
    
    // Agregar el campo id desde _id para el frontend
    const userResponse: any = {
      ...userWithoutPassword,
      id: (userWithoutPassword as any)._id.toString()
    };
    
    return {
      user: userResponse as User,
      access_token: this.jwtService.sign(payload),
    };
  }

  private validatePassword(password: string): boolean {
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasMinLength = password.length >= 8;
    
    return hasUppercase && hasNumber && hasMinLength;
  }
}