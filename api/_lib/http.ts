import { Prisma } from '@prisma/client';
import { ZodError } from 'zod';
import { assertSameOrigin, requireAuth } from './auth.js';
import { HttpError } from './errors.js';
import type { HttpMethod, RouteHandler, VercelRequest, VercelResponse } from './types.js';

const MUTATING_METHODS = new Set<string>(['POST', 'PUT', 'DELETE']);

export function sendSuccess<T>(res: VercelResponse, data: T, status = 200): void {
  res.status(status).json({ success: true, data });
}

export function sendError(res: VercelResponse, status: number, error: string): void {
  res.status(status).json({ success: false, error });
}

export function readJsonBody(req: VercelRequest): unknown {
  const contentType = req.headers['content-type'] ?? '';
  if (!contentType.toLowerCase().startsWith('application/json')) {
    throw new HttpError(415, 'Envie os dados no formato JSON.');
  }
  try {
    return req.body;
  } catch {
    throw new HttpError(400, 'JSON inválido.');
  }
}

export function getQueryParam(req: VercelRequest, key: string): string | undefined {
  const value = req.query[key];
  const first = Array.isArray(value) ? value[0] : value;
  return first === undefined || first === '' ? undefined : first;
}

function mapKnownError(err: unknown): { status: number; message: string } | null {
  if (err instanceof HttpError) return { status: err.status, message: err.message };
  if (err instanceof ZodError) {
    return { status: 400, message: err.issues[0]?.message ?? 'Dados inválidos.' };
  }
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    switch (err.code) {
      case 'P2002':
        return { status: 409, message: 'Já existe um registro com esse valor (nome ou SKU).' };
      case 'P2003':
        return { status: 400, message: 'Referência inválida (categoria ou produto inexistente).' };
      case 'P2025':
        return { status: 404, message: 'Registro não encontrado.' };
    }
  }
  return null;
}

interface HandlerOptions {
  /** Rotas são privadas por padrão; só marque como pública o que realmente precisa ser. */
  public?: boolean;
}

export function createHandler(
  routes: Partial<Record<HttpMethod, RouteHandler>>,
  options: HandlerOptions = {},
) {
  return async (req: VercelRequest, res: VercelResponse): Promise<void> => {
    res.setHeader('Cache-Control', 'no-store');
    const method = (req.method ?? 'GET').toUpperCase();

    try {
      const route = routes[method as HttpMethod];
      if (!route) {
        res.setHeader('Allow', Object.keys(routes).join(', '));
        sendError(res, 405, 'Método não permitido.');
        return;
      }

      if (MUTATING_METHODS.has(method)) assertSameOrigin(req);
      const session = options.public ? null : await requireAuth(req);

      await route(req, res, session);
    } catch (err) {
      const known = mapKnownError(err);
      if (known) {
        sendError(res, known.status, known.message);
        return;
      }
      const path = (req.url ?? '').split('?')[0];
      const detail = err instanceof Error ? `${err.name}: ${err.message}` : 'erro desconhecido';
      console.error(`[api] ${method} ${path} falhou -> ${detail}`);
      sendError(res, 500, 'Erro interno do servidor.');
    }
  };
}
