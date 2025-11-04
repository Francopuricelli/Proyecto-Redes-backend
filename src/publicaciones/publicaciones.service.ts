import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Publicacion, PublicacionDocument } from './schemas/publicacion.schema';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { ActualizarPublicacionDto } from './dto/actualizar-publicacion.dto';
import { CrearComentarioDto } from './dto/crear-comentario.dto';

@Injectable()
export class PublicacionesService {
  constructor(
    @InjectModel(Publicacion.name) private publicacionModel: Model<PublicacionDocument>
  ) {}

  async crear(crearPublicacionDto: CrearPublicacionDto, autorId: string): Promise<Publicacion> {
    const publicacion = new this.publicacionModel({
      ...crearPublicacionDto,
      autor: new Types.ObjectId(autorId)
    });
    
    const publicacionGuardada = await publicacion.save();
    
    // Populate autor para devolver objeto completo
    await publicacionGuardada.populate('autor', 'nombre apellido email nombreUsuario imagenPerfil');
    
    // Convertir a JSON - la imagen ya viene con URL completa de Cloudinary
    const publicacionObj: any = publicacionGuardada.toJSON();
    // Asegurar que tenga el campo fecha (alias de fechaCreacion)
    publicacionObj.fecha = publicacionObj.fechaCreacion || publicacionObj.createdAt;
    publicacionObj.cantidadLikes = 0;
    
    // Asegurar que el autor tenga el campo 'id' además de '_id'
    if (publicacionObj.autor && publicacionObj.autor._id) {
      publicacionObj.autor.id = publicacionObj.autor._id.toString();
    }
    
    return publicacionObj;
  }

  async obtenerTodas(
    ordenarPor: 'fecha' | 'likes' = 'fecha',
    usuarioId?: string,
    offset: number = 0,
    limit: number = 10
  ): Promise<Publicacion[]> {
    const filtro: any = { eliminada: false };
    
    // Filtrar por usuario si se proporciona
    if (usuarioId) {
      filtro.autor = new Types.ObjectId(usuarioId);
    }

    // Determinar el ordenamiento
    const ordenamiento: any = ordenarPor === 'likes' 
      ? { 'likes': -1, 'fechaCreacion': -1 }  // Ordenar por cantidad de likes, luego por fecha
      : { fechaCreacion: -1 }; // Ordenar solo por fecha

    const publicaciones = await this.publicacionModel
      .find(filtro)
      .populate('autor', 'nombre apellido email nombreUsuario imagenPerfil')
      .populate('comentarios.autor', 'nombre apellido nombreUsuario')
      .sort(ordenamiento)
      .skip(offset)
      .limit(limit)
      .exec();

    // Convertir a JSON - la imagen ya viene con URL completa de Cloudinary
    return publicaciones.map(pub => {
      const publicacionObj: any = pub.toJSON();
      // Agregar conteo de likes para facilitar el ordenamiento en frontend
      publicacionObj.cantidadLikes = publicacionObj.likes ? publicacionObj.likes.length : 0;
      // Asegurar que tenga el campo fecha (alias de fechaCreacion)
      publicacionObj.fecha = publicacionObj.fechaCreacion || publicacionObj.createdAt;
      
      // Asegurar que el autor tenga el campo 'id' además de '_id'
      if (publicacionObj.autor && publicacionObj.autor._id) {
        publicacionObj.autor.id = publicacionObj.autor._id.toString();
      }
      
      // Asegurar que los autores de comentarios también tengan 'id'
      if (publicacionObj.comentarios && publicacionObj.comentarios.length > 0) {
        publicacionObj.comentarios = publicacionObj.comentarios.map((comentario: any) => {
          if (comentario.autor && comentario.autor._id) {
            comentario.autor.id = comentario.autor._id.toString();
          }
          return comentario;
        });
      }
      
      return publicacionObj;
    });
  }

  async obtenerPorId(id: string): Promise<PublicacionDocument> {
    const publicacion = await this.publicacionModel
      .findById(id)
      .populate('autor', 'nombre email avatar')
      .populate('comentarios.autor', 'nombre email avatar')
      .exec();
    
    if (!publicacion || publicacion.eliminada) {
      throw new NotFoundException('Publicación no encontrada');
    }
    
    return publicacion;
  }

  async obtenerPorUsuario(usuarioId: string): Promise<Publicacion[]> {
    return await this.publicacionModel
      .find({ autor: new Types.ObjectId(usuarioId), eliminada: false })
      .populate('autor', 'nombre email avatar')
      .populate('comentarios.autor', 'nombre email avatar')
      .sort({ fechaCreacion: -1 })
      .exec();
  }

