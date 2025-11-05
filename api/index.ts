import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from '../src/app.module';
import { ExpressAdapter } from '@nestjs/platform-express';
import express from 'express';

const expressApp = express();
let cachedApp;

async function bootstrap() {
  if (!cachedApp) {
    const app = await NestFactory.create(
      AppModule,
      new ExpressAdapter(expressApp),
      { logger: ['error', 'warn', 'log'] }
    );
    
    app.useGlobalPipes(new ValidationPipe());
    
    app.enableCors({
      origin: ['http://localhost:4200', 'https://proyecto-redes-frontend.vercel.app'],
      methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
      credentials: true,
    });

    await app.init();
    cachedApp = app;
  }
  return cachedApp;
}

export default async (req, res) => {
  await bootstrap();
  expressApp(req, res);
};
