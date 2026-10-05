import { useState, type FormEvent } from 'react';
import { Loader2, Plus } from 'lucide-react';
import Modal from './Modal';
import { createCategory, saveProduct } from '../services/api';
import type { Category, Product } from '../types';
import { getErrorMessage } from '../lib/utils';

interface ProductModalProps {
  open: boolean;
  product: Product | null;
  categories: Category[];
  onClose: () => void;
  onSaved: (product: Product) => void;
  onCategoryCreated: (category: Category) => void;
}

export default function ProductModal(props: ProductModalProps) {
  return (
    <Modal open={props.open} title={props.product ? 'Editar produto' : 'Novo produto'} onClose={props.onClose}>
      <ProductForm key={props.product?.id ?? 'new'} {...props} />
    </Modal>
  );
}

function ProductForm({ product, categories, onClose, onSaved, onCategoryCreated }: ProductModalProps) {
  const isEdit = product !== null;
  const [form, setForm] = useState({
    name: product?.name ?? '',
    sku: product?.sku ?? '',
    description: product?.description ?? '',
    costPrice: product ? String(product.costPrice) : '',
    salePrice: product ? String(product.salePrice) : '',
    quantity: '0',
    minQuantity: product ? String(product.minQuantity) : '5',
    categoryId: product?.categoryId ?? '',
  });
  const [newCategory, setNewCategory] = useState('');
  const [showNewCategory, setShowNewCategory] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [creatingCategory, setCreatingCategory] = useState(false);

  const update = (field: keyof typeof form) => (value: string) => setForm((prev) => ({ ...prev, [field]: value }));

  async function handleCreateCategory() {
    const name = newCategory.trim();
    if (!name) return;
    setError(null);
    setCreatingCategory(true);
    try {
      const category = await createCategory(name);
      onCategoryCreated(category);
      setForm((prev) => ({ ...prev, categoryId: category.id }));
      setNewCategory('');
      setShowNewCategory(false);
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setCreatingCategory(false);
    }
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const costPrice = Number(form.costPrice.replace(',', '.'));
    const salePrice = Number(form.salePrice.replace(',', '.'));
    const minQuantity = Number(form.minQuantity);
    const quantity = Number(form.quantity);

    if (!form.categoryId) return setError('Selecione uma categoria.');
    if (!Number.isFinite(costPrice) || costPrice < 0) return setError('Preço de custo inválido.');
    if (!Number.isFinite(salePrice) || salePrice < 0) return setError('Preço de venda inválido.');
    if (!Number.isInteger(minQuantity) || minQuantity < 0) return setError('Estoque mínimo inválido.');
    if (!isEdit && (!Number.isInteger(quantity) || quantity < 0)) return setError('Quantidade inicial inválida.');

    setSubmitting(true);
    try {
      const saved = await saveProduct(
        {
          name: form.name.trim(),
          sku: form.sku.trim(),
          description: form.description.trim() || null,
          costPrice,
          salePrice,
          minQuantity,
          categoryId: form.categoryId,
          ...(isEdit ? {} : { quantity }),
        },
        product?.id,
      );
      onSaved(saved);
      onClose();
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Nome</span>
        <input className="input" value={form.name} onChange={(e) => update('name')(e.target.value)} maxLength={120} required />
      </label>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <label className="block space-y-1">
          <span className="text-sm font-medium">SKU</span>
          <input
            className="input uppercase"
            value={form.sku}
            onChange={(e) => update('sku')(e.target.value)}
            maxLength={40}
            pattern="[A-Za-z0-9._\-]+"
            title="Letras, números, ponto, hífen e sublinhado"
            required
          />
        </label>

        <div className="space-y-1">
          <span className="text-sm font-medium">Categoria</span>
          <div className="flex gap-2">
            <select
              className="input"
              value={form.categoryId}
              onChange={(e) => update('categoryId')(e.target.value)}
              required
            >
              <option value="">Selecione...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              className="btn-secondary px-3"
              onClick={() => setShowNewCategory((v) => !v)}
              aria-label="Nova categoria"
              title="Nova categoria"
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showNewCategory && (
        <div className="flex gap-2 rounded-lg bg-slate-50 p-3">
          <input
            className="input"
            placeholder="Nome da nova categoria (ex.: Booster)"
            value={newCategory}
            onChange={(e) => setNewCategory(e.target.value)}
            maxLength={60}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                void handleCreateCategory();
              }
            }}
          />
          <button type="button" className="btn-primary" onClick={() => void handleCreateCategory()} disabled={creatingCategory}>
            {creatingCategory && <Loader2 className="h-4 w-4 animate-spin" />}
            Criar
          </button>
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Descrição (opcional)</span>
        <textarea
          className="input min-h-[72px]"
          value={form.description}
          onChange={(e) => update('description')(e.target.value)}
          maxLength={500}
        />
      </label>

      <div className="grid grid-cols-2 gap-4">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Preço de custo (R$)</span>
          <input
            className="input"
            inputMode="decimal"
            value={form.costPrice}
            onChange={(e) => update('costPrice')(e.target.value)}
            placeholder="0,00"
            required
          />
        </label>
        <label className="block space-y-1">
          <span className="text-sm font-medium">Preço de venda (R$)</span>
          <input
            className="input"
            inputMode="decimal"
            value={form.salePrice}
            onChange={(e) => update('salePrice')(e.target.value)}
            placeholder="0,00"
            required
          />
        </label>
      </div>

      <div className="grid grid-cols-2 gap-4">
        {!isEdit && (
          <label className="block space-y-1">
            <span className="text-sm font-medium">Quantidade inicial</span>
            <input
              className="input"
              type="number"
              min={0}
              step={1}
              value={form.quantity}
              onChange={(e) => update('quantity')(e.target.value)}
              required
            />
          </label>
        )}
        <label className="block space-y-1">
          <span className="text-sm font-medium">Estoque mínimo</span>
          <input
            className="input"
            type="number"
            min={0}
            step={1}
            value={form.minQuantity}
            onChange={(e) => update('minQuantity')(e.target.value)}
            required
          />
        </label>
      </div>

      {isEdit && (
        <p className="text-xs text-slate-500">
          O saldo atual ({product.quantity}) só muda por movimentações de entrada e saída.
        </p>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <button type="button" className="btn-secondary" onClick={onClose}>
          Cancelar
        </button>
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Salvar
        </button>
      </div>
    </form>
  );
}
