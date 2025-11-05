import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';

let app;

async function bootstrap() {
  if (!app) {
    app = await NestFactory.create(AppModule);
    
    // Configurar validación global
    app.useGlobalPipes(new ValidationPipe());
    
    // Configurar CORS
    app.enableCors({
      origin: ['http://localhost:4200', 'https://proyecto-redes-frontend.vercel.app'],
      methods: ['GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS'],
      credentials: true,
    });

    await app.init();
  }
  return app;
}

export default async (req, res) => {
  const nestApp = await bootstrap();
  return nestApp.getHttpAdapter().getInstance()(req, res);
};
