/**
 * DTO (Data Transfer Object) para Login de Usuario
 * 
 * Define la estructura de datos para iniciar sesión.
 * Acepta nombre de usuario O correo electrónico.
 * 
 * Validaciones aplicadas:
 * - usuario: Requerido, debe ser string (puede ser email o nombreUsuario)
 * - contraseña: Requerido, debe ser string
 * 
 * Flujo de validación:
 * 1. ValidationPipe valida automáticamente el DTO
 * 2. Si falta algún campo, lanza BadRequestException
 * 3. AuthService busca usuario por email O nombre de usuario
 * 4. Valida la contraseña con bcrypt
 * 5. Si es válido, genera token JWT
 * 
 * Flexibilidad del campo "usuario":
 * - Puede ser email: "juan@example.com"
 * - Puede ser nombre de usuario: "juanperez"
 * - UsersService.findByEmailOrUsername() busca en ambos campos
 * 
 * Seguridad:
 * - No se valida formato de email aquí (más flexible)
 * - Mensaje genérico "Credenciales inválidas" si falla
 * - No revela si el error es por usuario o contraseña
 * 
 * Ejemplo de JSON válido:
 * {
 *   "usuario": "juanperez",
 *   "contraseña": "Password123"
 * }
 * 
 * O también:
 * {
 *   "usuario": "juan@example.com",
 *   "contraseña": "Password123"
 * }
 */
import { IsNotEmpty, IsString } from 'class-validator';

export class LoginDto {
  @IsNotEmpty() // Campo requerido
  @IsString() // Debe ser string
  usuario: string; // puede ser email o nombreUsuario

  @IsNotEmpty()
  @IsString()
  contraseña: string;
}