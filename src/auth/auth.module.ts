/**
 * Módulo de Autenticación
 * 
 * Configura todo el sistema de autenticación JWT de la aplicación.
 * Importa los módulos necesarios y configura el JwtModule con opciones.
 * 
 * Responsabilidades:
 * - Configuración de JWT con secret y tiempo de expiración
 * - Registro de estrategia JWT para validación de tokens
 * - Integración con UsersModule para operaciones de usuario
 * - Integración con CloudinaryModule para subida de imágenes
 * - Exporta AuthService para uso en otros módulos
 * 
 * Imports:
 * - UsersModule: Operaciones CRUD de usuarios
 * - PassportModule: Framework de autenticación de NestJS
 * - CloudinaryModule: Subida de imágenes de perfil
 * - JwtModule: Generación y validación de tokens JWT
 * 
 * Configuración JWT:
 * - Secret: Obtenido de variable de entorno JWT_SECRET (o 'defaultSecret' para desarrollo)
 * - Expiración: 15 minutos (signOptions.expiresIn)
 * - registerAsync: Configuración asíncrona para acceder a ConfigService
 * 
 * Providers:
 * - AuthService: Lógica de negocio de autenticación
 * - JwtStrategy: Estrategia de Passport para validar tokens JWT
 * 
 * Controllers:
 * - AuthController: Endpoints de registro, login, autorización, renovación
 * 
 * Exports:
 * - AuthService: Otros módulos pueden usar AuthService si lo importan
 * 
 * Flujo de autenticación:
 * 1. Usuario hace POST /auth/registro o POST /auth/login
 * 2. AuthController delega a AuthService
 * 3. AuthService valida credenciales y genera token con JwtModule
 * 4. Token se devuelve al cliente
 * 5. Cliente envía token en header Authorization: Bearer <token>
 * 6. JwtAuthGuard usa JwtStrategy para validar el token
 * 7. Si es válido, JwtStrategy extrae payload y lo inyecta en req.user
 */
import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { UsersModule } from '../users/users.module';
import { JwtStrategy } from './jwt.strategy';
import { CloudinaryModule } from '../cloudinary/cloudinary.module';

@Module({
  imports: [
    UsersModule, // Importa UsersModule para acceder a UsersService
    PassportModule, // Framework de autenticación de NestJS
    CloudinaryModule, // Para subida de imágenes de perfil
    
    // Configuración de JwtModule de forma asíncrona
    // registerAsync permite acceder a ConfigService para leer variables de entorno
    JwtModule.registerAsync({
      imports: [ConfigModule], // Importa ConfigModule para acceder a variables de entorno
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET') || 'defaultSecret', // Clave secreta para firmar tokens
        signOptions: { expiresIn: '15m' }, // Los tokens expiran en 15 minutos
      }),
      inject: [ConfigService], // Inyecta ConfigService en la factory function
    }),
  ],
  controllers: [AuthController], // Registra AuthController
  providers: [AuthService, JwtStrategy], // Registra AuthService y JwtStrategy como providers
  exports: [AuthService], // Exporta AuthService para que otros módulos puedan usarlo
})
export class AuthModule {}