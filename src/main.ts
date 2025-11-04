import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);
  
  // Configurar validación global
  app.useGlobalPipes(new ValidationPipe());
  
  // Servir archivos estáticos
  app.useStaticAssets(join(__dirname, '..', 'uploads'), {
    prefix: '/uploads/',
  });
  
  // Configurar CORS para permitir conexiones desde el frontend
  app.enableCors({
    origin: 'http://localhost:4200',
    credentials: true,
  });

  await app.listen(process.env.PORT ?? 3000);
  console.log('Servidor ejecutándose en http://localhost:3000');
}
bootstrap();
