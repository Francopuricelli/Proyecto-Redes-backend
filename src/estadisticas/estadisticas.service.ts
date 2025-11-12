import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Publicacion, PublicacionDocument } from '../publicaciones/schemas/publicacion.schema';

@Injectable()
export class EstadisticasService {
  constructor(
    @InjectModel(Publicacion.name) private publicacionModel: Model<PublicacionDocument>,
  ) {}

  async getPublicacionesPorUsuario() {
    const resultado = await this.publicacionModel.aggregate([
      {
        $group: {
          _id: '$autor',
          totalPublicaciones: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'usuario'
        }
      },
      {
        $unwind: '$usuario'
      },
      {
        $project: {
          _id: 0,
          nombreUsuario: '$usuario.nombreUsuario',
          nombre: { $concat: ['$usuario.nombre', ' ', '$usuario.apellido'] },
          totalPublicaciones: 1
        }
      },
      {
        $sort: { totalPublicaciones: -1 }
      }
    ]);

    return resultado;
  }

  async getComentariosEnElTiempo() {
    const resultado = await this.publicacionModel.aggregate([
      {
        $unwind: '$comentarios'
      },
      {
        $group: {
          _id: {
            año: { $year: '$comentarios.fecha' },
            mes: { $month: '$comentarios.fecha' },
            dia: { $dayOfMonth: '$comentarios.fecha' }
          },
          totalComentarios: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          fecha: {
            $dateFromParts: {
              year: '$_id.año',
              month: '$_id.mes',
              day: '$_id.dia'
            }
          },
          totalComentarios: 1
        }
      },
      {
        $sort: { fecha: 1 }
      }
    ]);

    return resultado;
  }

  async getComentariosPorPublicacion() {
    const resultado = await this.publicacionModel.aggregate([
      {
        $project: {
          _id: 1,
          contenido: 1,
          totalComentarios: { $size: { $ifNull: ['$comentarios', []] } },
          autor: 1
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: 'autor',
          foreignField: '_id',
          as: 'autorInfo'
        }
      },
      {
        $unwind: '$autorInfo'
      },
      {
        $project: {
          _id: 1,
          contenido: { $substr: ['$contenido', 0, 50] },
          totalComentarios: 1,
          nombreUsuario: '$autorInfo.nombreUsuario'
        }
      },
      {
        $sort: { totalComentarios: -1 }
      },
      {
        $limit: 20
      }
    ]);

    return resultado;
  }
}
