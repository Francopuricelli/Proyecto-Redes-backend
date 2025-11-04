import { Controller, Post, Body, UseInterceptors, UploadedFile, ValidationPipe, HttpStatus, HttpCode } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly cloudinaryService: CloudinaryService
  ) {}

  @Post('registro')
  @UseInterceptors(FileInterceptor('imagenPerfil', {
    fileFilter: (req, file, cb) => {
      if (!file.originalname.match(/\.(jpg|jpeg|png)$/)) {
        return cb(new Error('Solo se permiten archivos JPG, JPEG y PNG'), false);
      }
      cb(null, true);
    },
    limits: {
      fileSize: 5 * 1024 * 1024, // 5MB
    },
  }))
  async register(
    @Body(ValidationPipe) registerDto: RegisterDto,
    @UploadedFile() file?: Express.Multer.File,
  ) {
    let imagenPerfil: string | undefined;
    
    if (file) {
      const result = await this.cloudinaryService.uploadImage(file, 'perfiles');
      imagenPerfil = result.secure_url;
    }
    
    return this.authService.register(registerDto, imagenPerfil);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  async login(@Body(ValidationPipe) loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }
}