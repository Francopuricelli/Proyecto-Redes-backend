import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty()
  @IsString()
  usuario: string; // puede ser email o nombreUsuario

  @IsNotEmpty()
  @IsString()
  contraseña: string;
}