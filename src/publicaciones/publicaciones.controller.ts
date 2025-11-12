import { 
  Controller, 
  Get, 
  Post, 
  Body, 
  Patch, 
  Param, 
  Delete, 
  Put,
  UseGuards, 
  Request,
  UseInterceptors,
  UploadedFile,
  Query
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PublicacionesService } from './publicaciones.service';
import { CrearPublicacionDto } from './dto/crear-publicacion.dto';
import { ActualizarPublicacionDto } from './dto/actualizar-publicacion.dto';
import { CrearComentarioDto } from './dto/crear-comentario.dto';

@Controller('publicaciones')
export class PublicacionesController {
  constructor(
    private readonly publicacionesService: PublicacionesService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Post()
  @UseInterceptors(FileInterceptor('imagen', {
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Solo se permiten archivos de imagen'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    }
  }))
  async crear(
    @Body() crearPublicacionDto: CrearPublicacionDto, 
    @Request() req,
    @UploadedFile() file?: Express.Multer.File
  ) {
    return await this.publicacionesService.crear(crearPublicacionDto, req.user.id, file);
  }

  @Get()
  async obtenerTodas(
    @Query('ordenarPor') ordenarPor?: 'fecha' | 'likes',
    @Query('usuarioId') usuarioId?: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string
  ) {
    return await this.publicacionesService.obtenerTodas(ordenarPor, usuarioId, offset, limit);
  }

  @Get(':id')
  async obtenerPorId(@Param('id') id: string) {
    return await this.publicacionesService.obtenerPorId(id);
  }

  @Get('usuario/:usuarioId')
  async obtenerPorUsuario(@Param('usuarioId') usuarioId: string) {
    return await this.publicacionesService.obtenerPorUsuario(usuarioId);
  }

  @UseGuards(JwtAuthGuard)
  @Patch(':id')
  async actualizar(
    @Param('id') id: string, 
    @Body() actualizarPublicacionDto: ActualizarPublicacionDto,
    @Request() req
  ) {
    return await this.publicacionesService.actualizar(id, actualizarPublicacionDto, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id')
  async eliminar(@Param('id') id: string, @Request() req) {
    return await this.publicacionesService.eliminar(id, req.user.id, req.user.perfil);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/like')
  async darLike(@Param('id') id: string, @Request() req) {
    return await this.publicacionesService.darLike(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Delete(':id/like')
  async quitarLike(@Param('id') id: string, @Request() req) {
    return await this.publicacionesService.quitarLike(id, req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Post(':id/comentarios')
  async agregarComentario(
    @Param('id') id: string, 
    @Body() crearComentarioDto: CrearComentarioDto,
    @Request() req
  ) {
    return await this.publicacionesService.agregarComentario(id, crearComentarioDto, req.user.id);
  }

  @Get(':id/comentarios')
  async obtenerComentarios(
    @Param('id') id: string,
    @Query('offset') offset?: string,
    @Query('limit') limit?: string
  ) {
    return await this.publicacionesService.obtenerComentarios(id, offset, limit);
  }

  @UseGuards(JwtAuthGuard)
  @Put(':id/comentarios/:comentarioId')
  async editarComentario(
    @Param('id') publicacionId: string,
    @Param('comentarioId') comentarioId: string,
    @Body() editarComentarioDto: { texto: string },
    @Request() req
  ) {
    return await this.publicacionesService.editarComentario(
      publicacionId, 
      comentarioId, 
      editarComentarioDto.texto, 
      req.user.id
    );
  }
}
