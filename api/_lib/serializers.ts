import type { Category, Prisma, Product, StockMovement } from '@prisma/client';

type ProductWithCategory = Product & { category?: Category | null };

export function serializeProduct(product: ProductWithCategory) {
  return {
    ...product,
    costPrice: Number(product.costPrice),
    salePrice: Number(product.salePrice),
  };
}

export function serializeMovement<T extends StockMovement>(movement: T) {
  return {
    ...movement,
    unitPrice: movement.unitPrice === null ? null : Number(movement.unitPrice),
    unitCost: movement.unitCost === null ? null : Number(movement.unitCost),
  };
}

export function decimalToNumber(
  value: Prisma.Decimal | number | bigint | string | null | undefined,
): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}
