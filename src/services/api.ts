import type {
  ApiResponse,
  Category,
  DashboardData,
  MovementInput,
  Product,
  ProductFilters,
  ProductInput,
  SalesPeriod,
  StockMovement,
} from '../types';

export class ApiError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
  }
}

type UnauthorizedListener = () => void;
let onUnauthorized: UnauthorizedListener | null = null;

export function setUnauthorizedHandler(listener: UnauthorizedListener | null): void {
  onUnauthorized = listener;
}

async function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = new Headers(init.headers);
  if (init.body !== undefined) headers.set('Content-Type', 'application/json');

  let response: Response;
  try {
    response = await fetch(`/api${path}`, { ...init, headers, credentials: 'same-origin' });
  } catch {
    throw new ApiError(0, 'Não foi possível conectar ao servidor.');
  }

  let payload: ApiResponse<T> | null = null;
  try {
    payload = (await response.json()) as ApiResponse<T>;
  } catch {
    payload = null;
  }

  if (response.status === 401 && !path.startsWith('/auth/')) onUnauthorized?.();

  if (!response.ok || !payload?.success) {
    throw new ApiError(response.status, payload?.error ?? 'Erro inesperado. Tente novamente.');
  }
  return payload.data as T;
}

const json = (body: unknown) => JSON.stringify(body);

function toQuery(params: Record<string, string | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, value);
  const qs = search.toString();
  return qs ? `?${qs}` : '';
}

// Auth
export const login = (username: string, password: string) =>
  request<{ username: string }>('/auth/login', { method: 'POST', body: json({ username, password }) });
export const logout = () => request<null>('/auth/logout', { method: 'POST' });
export const me = () => request<{ username: string }>('/auth/me');

// Categorias
export const getCategories = () => request<Category[]>('/categories');
export const createCategory = (name: string) =>
  request<Category>('/categories', { method: 'POST', body: json({ name }) });

// Produtos
export const getProducts = (filters: ProductFilters = {}) =>
  request<Product[]>(`/products${toQuery({ search: filters.search, categoryId: filters.categoryId })}`);

/** Na edição, o servidor ignora `quantity`: o saldo só muda por movimentações. */
export function saveProduct(input: ProductInput, id?: string): Promise<Product> {
  if (id) {
    return request<Product>(`/products/${encodeURIComponent(id)}`, { method: 'PUT', body: json(input) });
  }
  return request<Product>('/products', { method: 'POST', body: json(input) });
}

export const deleteProduct = (id: string) =>
  request<{ id: string }>(`/products/${encodeURIComponent(id)}`, { method: 'DELETE' });

// Movimentações
export const getMovements = (productId?: string) =>
  request<StockMovement[]>(`/movements${toQuery({ productId })}`);
export const createMovement = (input: MovementInput) =>
  request<StockMovement>('/movements', { method: 'POST', body: json(input) });

// Dashboard
export const getDashboard = (period: SalesPeriod) => request<DashboardData>(`/dashboard${toQuery({ period })}`);
