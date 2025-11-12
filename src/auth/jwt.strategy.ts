/**
 * Estrategia JWT para validación de tokens
 * 
 * Extiende PassportStrategy de @nestjs/passport para implementar
 * la estrategia de autenticación JWT usando passport-jwt.
 * 
 * Esta estrategia es utilizada automáticamente por JwtAuthGuard
 * cuando se protege una ruta con @UseGuards(JwtAuthGuard).
 * 
 * Configuración:
 * - jwtFromRequest: Extrae el token del header Authorization: Bearer <token>
 * - ignoreExpiration: false (rechaza tokens expirados)
 * - secretOrKey: Clave secreta para validar la firma del token
 * 
 * Flujo de validación:
 * 1. JwtAuthGuard detecta un request a una ruta protegida
 * 2. Extrae el token del header Authorization
 * 3. Valida la firma del token con la secret key
 * 4. Verifica que no haya expirado
 * 5. Decodifica el payload del token
 * 6. Llama al método validate() con el payload decodificado
 * 7. validate() busca el usuario en MongoDB por payload.sub (ID)
 * 8. Si el usuario existe, lo devuelve y se inyecta en req.user
 * 9. Si no existe, lanza UnauthorizedException (401)
 * 
 * Payload típico del token JWT:
 * {
 *   correo: "usuario@example.com",
 *   sub: "64a1b2c3d4e5f6789", // ID del usuario en MongoDB
 *   perfil: "usuario" | "administrador",
 *   iat: 1234567890, // Timestamp de emisión
 *   exp: 1234568790  // Timestamp de expiración (15 minutos después)
 * }
 * 
 * Usado por:
 * - JwtAuthGuard en rutas protegidas
 * - POST /auth/autorizar
 * - POST /auth/refrescar
 * - PATCH /users/me
 * - GET /users/me
 * - Endpoints de admin
 */
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { UsersService } from '../users/users.service';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(
    // UsersService: Para buscar usuarios por ID
    private usersService: UsersService,
    // ConfigService: Para acceder a variables de entorno
    private configService: ConfigService,
  ) {
    // Configuración de la estrategia JWT
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(), // Extrae token de header Authorization: Bearer <token>
      ignoreExpiration: false, // Rechaza tokens expirados
      secretOrKey: configService.get<string>('JWT_SECRET') || 'defaultSecret', // Clave secreta para validar firma
    });
  }

  /**
   * Valida el payload del token JWT decodificado
   * 
   * Este método se llama automáticamente después de que Passport
   * valida la firma y expiración del token.
   * 
   * @param payload - Payload decodificado del token JWT
   * @returns Usuario encontrado en MongoDB (se inyecta en req.user)
   * @throws UnauthorizedException si el usuario no existe
   * 
   * Nota: payload.sub contiene el ID del usuario (_id de MongoDB)
   */
  async validate(payload: any) {
    // Buscar usuario en MongoDB por ID
    const user = await this.usersService.findOne(payload.sub);
    if (!user) {
      // Usuario no encontrado (puede haber sido eliminado después de emitir el token)
      throw new UnauthorizedException();
    }
    // Devolver usuario encontrado (Passport lo inyecta en req.user automáticamente)
    return user;
  }
}