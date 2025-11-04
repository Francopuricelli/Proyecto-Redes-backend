import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Schema as MongooseSchema } from 'mongoose';

export type PublicacionDocument = Publicacion & Document;

@Schema({ timestamps: true })
export class Publicacion {
  @Prop({ required: true })
  titulo: string;

  @Prop({ required: true })
  contenido: string;

  @Prop({ default: null })
  imagen: string;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  autor: MongooseSchema.Types.ObjectId;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'User' }], default: [] })
  likes: MongooseSchema.Types.ObjectId[];

  @Prop({
    type: [{
      comentario: { type: String, required: true },
      autor: { type: MongooseSchema.Types.ObjectId, ref: 'User', required: true },
      fecha: { type: Date, default: Date.now }
    }],
    default: []
  })
  comentarios: {
    comentario: string;
    autor: MongooseSchema.Types.ObjectId;
    fecha: Date;
  }[];

  @Prop({ default: Date.now })
  fechaCreacion: Date;

  @Prop({ default: false })
  eliminada: boolean;
}

export const PublicacionSchema = SchemaFactory.createForClass(Publicacion);

// Agregar transformación para devolver id en lugar de _id
PublicacionSchema.set('toJSON', {
  virtuals: true,
  versionKey: false,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});

PublicacionSchema.set('toObject', {
  virtuals: true,
  versionKey: false,
  transform: function (doc: any, ret: any) {
    ret.id = ret._id.toString();
    delete ret._id;
    return ret;
  },
});