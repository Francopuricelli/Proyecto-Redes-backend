import { 
  Controller, 
  Get, 
  Post,
  Delete,
  Patch, 
  Body, 
  Param,
  UseGuards, 
  Request,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AdminGuard } from '../common/guards/admin.guard';
import { UsersService } from './users.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';
import { RegisterDto } from '../auth/dto/register.dto';

/**
 * Controlador de usuarios.
 * Solo maneja las rutas HTTP y delega toda la lógica de negocio al UsersService.
 * Siguiendo el patrón de arquitectura NestJS:
 * - Controller = Capa HTTP (decoradores, guards, interceptors)
 * - Service = Capa de lógica de negocio
 */
@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  /**
   * GET /users/me
   * Obtiene el perfil del usuario autenticado.
   * Requiere token JWT válido.
   */
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return await this.usersService.findById(req.user.id);
  }

  /**
   * PATCH /users/me
   * Actualiza el perfil del usuario autenticado.
   * Permite subir imagen de perfil.
   * Requiere token JWT válido.
   */
  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @UseInterceptors(FileInterceptor('imagenPerfil', {
    fileFilter: (req, file, cb) => {
      // Solo permite archivos de imagen
      if (!file.originalname.match(/\.(jpg|jpeg|png|gif)$/)) {
        return cb(new Error('Solo se permiten archivos de imagen'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // Máximo 5MB
    }
  }))
  async updateProfile(
    @Body() updateData: any,
    @Request() req,
    @UploadedFile() file: Express.Multer.File
  ) {
    // Si se subió una imagen, subirla a Cloudinary primero
    if (file) {
      const result = await this.cloudinaryService.uploadImage(file, 'perfiles');
      updateData.imagenPerfil = result.secure_url;
    }
    return await this.usersService.update(req.user.id, updateData);
  }

  // ========== ENDPOINTS DE ADMINISTRACIÓN (SOLO ADMINISTRADORES) ==========

  /**
   * GET /users
   * Obtiene todos los usuarios del sistema.
   * Requiere ser administrador.
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Get()
  async getAllUsers() {
    return await this.usersService.findAll();
  }

  /**
   * POST /users
   * Crea un nuevo usuario desde el panel de administración.
   * Permite especificar el perfil (usuario o administrador).
   * Requiere ser administrador.
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post()
  async createUser(@Body() createUserDto: RegisterDto & { perfil?: string }) {
    // Validar que el usuario cumpla todos los requisitos
    await this.usersService.validateUserCreation(createUserDto);
    
    // Crear el usuario
    const user = await this.usersService.createUserAsAdmin(createUserDto);
    
    // Remover la contraseña del objeto de respuesta por seguridad
    const { contraseña, ...userWithoutPassword } = (user as any).toObject();
    return userWithoutPassword;
  }

  /**
   * DELETE /users/:id
   * Desactiva un usuario (no lo elimina, solo lo marca como inactivo).
   * Requiere ser administrador.
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Delete(':id')
  async deactivateUser(@Param('id') id: string) {
    return await this.usersService.deactivate(id);
  }

  /**
   * POST /users/:id/activar
   * Reactiva un usuario previamente desactivado.
   * Requiere ser administrador.
   */
  @UseGuards(JwtAuthGuard, AdminGuard)
  @Post(':id/activar')
  async activateUser(@Param('id') id: string) {
    return await this.usersService.activate(id);
  }
}
