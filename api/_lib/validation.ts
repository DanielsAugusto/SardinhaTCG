import { z } from 'zod';

const MAX_PRICE = 99_999_999.99;
const MAX_QUANTITY = 1_000_000;

const money = (label: string) =>
  z
    .number({ error: `${label} deve ser um número.` })
    .min(0, `${label} não pode ser negativo.`)
    .max(MAX_PRICE, `${label} acima do limite permitido.`)
    .transform((value) => Math.round(value * 100) / 100);

const optionalText = (max: number, label: string) =>
  z
    .string()
    .trim()
    .max(max, `${label} deve ter no máximo ${max} caracteres.`)
    .nullish()
    .transform((value) => (value ? value : null));

export const idSchema = z.uuid('Identificador inválido.');

export const loginSchema = z.object({
  username: z.string().trim().min(1, 'Informe o usuário.').max(64, 'Usuário inválido.'),
  password: z.string().min(1, 'Informe a senha.').max(128, 'Senha inválida.'),
});

export const categorySchema = z.object({
  name: z
    .string({ error: 'Nome da categoria é obrigatório.' })
    .trim()
    .min(1, 'Nome da categoria é obrigatório.')
    .max(60, 'Nome da categoria deve ter no máximo 60 caracteres.'),
});

const productBase = {
  name: z
    .string({ error: 'Nome é obrigatório.' })
    .trim()
    .min(1, 'Nome é obrigatório.')
    .max(120, 'Nome deve ter no máximo 120 caracteres.'),
  sku: z
    .string({ error: 'SKU é obrigatório.' })
    .trim()
    .min(1, 'SKU é obrigatório.')
    .max(40, 'SKU deve ter no máximo 40 caracteres.')
    .regex(/^[A-Za-z0-9._-]+$/, 'SKU aceita apenas letras, números, ponto, hífen e sublinhado.')
    .transform((value) => value.toUpperCase()),
  description: optionalText(500, 'Descrição'),
  costPrice: money('Preço de custo'),
  salePrice: money('Preço de venda'),
  minQuantity: z
    .number({ error: 'Estoque mínimo deve ser um número.' })
    .int('Estoque mínimo deve ser inteiro.')
    .min(0, 'Estoque mínimo não pode ser negativo.')
    .max(MAX_QUANTITY, 'Estoque mínimo acima do limite.'),
  categoryId: z.uuid('Selecione uma categoria válida.'),
};

export const productCreateSchema = z.object({
  ...productBase,
  quantity: z
    .number({ error: 'Quantidade inicial deve ser um número.' })
    .int('Quantidade inicial deve ser inteira.')
    .min(0, 'Quantidade inicial não pode ser negativa.')
    .max(MAX_QUANTITY, 'Quantidade inicial acima do limite.')
    .default(0),
});

export const productUpdateSchema = z.object(productBase);

export const productQuerySchema = z.object({
  search: z.string().trim().max(100, 'Busca muito longa.').optional(),
  categoryId: z.uuid('Categoria inválida.').optional(),
});

export const movementSchema = z
  .object({
    productId: z.uuid('Selecione um produto válido.'),
    type: z.enum(['IN', 'OUT'], { error: 'Tipo deve ser Entrada ou Saída.' }),
    quantity: z
      .number({ error: 'Quantidade deve ser um número.' })
      .int('Quantidade deve ser inteira.')
      .min(1, 'Quantidade deve ser maior que zero.')
      .max(MAX_QUANTITY, 'Quantidade acima do limite.'),
    reason: optionalText(200, 'Motivo'),
    isSale: z.boolean({ error: 'Indicador de venda inválido.' }).default(false),
    unitPrice: money('Preço unitário de venda').nullish(),
  })
  .refine((data) => !data.isSale || data.type === 'OUT', {
    message: 'Só saídas podem ser registradas como venda.',
    path: ['isSale'],
  });

export const movementQuerySchema = z.object({
  productId: z.uuid('Produto inválido.').optional(),
});

export const SALES_PERIODS = ['today', '7d', '30d', 'month', 'all'] as const;
export type SalesPeriod = (typeof SALES_PERIODS)[number];

export const dashboardQuerySchema = z.object({
  period: z.enum(SALES_PERIODS, { error: 'Período inválido.' }).default('month'),
});
