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

  async crear(crearPublicacionDto: CrearPublicacionDto, autorId: string, file?: Express.Multer.File): Promise<Publicacion> {
    // Subir imagen a Cloudinary si se proporciona
    if (file) {
      const cloudinary = require('cloudinary').v2;
      const streamifier = require('streamifier');
      
      const uploadPromise = new Promise<any>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { folder: 'publicaciones' },
          (error, result) => {
            if (error) reject(error);
            else resolve(result);
          }
        );
        streamifier.createReadStream(file.buffer).pipe(stream);
      });
      
      const result = await uploadPromise;
      crearPublicacionDto.imagen = result.secure_url;
    }
    
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
    ordenarPor?: 'fecha' | 'likes',
    usuarioId?: string,
    offset?: string,
    limit?: string
  ): Promise<Publicacion[]> {
    const filtro: any = { eliminada: false };
    
    // Parsear parámetros
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const limitNum = limit ? parseInt(limit, 10) : 10;
    const ordenamiento = ordenarPor || 'fecha';
    
    // Filtrar por usuario si se proporciona
    if (usuarioId) {
      filtro.autor = new Types.ObjectId(usuarioId);
    }

    // Determinar el ordenamiento
    const sort: any = ordenamiento === 'likes' 
      ? { 'likes': -1, 'fechaCreacion': -1 }  // Ordenar por cantidad de likes, luego por fecha
      : { fechaCreacion: -1 }; // Ordenar solo por fecha

    const publicaciones = await this.publicacionModel
      .find(filtro)
      .populate('autor', 'nombre apellido email nombreUsuario imagenPerfil')
      .populate('comentarios.autor', 'nombre apellido nombreUsuario')
      .sort(sort)
      .skip(offsetNum)
      .limit(limitNum)
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

  async obtenerPorId(id: string): Promise<any> {
    const publicacion = await this.publicacionModel
      .findById(id)
      .populate('autor', 'nombre apellido email nombreUsuario imagenPerfil')
      .populate('comentarios.autor', 'nombre apellido nombreUsuario imagenPerfil')
      .exec();
    
    if (!publicacion || publicacion.eliminada) {
      throw new NotFoundException('Publicación no encontrada');
    }
    
    // Convertir a JSON con el mismo formato que obtenerTodas
    const publicacionObj: any = publicacion.toJSON();
    
    // Agregar conteo de likes
    publicacionObj.cantidadLikes = publicacionObj.likes ? publicacionObj.likes.length : 0;
    
    // Asegurar que tenga el campo fecha
    publicacionObj.fecha = publicacionObj.fechaCreacion || publicacionObj.createdAt;
    
    // Asegurar que el autor tenga el campo 'id'
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
  }

  async obtenerPorUsuario(usuarioId: string): Promise<Publicacion[]> {
    return await this.publicacionModel
      .find({ autor: new Types.ObjectId(usuarioId), eliminada: false })
      .populate('autor', 'nombre apellido email nombreUsuario imagenPerfil')
      .populate('comentarios.autor', 'nombre apellido nombreUsuario imagenPerfil')
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
      .populate('autor', 'nombre apellido email nombreUsuario imagenPerfil')
      .populate('comentarios.autor', 'nombre apellido nombreUsuario imagenPerfil')
      .exec();
  }

  async eliminar(id: string, usuarioId: string, perfil?: string): Promise<{ mensaje: string }> {
    const publicacion = await this.publicacionModel.findById(id);
    
    if (!publicacion || publicacion.eliminada) {
      throw new NotFoundException('Publicación no encontrada');
    }
    
    // Permitir eliminación si es el autor o si es administrador
    if (publicacion.autor.toString() !== usuarioId && perfil !== 'administrador') {
      throw new ForbiddenException('No tienes permisos para eliminar esta publicación');
    }

    await this.publicacionModel.findByIdAndUpdate(id, { eliminada: true });
    
    return { mensaje: 'Publicación eliminada correctamente' };
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
      fecha: new Date(),
      modificado: false
    } as any);

    await publicacion.save();
    
    return await this.publicacionModel
      .findById(id)
      .populate('autor', 'nombre apellido email nombreUsuario imagenPerfil')
      .populate('comentarios.autor', 'nombre apellido nombreUsuario imagenPerfil')
      .exec();
  }

  async obtenerComentarios(publicacionId: string, offset?: string, limit?: string): Promise<any> {
    const publicacion = await this.publicacionModel
      .findById(publicacionId)
      .populate('comentarios.autor', 'nombre apellido nombreUsuario imagenPerfil')
      .exec();
    
    if (!publicacion || publicacion.eliminada) {
      throw new NotFoundException('Publicación no encontrada');
    }

    // Parsear parámetros de paginación
    const offsetNum = offset ? parseInt(offset, 10) : 0;
    const limitNum = limit ? parseInt(limit, 10) : 10;

    // Ordenar por fecha descendente (más reciente primero)
    const comentariosOrdenados = [...publicacion.comentarios].sort((a: any, b: any) => {
      return new Date(b.fecha).getTime() - new Date(a.fecha).getTime();
    });

    // Aplicar paginación
    const comentariosPaginados = comentariosOrdenados.slice(offsetNum, offsetNum + limitNum);

    // Formatear respuesta
    const comentariosFormateados = comentariosPaginados.map((comentario: any) => {
      const comentarioObj = {
        id: comentario._id.toString(),
        comentario: comentario.comentario,
        fecha: comentario.fecha,
        modificado: comentario.modificado || false,
        autor: comentario.autor ? {
          id: comentario.autor._id.toString(),
          nombre: comentario.autor.nombre,
          apellido: comentario.autor.apellido,
          nombreUsuario: comentario.autor.nombreUsuario,
          imagenPerfil: comentario.autor.imagenPerfil
        } : null
      };
      return comentarioObj;
    });

    return {
      comentarios: comentariosFormateados,
      total: publicacion.comentarios.length,
      offset: offsetNum,
      limit: limitNum
    };
  }

  async editarComentario(publicacionId: string, comentarioId: string, nuevoTexto: string, usuarioId: string): Promise<any> {
    const publicacion = await this.publicacionModel.findById(publicacionId);
    
    if (!publicacion || publicacion.eliminada) {
      throw new NotFoundException('Publicación no encontrada');
    }

    // Buscar el comentario
    const comentario = publicacion.comentarios.find((c: any) => c._id.toString() === comentarioId);
    
    if (!comentario) {
      throw new NotFoundException('Comentario no encontrado');
    }

    // Verificar que el usuario sea el autor del comentario
    if (comentario.autor.toString() !== usuarioId) {
      throw new ForbiddenException('No tienes permisos para editar este comentario');
    }

    // Actualizar el comentario usando findIndex
    const comentarioIndex = publicacion.comentarios.findIndex((c: any) => c._id.toString() === comentarioId);
    if (comentarioIndex !== -1) {
      (publicacion.comentarios[comentarioIndex] as any).comentario = nuevoTexto;
      (publicacion.comentarios[comentarioIndex] as any).modificado = true;
    }

    await publicacion.save();

    // Devolver el comentario actualizado populado
    const publicacionActualizada = await this.publicacionModel
      .findById(publicacionId)
      .populate('comentarios.autor', 'nombre apellido nombreUsuario imagenPerfil')
      .exec();

    const comentarioActualizadoPopulado = publicacionActualizada?.comentarios.find((c: any) => c._id.toString() === comentarioId);

    if (comentarioActualizadoPopulado) {
      const autor: any = comentarioActualizadoPopulado.autor;
      return {
        id: (comentarioActualizadoPopulado as any)._id.toString(),
        comentario: (comentarioActualizadoPopulado as any).comentario,
        fecha: (comentarioActualizadoPopulado as any).fecha,
        modificado: (comentarioActualizadoPopulado as any).modificado,
        autor: autor ? {
          id: autor._id.toString(),
          nombre: autor.nombre,
          apellido: autor.apellido,
          nombreUsuario: autor.nombreUsuario,
          imagenPerfil: autor.imagenPerfil
        } : null
      };
    }

    return null;
  }
}
