import { PartialType } from '@nestjs/mapped-types';
import { CrearPublicacionDto } from './crear-publicacion.dto';

export class ActualizarPublicacionDto extends PartialType(CrearPublicacionDto) {}