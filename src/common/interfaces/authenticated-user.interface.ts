import type { Role } from '../../generated/prisma/enums.js';

/**
 * Datos del usuario autenticado disponibles dentro del request.
 */
export interface AuthenticatedUser {
  userId: string;
  email: string;
  role: Role;
}
