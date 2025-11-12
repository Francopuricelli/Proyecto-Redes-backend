import { Controller, Get, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { EstadisticasService } from './estadisticas.service';

@Controller('estadisticas')
export class EstadisticasController {
  constructor(private readonly estadisticasService: EstadisticasService) {}

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('publicaciones-por-usuario')
  async getPublicacionesPorUsuario() {
    return await this.estadisticasService.getPublicacionesPorUsuario();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('comentarios-en-el-tiempo')
  async getComentariosEnElTiempo() {
    return await this.estadisticasService.getComentariosEnElTiempo();
  }

  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get('comentarios-por-publicacion')
  async getComentariosPorPublicacion() {
    return await this.estadisticasService.getComentariosPorPublicacion();
  }
}
