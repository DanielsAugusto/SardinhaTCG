import { createHandler, getQueryParam, readJsonBody, sendSuccess } from '../_lib/http.js';
import { prisma } from '../_lib/prisma.js';
import { serializeProduct } from '../_lib/serializers.js';
import { idSchema, productUpdateSchema } from '../_lib/validation.js';
import type { VercelRequest } from '../_lib/types.js';

function getProductId(req: VercelRequest): string {
  return idSchema.parse(getQueryParam(req, 'id'));
}

export default createHandler({
  PUT: async (req, res) => {
    const id = getProductId(req);
    const data = productUpdateSchema.parse(readJsonBody(req));

    const product = await prisma.product.update({
      where: { id },
      data,
      include: { category: true },
    });
    sendSuccess(res, serializeProduct(product));
  },

  DELETE: async (req, res) => {
    const id = getProductId(req);
    await prisma.product.delete({ where: { id } });
    sendSuccess(res, { id });
  },
});
