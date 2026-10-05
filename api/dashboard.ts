import type { Prisma } from '@prisma/client';
import { createHandler, sendSuccess } from './_lib/http.js';
import { prisma } from './_lib/prisma.js';
import { decimalToNumber, serializeProduct } from './_lib/serializers.js';

const MAX_LOW_STOCK = 50;

export default createHandler({
  GET: async (_req, res) => {
    const [totals, stockValue, lowStock, lowStockCount, outOfStockCount, totalCategories] =
      await Promise.all([
        prisma.product.aggregate({ _count: { _all: true }, _sum: { quantity: true } }),
        prisma.$queryRaw<{ cost: Prisma.Decimal | null; sale: Prisma.Decimal | null }[]>`
          SELECT
            COALESCE(SUM("costPrice" * "quantity"), 0) AS cost,
            COALESCE(SUM("salePrice" * "quantity"), 0) AS sale
          FROM "Product"
        `,
        prisma.product.findMany({
          where: { quantity: { lte: prisma.product.fields.minQuantity } },
          include: { category: true },
          orderBy: { quantity: 'asc' },
          take: MAX_LOW_STOCK,
        }),
        prisma.product.count({ where: { quantity: { lte: prisma.product.fields.minQuantity } } }),
        prisma.product.count({ where: { quantity: 0 } }),
        prisma.category.count(),
      ]);

    sendSuccess(res, {
      totalProducts: totals._count._all,
      totalItems: totals._sum.quantity ?? 0,
      totalCategories,
      totalCostValue: decimalToNumber(stockValue[0]?.cost),
      totalSaleValue: decimalToNumber(stockValue[0]?.sale),
      lowStockCount,
      outOfStockCount,
      lowStockProducts: lowStock.map(serializeProduct),
    });
  },
});
