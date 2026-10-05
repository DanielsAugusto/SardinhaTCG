import { HttpError } from './_lib/errors.js';
import { createHandler, getQueryParam, readJsonBody, sendSuccess } from './_lib/http.js';
import { prisma } from './_lib/prisma.js';
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
    sendSuccess(res, movements);
  },

  POST: async (req, res) => {
    const { productId, type, quantity, reason } = movementSchema.parse(readJsonBody(req));

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

      return tx.stockMovement.create({
        data: { productId, type, quantity, reason },
        include: { product: { select: { id: true, name: true, sku: true, quantity: true } } },
      });
    });

    sendSuccess(res, movement, 201);
  },
});
