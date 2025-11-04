import { 
  Controller, 
  Get, 
  Patch, 
  Body, 
  UseGuards, 
  Request,
  UseInterceptors,
  UploadedFile
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('users')
export class UsersController {
  constructor(
    private readonly usersService: UsersService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Request() req) {
    return await this.usersService.findById(req.user.id);
  }

  @UseGuards(JwtAuthGuard)
  @Patch('me')
  @UseInterceptors(FileInterceptor('imagenPerfil', {
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
  async updateProfile(
    @Body() updateData: any,
    @Request() req,
    @UploadedFile() file: Express.Multer.File
  ) {
    if (file) {
      const result = await this.cloudinaryService.uploadImage(file, 'perfiles');
      updateData.imagenPerfil = result.secure_url;
    }
    return await this.usersService.update(req.user.id, updateData);
  }
}
