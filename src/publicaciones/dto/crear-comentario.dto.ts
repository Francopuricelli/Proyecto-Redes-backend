import { IsString, IsNotEmpty } from 'class-validator';

export class CrearComentarioDto {
  @IsNotEmpty()
  @IsString()
  comentario: string;
}