import { SetMetadata } from '@nestjs/common';
import type { Role } from '../../generated/prisma/enums.js';
import { ROLES_KEY } from '../constants.js';

/**
 * Restringe una ruta a los roles indicados.
 */
export const Roles = (...roles: Role[]) => SetMetadata(ROLES_KEY, roles);
