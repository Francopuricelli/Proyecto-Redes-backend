/**
 * Guard de Administrador
 * 
 * Protege rutas que solo pueden ser accedidas por usuarios administradores.
 * DEBE usarse junto con JwtAuthGuard para funcionar correctamente.
 * 
 * Funcionamiento:
 * 1. JwtAuthGuard valida el token y agrega req.user al request
 * 2. AdminGuard verifica que req.user exista
 * 3. Verifica que req.user.perfil === 'administrador'
 * 4. Si no es admin, lanza 403 Forbidden
 * 5. Si es admin, permite el acceso (return true)
 * 
 * Perfiles posibles:
 * - 'usuario': Usuario normal de la plataforma
 * - 'administrador': Usuario con permisos especiales
 * 
 * Uso:
 * @UseGuards(JwtAuthGuard, AdminGuard)
 * async endpointProtegido(@Request() req) {
 *   // Solo administradores pueden llegar aquí
 * }
 * 
 * Orden importante:
 * 1. JwtAuthGuard PRIMERO (valida token, inyecta req.user)
 * 2. AdminGuard SEGUNDO (verifica perfil de req.user)
 * 
 * Endpoints que usan AdminGuard:
 * - GET /users: Listar todos los usuarios
 * - POST /users: Crear usuario como administrador
 * - DELETE /users/:id: Desactivar usuario
 * - POST /users/:id/activar: Activar usuario
 */
import { Injectable, CanActivate, ExecutionContext, ForbiddenException } from '@nestjs/common';

@Injectable()
export class AdminGuard implements CanActivate {
  /**
   * Método que valida si el usuario puede acceder a la ruta
   * 
   * @param context - Contexto de ejecución de NestJS
   * @returns true si es administrador, lanza ForbiddenException si no
   */
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    // El JwtAuthGuard ya validó el token y agregó el user al request
    if (!user) {
      throw new ForbiddenException('No se encontró información del usuario');
    }

    // Verificar si el usuario es administrador
    if (user.perfil !== 'administrador') {
      throw new ForbiddenException('No tiene permisos de administrador');
    }

    return true; // Permitir acceso
  }
}
