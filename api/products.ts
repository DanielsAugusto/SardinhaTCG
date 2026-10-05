import type { Prisma } from '@prisma/client';
import { createHandler, getQueryParam, readJsonBody, sendSuccess } from './_lib/http.js';
import { prisma } from './_lib/prisma.js';
import { serializeProduct } from './_lib/serializers.js';
import { productCreateSchema, productQuerySchema } from './_lib/validation.js';

const MAX_RESULTS = 500;

export default createHandler({
  GET: async (req, res) => {
    const { search, categoryId } = productQuerySchema.parse({
      search: getQueryParam(req, 'search'),
      categoryId: getQueryParam(req, 'categoryId'),
    });

    const where: Prisma.ProductWhereInput = {};
    if (categoryId) where.categoryId = categoryId;
    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      include: { category: true },
      orderBy: { name: 'asc' },
      take: MAX_RESULTS,
    });
    sendSuccess(res, products.map(serializeProduct));
  },

  POST: async (req, res) => {
    const { quantity, ...data } = productCreateSchema.parse(readJsonBody(req));

    const product = await prisma.$transaction(async (tx) => {
      const created = await tx.product.create({
        data: { ...data, quantity },
        include: { category: true },
      });
      if (quantity > 0) {
        await tx.stockMovement.create({
          data: { productId: created.id, type: 'IN', quantity, reason: 'Estoque inicial' },
        });
      }
      return created;
    });

    sendSuccess(res, serializeProduct(product), 201);
  },
});
