/**
 * DTO (Data Transfer Object) para Registro de Usuario
 * 
 * Define la estructura de datos y validaciones para el registro de nuevos usuarios.
 * Usa decorators de class-validator para validación automática.
 * 
 * Validaciones aplicadas:
 * - nombre: Mínimo 2 caracteres, requerido
 * - apellido: Mínimo 2 caracteres, requerido
 * - correo: Formato de email válido, requerido
 * - nombreUsuario: Mínimo 3 caracteres, requerido
 * - contraseña: Mínimo 8 caracteres, requerido
 * - fechaNacimiento: Formato ISO date string (YYYY-MM-DD), requerido
 * - descripcionBreve: Máximo 200 caracteres, requerido
 * - imagenPerfil: Opcional, URL de Cloudinary
 * 
 * Flujo de validación:
 * 1. ValidationPipe transforma el body JSON en instancia de RegisterDto
 * 2. class-validator ejecuta todos los decorators (@IsEmail, @MinLength, etc.)
 * 3. Si hay errores, lanza BadRequestException automáticamente
 * 4. Si pasa validación, el DTO llega al controller
 * 
 * Validaciones adicionales en AuthService:
 * - Edad mínima 13 años (calculada desde fechaNacimiento)
 * - Contraseña debe tener mayúscula y número
 * - Correo único (no debe existir en MongoDB)
 * - Nombre de usuario único
 * 
 * Ejemplo de JSON válido:
 * {
 *   "nombre": "Juan",
 *   "apellido": "Pérez",
 *   "correo": "juan@example.com",
 *   "nombreUsuario": "juanperez",
 *   "contraseña": "Password123",
 *   "fechaNacimiento": "2000-05-15",
 *   "descripcionBreve": "Desarrollador web"
 * }
 */
import { IsEmail, IsString, MinLength, MaxLength, IsNotEmpty, IsDateString, IsOptional } from 'class-validator';

export class RegisterDto {
  @IsNotEmpty() // Campo requerido
  @IsString() // Debe ser string
  @MinLength(2) // Mínimo 2 caracteres
  nombre: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(2)
  apellido: string;

  @IsEmail() // Valida formato de email (usuario@dominio.com)
  correo: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(3) // Nombres de usuario muy cortos no son recomendables
  nombreUsuario: string;

  @IsNotEmpty()
  @IsString()
  @MinLength(8) // Contraseñas cortas son inseguras
  contraseña: string;

  @IsNotEmpty()
  @IsDateString() // Formato ISO: YYYY-MM-DD
  fechaNacimiento: string;

  @IsNotEmpty()
  @IsString()
  @MaxLength(200) // Descripción breve para perfil
  descripcionBreve: string;

  @IsOptional() // Campo opcional
  @IsString()
  imagenPerfil?: string; // URL de Cloudinary
}