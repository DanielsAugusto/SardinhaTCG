import { createHandler, readJsonBody, sendSuccess } from './_lib/http.js';
import { prisma } from './_lib/prisma.js';
import { categorySchema } from './_lib/validation.js';

export default createHandler({
  GET: async (_req, res) => {
    const categories = await prisma.category.findMany({
      orderBy: { name: 'asc' },
      include: { _count: { select: { products: true } } },
    });
    sendSuccess(res, categories);
  },

  POST: async (req, res) => {
    const { name } = categorySchema.parse(readJsonBody(req));
    const category = await prisma.category.create({ data: { name } });
    sendSuccess(res, category, 201);
  },
});
