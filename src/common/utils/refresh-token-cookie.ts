import type { Response } from 'express';

export const REFRESH_TOKEN_COOKIE = 'empl_rt';
const REFRESH_TOKEN_COOKIE_PATH = '/api/auth';

export interface RefreshTokenCookieOptions {
  secure: boolean;
  maxAgeMs: number;
}

// El refresh token viaja en una cookie HttpOnly: inaccesible para JavaScript
// y solo enviada a /api/auth (refresh y logout).
export function setRefreshTokenCookie(
  res: Response,
  token: string,
  options: RefreshTokenCookieOptions,
): void {
  res.cookie(REFRESH_TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: options.secure,
    sameSite: 'lax',
    path: REFRESH_TOKEN_COOKIE_PATH,
    maxAge: Math.max(options.maxAgeMs, 0),
  });
}

export function clearRefreshTokenCookie(res: Response, secure: boolean): void {
  res.clearCookie(REFRESH_TOKEN_COOKIE, {
    httpOnly: true,
    secure,
    sameSite: 'lax',
    path: REFRESH_TOKEN_COOKIE_PATH,
  });
}

export function extractRefreshTokenCookie(req: {
  cookies?: Record<string, string>;
}): string | null {
  const token = req.cookies?.[REFRESH_TOKEN_COOKIE];
  return typeof token === 'string' && token ? token : null;
}
