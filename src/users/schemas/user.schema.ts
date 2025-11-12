import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type UserDocument = User & Document;

@Schema({ timestamps: true })
export class User {
  @Prop({ required: true })
  nombre: string;

  @Prop({ required: true })
  apellido: string;

  @Prop({ required: true, unique: true })
  correo: string;

  @Prop({ required: true, unique: true })
  nombreUsuario: string;

  @Prop({ required: true })
  contraseña: string;

  @Prop({ required: true })
  fechaNacimiento: Date;

  @Prop({ required: true, maxlength: 200 })
  descripcionBreve: string;

  @Prop({ default: null })
  imagenPerfil: string;

  @Prop({ default: 'usuario', enum: ['usuario', 'administrador'] })
  perfil: string;

  @Prop({ default: true })
  activo: boolean;

  @Prop({ default: Date.now })
  fechaRegistro: Date;
}

export const UserSchema = SchemaFactory.createForClass(User);