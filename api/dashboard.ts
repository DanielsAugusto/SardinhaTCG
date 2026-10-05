import type { Prisma } from '@prisma/client';
import { createHandler, getQueryParam, sendSuccess } from './_lib/http.js';
import { prisma } from './_lib/prisma.js';
import { decimalToNumber, serializeProduct } from './_lib/serializers.js';
import { dashboardQuerySchema, type SalesPeriod } from './_lib/validation.js';

const MAX_LOW_STOCK = 50;
const STORE_TIMEZONE = 'America/Sao_Paulo';
const STORE_UTC_OFFSET = '-03:00';
const DAY_MS = 24 * 60 * 60 * 1000;

/** Data de hoje (ano, mês, dia) no fuso da loja, independente do fuso do servidor. */
function storeToday(): { year: string; month: string; day: string } {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: STORE_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { year: get('year'), month: get('month'), day: get('day') };
}

function periodStart(period: SalesPeriod): Date {
  const now = Date.now();
  const { year, month, day } = storeToday();
  switch (period) {
    case 'today':
      return new Date(`${year}-${month}-${day}T00:00:00${STORE_UTC_OFFSET}`);
    case '7d':
      return new Date(now - 7 * DAY_MS);
    case '30d':
      return new Date(now - 30 * DAY_MS);
    case 'month':
      return new Date(`${year}-${month}-01T00:00:00${STORE_UTC_OFFSET}`);
    case 'all':
      return new Date(0);
  }
}

interface SalesRow {
  units: bigint | null;
  sales: bigint | null;
  revenue: Prisma.Decimal | null;
  cost: Prisma.Decimal | null;
}

export default createHandler({
  GET: async (req, res) => {
    const { period } = dashboardQuerySchema.parse({ period: getQueryParam(req, 'period') });
    const since = periodStart(period);

    const [totals, stockValue, lowStock, lowStockCount, outOfStockCount, totalCategories, salesRows] =
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
        prisma.$queryRaw<SalesRow[]>`
          SELECT
            COALESCE(SUM("quantity"), 0)::bigint AS units,
            COUNT(*)::bigint AS sales,
            COALESCE(SUM("quantity" * "unitPrice"), 0) AS revenue,
            COALESCE(SUM("quantity" * "unitCost"), 0) AS cost
          FROM "StockMovement"
          WHERE "isSale" = true AND "createdAt" >= ${since}
        `,
      ]);

    const salesRow = salesRows[0];
    const revenue = decimalToNumber(salesRow?.revenue);
    const salesCost = decimalToNumber(salesRow?.cost);
    const profit = Math.round((revenue - salesCost) * 100) / 100;

    sendSuccess(res, {
      totalProducts: totals._count._all,
      totalItems: totals._sum.quantity ?? 0,
      totalCategories,
      totalCostValue: decimalToNumber(stockValue[0]?.cost),
      totalSaleValue: decimalToNumber(stockValue[0]?.sale),
      lowStockCount,
      outOfStockCount,
      lowStockProducts: lowStock.map(serializeProduct),
      sales: {
        period,
        since: since.toISOString(),
        unitsSold: decimalToNumber(salesRow?.units),
        salesCount: decimalToNumber(salesRow?.sales),
        revenue,
        cost: salesCost,
        profit,
        margin: revenue > 0 ? profit / revenue : 0,
      },
    });
  },
});
