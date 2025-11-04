import { IsEmail, IsString, MinLength, MaxLength, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  nombre: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  apellido: string;

  @IsEmail()
  correo: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3)
  nombreUsuario: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8)
  contraseña: string;

  @IsNotEmpty()
  @IsDateString()
  fechaNacimiento: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200)
  descripcionBreve: string;

  @IsOptional()
  @IsString()
  imagenPerfil?: string;
}