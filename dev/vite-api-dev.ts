import type { IncomingMessage, ServerResponse } from 'node:http';
import type { Plugin, ViteDevServer } from 'vite';

/**
 * Executa as funções de /api dentro do `vite dev`, imitando o runtime Node.js da Vercel.
 * Usado apenas em desenvolvimento; em produção a Vercel serve /api diretamente.
 */

interface RouteDef {
  pattern: RegExp;
  file: string;
  param?: string;
}

const ROUTES: RouteDef[] = [
  { pattern: /^\/auth\/login$/, file: '/api/auth/login.ts' },
  { pattern: /^\/auth\/logout$/, file: '/api/auth/logout.ts' },
  { pattern: /^\/auth\/me$/, file: '/api/auth/me.ts' },
  { pattern: /^\/categories$/, file: '/api/categories.ts' },
  { pattern: /^\/products$/, file: '/api/products.ts' },
  { pattern: /^\/products\/([^/]+)$/, file: '/api/products/[id].ts', param: 'id' },
  { pattern: /^\/movements$/, file: '/api/movements.ts' },
  { pattern: /^\/dashboard$/, file: '/api/dashboard.ts' },
];

const MAX_BODY_BYTES = 1024 * 1024;

type Handler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

function parseCookies(header: string | undefined): Record<string, string> {
  const cookies: Record<string, string> = {};
  for (const part of (header ?? '').split(';')) {
    const index = part.indexOf('=');
    if (index < 0) continue;
    const key = part.slice(0, index).trim();
    if (!key) continue;
    try {
      cookies[key] = decodeURIComponent(part.slice(index + 1).trim());
    } catch {
      cookies[key] = part.slice(index + 1).trim();
    }
  }
  return cookies;
}

async function readBody(req: IncomingMessage): Promise<string> {
  const chunks: Buffer[] = [];
  let size = 0;
  for await (const chunk of req) {
    const buffer = chunk as Buffer;
    size += buffer.length;
    if (size > MAX_BODY_BYTES) throw new Error('payload too large');
    chunks.push(buffer);
  }
  return Buffer.concat(chunks).toString('utf8');
}

function sendJson(res: ServerResponse, status: number, body: unknown) {
  res.statusCode = status;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.end(JSON.stringify(body));
}

async function handle(server: ViteDevServer, req: IncomingMessage, res: ServerResponse) {
  const url = new URL(req.url ?? '/', 'http://localhost');
  const path = url.pathname.replace(/\/+$/, '') || '/';

  let route: RouteDef | undefined;
  let match: RegExpMatchArray | null = null;
  for (const candidate of ROUTES) {
    match = path.match(candidate.pattern);
    if (match) {
      route = candidate;
      break;
    }
  }
  if (!route || !match) return sendJson(res, 404, { success: false, error: 'Rota não encontrada.' });

  const query: Record<string, string | string[]> = {};
  for (const key of new Set(url.searchParams.keys())) {
    const values = url.searchParams.getAll(key);
    query[key] = values.length > 1 ? values : values[0];
  }
  if (route.param && match[1]) {
    try {
      query[route.param] = decodeURIComponent(match[1]);
    } catch {
      return sendJson(res, 400, { success: false, error: 'URL inválida.' });
    }
  }

  let rawBody = '';
  try {
    rawBody = await readBody(req);
  } catch {
    return sendJson(res, 413, { success: false, error: 'Requisição muito grande.' });
  }

  const contentType = req.headers['content-type'] ?? '';
  let parsedBody: unknown = rawBody || undefined;
  let bodyError = false;
  if (rawBody && contentType.toLowerCase().startsWith('application/json')) {
    try {
      parsedBody = JSON.parse(rawBody);
    } catch {
      bodyError = true;
    }
  }

  const vercelReq = Object.assign(req, { query, cookies: parseCookies(req.headers.cookie) });
  Object.defineProperty(vercelReq, 'body', {
    get() {
      if (bodyError) throw new Error('Invalid JSON');
      return parsedBody;
    },
  });

  const vercelRes = Object.assign(res, {
    status(code: number) {
      res.statusCode = code;
      return vercelRes;
    },
    json(body: unknown) {
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.end(JSON.stringify(body));
      return vercelRes;
    },
  });

  const mod = (await server.ssrLoadModule(route.file)) as { default: Handler };
  await mod.default(vercelReq, vercelRes);
}

export function apiDevServer(): Plugin {
  return {
    name: 'sardinha-api-dev',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/api', (req, res) => {
        handle(server, req, res).catch((err: unknown) => {
          server.config.logger.error(`[api-dev] ${err instanceof Error ? err.message : String(err)}`);
          if (!res.headersSent) sendJson(res, 500, { success: false, error: 'Erro interno do servidor.' });
        });
      });
    },
  };
}
