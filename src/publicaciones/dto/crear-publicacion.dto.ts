import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class CrearPublicacionDto {
  @IsNotEmpty()
  @IsString()
  titulo: string;

  @IsNotEmpty()
  @IsString()
  contenido: string;

  @IsOptional()
  @IsString()
  imagen?: string;
}