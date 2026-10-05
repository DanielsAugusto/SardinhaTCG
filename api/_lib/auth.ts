import { createHash, timingSafeEqual } from 'node:crypto';
import bcrypt from 'bcryptjs';
import { SignJWT, jwtVerify } from 'jose';
import { HttpError } from './errors.js';
import type { Session, VercelRequest, VercelResponse } from './types.js';

export const SESSION_COOKIE = 'sardinha_session';
const SESSION_TTL_SECONDS = 8 * 60 * 60;
const JWT_ISSUER = 'sardinha-tcg';
const JWT_AUDIENCE = 'sardinha-tcg-estoque';
const MIN_SECRET_LENGTH = 32;

interface AuthConfig {
  secret: Uint8Array;
  adminUsername: string;
  adminPasswordHash: string;
}

/** O hash bcrypt fica em base64url no ambiente porque carregadores de .env expandem "$". */
function decodePasswordHash(encoded: string): string {
  const hash = Buffer.from(encoded, 'base64url').toString('utf8');
  return /^\$2[aby]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(hash) ? hash : '';
}

/** Tolera espaços e aspas coladas junto com o valor no painel da Vercel. */
function readEnv(name: string): string {
  const value = (process.env[name] ?? '').trim();
  const quoted = value.length >= 2 && (value[0] === '"' || value[0] === "'") && value.at(-1) === value[0];
  return quoted ? value.slice(1, -1).trim() : value;
}

function getAuthConfig(): AuthConfig {
  const secret = readEnv('JWT_SECRET');
  const adminUsername = readEnv('ADMIN_USERNAME');
  const adminPasswordHash = decodePasswordHash(readEnv('ADMIN_PASSWORD_HASH'));

  const problems: string[] = [];
  if (secret.length < MIN_SECRET_LENGTH) problems.push(`JWT_SECRET (ausente ou com menos de ${MIN_SECRET_LENGTH} caracteres)`);
  if (!adminUsername) problems.push('ADMIN_USERNAME (ausente)');
  if (!adminPasswordHash) problems.push('ADMIN_PASSWORD_HASH (ausente ou inválido; gere com npm run hash-password)');

  if (problems.length > 0) {
    console.error(`[auth] Configuração inválida: ${problems.join('; ')}`);
    throw new HttpError(500, 'Servidor não configurado corretamente.');
  }

  return {
    secret: new TextEncoder().encode(secret),
    adminUsername,
    adminPasswordHash,
  };
}

function safeEqual(a: string, b: string): boolean {
  const hashA = createHash('sha256').update(a).digest();
  const hashB = createHash('sha256').update(b).digest();
  return timingSafeEqual(hashA, hashB);
}

export async function verifyCredentials(username: string, password: string): Promise<boolean> {
  const config = getAuthConfig();
  const usernameOk = safeEqual(username, config.adminUsername);
  // bcrypt roda mesmo com usuário errado para não revelar, pelo tempo de resposta, se o usuário existe.
  const passwordOk = await bcrypt.compare(password, config.adminPasswordHash);
  return usernameOk && passwordOk;
}

export async function createSessionCookie(username: string): Promise<string> {
  const { secret } = getAuthConfig();
  const token = await new SignJWT({})
    .setProtectedHeader({ alg: 'HS256' })
    .setSubject(username)
    .setIssuer(JWT_ISSUER)
    .setAudience(JWT_AUDIENCE)
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(secret);

  return serializeCookie(token, SESSION_TTL_SECONDS);
}

export function clearSessionCookie(): string {
  return serializeCookie('', 0);
}

function serializeCookie(value: string, maxAge: number): string {
  return [
    `${SESSION_COOKIE}=${value}`,
    'Path=/',
    'HttpOnly',
    'Secure',
    'SameSite=Strict',
    `Max-Age=${maxAge}`,
  ].join('; ');
}

export async function requireAuth(req: VercelRequest): Promise<Session> {
  const config = getAuthConfig();
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) throw new HttpError(401, 'Sessão inválida ou expirada.');

  try {
    const { payload } = await jwtVerify(token, config.secret, {
      algorithms: ['HS256'],
      issuer: JWT_ISSUER,
      audience: JWT_AUDIENCE,
    });
    if (typeof payload.sub !== 'string' || !safeEqual(payload.sub, config.adminUsername)) {
      throw new Error('subject inválido');
    }
    return { username: payload.sub };
  } catch {
    throw new HttpError(401, 'Sessão inválida ou expirada.');
  }
}

/** Proteção contra CSRF: requisições que alteram dados precisam vir da mesma origem. */
export function assertSameOrigin(req: VercelRequest): void {
  const origin = req.headers.origin;
  const forwardedHost = req.headers['x-forwarded-host'];
  const host = (Array.isArray(forwardedHost) ? forwardedHost[0] : forwardedHost) ?? req.headers.host;

  if (!origin || !host) throw new HttpError(403, 'Origem da requisição não permitida.');

  let originHost: string;
  try {
    originHost = new URL(origin).host;
  } catch {
    throw new HttpError(403, 'Origem da requisição não permitida.');
  }
  if (originHost !== host) throw new HttpError(403, 'Origem da requisição não permitida.');
}

export function setSessionCookie(res: VercelResponse, cookie: string): void {
  res.setHeader('Set-Cookie', cookie);
}
