import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { Product, StockMovement, StockStatus } from '../types';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });
const integer = new Intl.NumberFormat('pt-BR');
const dateTime = new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' });

export const formatCurrency = (value: number) => currency.format(value);
export const formatNumber = (value: number) => integer.format(value);
export const formatDateTime = (value: string) => dateTime.format(new Date(value));

export function getStockStatus(product: Pick<Product, 'quantity' | 'minQuantity'>): StockStatus {
  if (product.quantity <= 0) return 'out';
  if (product.quantity <= product.minQuantity) return 'low';
  return 'normal';
}

export function describeMovement(movement: Pick<StockMovement, 'type' | 'isSale' | 'quantity'>): string {
  const label = movement.type === 'IN' ? 'Entrada' : movement.isSale ? 'Venda' : 'Saída';
  return `${label} de ${formatNumber(movement.quantity)}`;
}

export function getErrorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'Erro inesperado.';
}
