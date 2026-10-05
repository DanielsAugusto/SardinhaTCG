import type { Category, Prisma, Product } from '@prisma/client';

type ProductWithCategory = Product & { category?: Category | null };

export function serializeProduct(product: ProductWithCategory) {
  return {
    ...product,
    costPrice: Number(product.costPrice),
    salePrice: Number(product.salePrice),
  };
}

export function decimalToNumber(value: Prisma.Decimal | number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  return Number(value);
}
