import { HttpError } from './_lib/errors.js';
import { createHandler, getQueryParam, readJsonBody, sendSuccess } from './_lib/http.js';
import { prisma } from './_lib/prisma.js';
import { serializeMovement } from './_lib/serializers.js';
import { movementQuerySchema, movementSchema } from './_lib/validation.js';

const MAX_RESULTS = 200;

export default createHandler({
  GET: async (req, res) => {
    const { productId } = movementQuerySchema.parse({
      productId: getQueryParam(req, 'productId'),
    });

    const movements = await prisma.stockMovement.findMany({
      where: productId ? { productId } : undefined,
      include: { product: { select: { id: true, name: true, sku: true } } },
      orderBy: { createdAt: 'desc' },
      take: MAX_RESULTS,
    });
    sendSuccess(res, movements.map(serializeMovement));
  },

  POST: async (req, res) => {
    const { productId, type, quantity, reason, isSale, unitPrice } = movementSchema.parse(readJsonBody(req));

    const movement = await prisma.$transaction(async (tx) => {
      if (type === 'OUT') {
        // Update condicional: o débito só acontece se houver saldo, mesmo com requisições concorrentes.
        const { count } = await tx.product.updateMany({
          where: { id: productId, quantity: { gte: quantity } },
          data: { quantity: { decrement: quantity } },
        });
        if (count === 0) {
          const exists = await tx.product.findUnique({ where: { id: productId }, select: { quantity: true } });
          if (!exists) throw new HttpError(404, 'Produto não encontrado.');
          throw new HttpError(409, `Saldo insuficiente. Disponível: ${exists.quantity}.`);
        }
      } else {
        const { count } = await tx.product.updateMany({
          where: { id: productId },
          data: { quantity: { increment: quantity } },
        });
        if (count === 0) throw new HttpError(404, 'Produto não encontrado.');
      }

      // Preço e custo ficam gravados na venda para o lucro não mudar se o cadastro do produto for alterado depois.
      let saleData = {};
      if (isSale) {
        const product = await tx.product.findUniqueOrThrow({
          where: { id: productId },
          select: { costPrice: true, salePrice: true },
        });
        saleData = { isSale: true, unitCost: product.costPrice, unitPrice: unitPrice ?? product.salePrice };
      }

      return tx.stockMovement.create({
        data: { productId, type, quantity, reason, ...saleData },
        include: { product: { select: { id: true, name: true, sku: true, quantity: true } } },
      });
    });

    sendSuccess(res, serializeMovement(movement), 201);
  },
});
