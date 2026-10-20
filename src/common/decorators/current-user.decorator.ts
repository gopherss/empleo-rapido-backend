import {
  createParamDecorator,
  type ExecutionContext,
} from '@nestjs/common';
import type { AuthenticatedUser } from '../interfaces/authenticated-user.interface.js';

/**
 * Inyecta el usuario autenticado (o una de sus propiedades) en el handler.
 *
 * @example
 * findAll(@CurrentUser() user: AuthenticatedUser) {}
 * findMine(@CurrentUser('userId') userId: string) {}
 */
export const CurrentUser = createParamDecorator(
  (
    data: keyof AuthenticatedUser | undefined,
    ctx: ExecutionContext,
  ): AuthenticatedUser | AuthenticatedUser[keyof AuthenticatedUser] | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user?: AuthenticatedUser }>();

    const user = request.user;

    return data && user ? user[data] : user;
  },
);
