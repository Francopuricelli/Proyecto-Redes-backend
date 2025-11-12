/**
 * Guard de Autenticación JWT
 * 
 * Protege rutas que requieren autenticación con token JWT.
 * Extiende AuthGuard('jwt') de @nestjs/passport para usar la estrategia JWT.
 * 
 * Funcionamiento:
 * 1. Extrae el token del header Authorization: Bearer <token>
 * 2. Valida que el token sea válido y no haya expirado
 * 3. Decodifica el payload del JWT
 * 4. Inyecta el payload en request.user automáticamente
 * 5. Si el token es inválido o expiró, lanza 401 Unauthorized
 * 
 * La estrategia JWT está configurada en auth.module.ts con:
 * - Secret key para validar la firma
 * - Tiempo de expiración (15 minutos)
 * - Extracción desde header Authorization
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard)
 * async miEndpoint(@Request() req) {
 *   const userId = req.user.id; // Payload del token
 * }
 * 
 * Payload típico del token:
 * {
 *   correo: "usuario@example.com",
 *   sub: "64a1b2c3d4e5f6789",
 *   perfil: "usuario" | "administrador",
 *   iat: 1234567890,
 *   exp: 1234568790
 * }
 */
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}