import { SetMetadata } from '@nestjs/common';
import { IS_PUBLIC_KEY } from '../constants.js';

/**
 * Marca una ruta como publica (sin autenticacion JWT).
 */
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
