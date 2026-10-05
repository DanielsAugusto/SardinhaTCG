import type { IncomingMessage, ServerResponse } from 'node:http';

/** Subconjunto do request/response que o runtime Node.js da Vercel injeta nas funções. */
export interface VercelRequest extends IncomingMessage {
  query: Partial<Record<string, string | string[]>>;
  cookies: Partial<Record<string, string>>;
  body: unknown;
}

export interface VercelResponse extends ServerResponse {
  status(code: number): VercelResponse;
  json(body: unknown): VercelResponse;
}

export interface Session {
  username: string;
}

export type RouteHandler = (
  req: VercelRequest,
  res: VercelResponse,
  session: Session | null,
) => Promise<void>;

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE';
