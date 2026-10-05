import type { Product } from '../types';
import { cn, getStockStatus } from '../lib/utils';

const STYLES = {
  normal: { label: 'Normal', className: 'bg-emerald-100 text-emerald-700' },
  low: { label: 'Estoque baixo', className: 'bg-amber-100 text-amber-700' },
  out: { label: 'Zerado', className: 'bg-red-100 text-red-700' },
} as const;

export default function StockBadge({ product }: { product: Pick<Product, 'quantity' | 'minQuantity'> }) {
  const style = STYLES[getStockStatus(product)];
  return (
    <span className={cn('inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium', style.className)}>
      {style.label}
    </span>
  );
}