  async actualizar(id: string, actualizarPublicacionDto: ActualizarPublicacionDto, usuarioId: string): Promise<PublicacionDocument | null> {
    const publicacion = await this.publicacionModel.findById(id);
    
    if (!publicacion || publicacion.eliminada) {
      throw new NotFoundException('Publicación no encontrada');
    }
    
    if (publicacion.autor.toString() !== usuarioId) {
      throw new ForbiddenException('No tienes permisos para actualizar esta publicación');
    }

    return await this.publicacionModel
      .findByIdAndUpdate(id, actualizarPublicacionDto, { new: true })
      .populate('autor', 'nombre email avatar')
      .populate('comentarios.autor', 'nombre email avatar')
      .exec();
  }

  async eliminar(id: string, usuarioId: string): Promise<void> {
    const publicacion = await this.publicacionModel.findById(id);
    
    if (!publicacion || publicacion.eliminada) {
      throw new NotFoundException('Publicación no encontrada');
    }
    
    if (publicacion.autor.toString() !== usuarioId) {
      throw new ForbiddenException('No tienes permisos para eliminar esta publicación');
    }

    await this.publicacionModel.findByIdAndUpdate(id, { eliminada: true });
  }

  async darLike(id: string, usuarioId: string): Promise<PublicacionDocument | null> {
    const publicacion = await this.publicacionModel.findById(id);
    
    if (!publicacion || publicacion.eliminada) {
      throw new NotFoundException('Publicación no encontrada');
    }

    const yaLeDioLike = publicacion.likes.some(like => like.toString() === usuarioId);

    if (yaLeDioLike) {
      throw new ForbiddenException('Ya le diste like a esta publicación');
    }

    // Dar like usando findByIdAndUpdate para asegurar que se guarde correctamente
    const publicacionActualizada = await this.publicacionModel
      .findByIdAndUpdate(
        id,
        { $addToSet: { likes: new Types.ObjectId(usuarioId) } },
        { new: true }
      )
      .populate('autor', 'nombre apellido email nombreUsuario imagenPerfil')
      .populate('comentarios.autor', 'nombre apellido nombreUsuario')
      .exec();
    
    // Asegurar que el autor tenga el campo 'id'
    const publicacionObj: any = publicacionActualizada?.toJSON();
    if (publicacionObj && publicacionObj.autor && publicacionObj.autor._id) {
      publicacionObj.autor.id = publicacionObj.autor._id.toString();
    }
    
    return publicacionObj;
  }

  async quitarLike(id: string, usuarioId: string): Promise<PublicacionDocument | null> {
    const publicacion = await this.publicacionModel.findById(id);
    
    if (!publicacion || publicacion.eliminada) {
      throw new NotFoundException('Publicación no encontrada');
    }

    const yaLeDioLike = publicacion.likes.some(like => like.toString() === usuarioId);

    if (!yaLeDioLike) {
      throw new ForbiddenException('No le has dado like a esta publicación');
    }

    // Quitar like usando findByIdAndUpdate
    const publicacionActualizada = await this.publicacionModel
      .findByIdAndUpdate(
        id,
        { $pull: { likes: new Types.ObjectId(usuarioId) } },
        { new: true }
      )
      .populate('autor', 'nombre apellido email nombreUsuario imagenPerfil')
      .populate('comentarios.autor', 'nombre apellido nombreUsuario')
      .exec();
    
    // Asegurar que el autor tenga el campo 'id'
    const publicacionObj: any = publicacionActualizada?.toJSON();
    if (publicacionObj && publicacionObj.autor && publicacionObj.autor._id) {
      publicacionObj.autor.id = publicacionObj.autor._id.toString();
    }
    
    return publicacionObj;
  }

  async agregarComentario(id: string, crearComentarioDto: CrearComentarioDto, usuarioId: string): Promise<PublicacionDocument | null> {
    const publicacion = await this.publicacionModel.findById(id);
    
    if (!publicacion || publicacion.eliminada) {
      throw new NotFoundException('Publicación no encontrada');
    }

    publicacion.comentarios.push({
      comentario: crearComentarioDto.comentario,
      autor: usuarioId as any,
      fecha: new Date()
    });

    await publicacion.save();
    
    return await this.publicacionModel
      .findById(id)
      .populate('autor', 'nombre email avatar')
      .populate('comentarios.autor', 'nombre email avatar')
      .exec();
  }
}
