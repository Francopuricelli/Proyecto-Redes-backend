import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Configurar validación global
  app.useGlobalPipes(new ValidationPipe({
    transform: true, // Transforma los datos automáticamente
    whitelist: true, // Elimina propiedades que no están en el DTO
  }));
  
  // Servir archivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  // Configurar CORS para permitir conexiones desde el frontend
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        'http://localhost:4200',
        'https://proyecto-redes-frontend.vercel.app'
      ];
      
      // Permitir cualquier URL de Vercel (previews y producción)
      if (!origin || allowedOrigins.includes(origin) || origin.includes('.vercel.app')) {
        callback(null, true);
      } else {
        callback(new Error('Not allowed by CORS'));
      }
    },
    methods: ['GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'],
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log('Servidor ejecutándose en http://localhost:3000');
}
bootstrap();
