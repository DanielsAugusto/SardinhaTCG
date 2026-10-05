import { useCallback, useEffect, useState } from 'react';
import { ArrowLeftRight, Loader2, Pencil, Plus, Search, Trash2 } from 'lucide-react';
import MovementModal from '../components/MovementModal';
import ProductModal from '../components/ProductModal';
import StockBadge from '../components/StockBadge';
import { useDebounce } from '../hooks/useDebounce';
import { deleteProduct, getCategories, getProducts } from '../services/api';
import type { Category, Product } from '../types';
import { formatCurrency, formatNumber, getErrorMessage } from '../lib/utils';

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [search, setSearch] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const [productModalOpen, setProductModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [movementProduct, setMovementProduct] = useState<Product | null>(null);

  const debouncedSearch = useDebounce(search.trim(), 300);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setProducts(await getProducts({ search: debouncedSearch || undefined, categoryId: categoryId || undefined }));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryId]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  useEffect(() => {
    getCategories()
      .then(setCategories)
      .catch((err) => setError(getErrorMessage(err)));
  }, []);

  function flash(message: string) {
    setNotice(message);
    window.setTimeout(() => setNotice(null), 3000);
  }

  function openCreate() {
    setEditing(null);
    setProductModalOpen(true);
  }

  function openEdit(product: Product) {
    setEditing(product);
    setProductModalOpen(true);
  }

  async function handleDelete(product: Product) {
    const confirmed = window.confirm(
      `Excluir "${product.name}" (${product.sku})?\nO histórico de movimentações desse produto também será removido.`,
    );
    if (!confirmed) return;
    try {
      await deleteProduct(product.id);
      setProducts((prev) => prev.filter((p) => p.id !== product.id));
      flash('Produto excluído.');
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
        <div className="flex flex-1 flex-col gap-3 sm:flex-row">
          <div className="relative flex-1 sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="input pl-9"
              placeholder="Buscar por nome ou SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              maxLength={100}
            />
          </div>
          <select className="input sm:w-56" value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">Todas as categorias</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <button className="btn-primary" onClick={openCreate}>
          <Plus className="h-4 w-4" /> Novo produto
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}
      {notice && <div className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-700">{notice}</div>}

      <div className="card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Produto</th>
                <th className="px-4 py-3">Categoria</th>
                <th className="px-4 py-3 text-right">Custo</th>
                <th className="px-4 py-3 text-right">Venda</th>
                <th className="px-4 py-3 text-right">Saldo</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : products.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-500">
                    {debouncedSearch || categoryId ? 'Nenhum produto encontrado com esses filtros.' : 'Nenhum produto cadastrado ainda.'}
                  </td>
                </tr>
              ) : (
                products.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3">
                      <p className="font-medium">{p.name}</p>
                      <p className="text-xs text-slate-500">{p.sku}</p>
                    </td>
                    <td className="px-4 py-3">{p.category?.name}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(p.costPrice)}</td>
                    <td className="px-4 py-3 text-right">{formatCurrency(p.salePrice)}</td>
                    <td className="px-4 py-3 text-right">
                      <span className="font-semibold">{formatNumber(p.quantity)}</span>
                      <span className="text-xs text-slate-400"> / mín. {formatNumber(p.minQuantity)}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StockBadge product={p} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1">
                        <button className="icon-btn" title="Movimentar estoque" aria-label="Movimentar estoque" onClick={() => setMovementProduct(p)}>
                          <ArrowLeftRight className="h-4 w-4" />
                        </button>
                        <button className="icon-btn" title="Editar" aria-label="Editar" onClick={() => openEdit(p)}>
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          className="icon-btn hover:bg-red-50 hover:text-red-600"
                          title="Excluir"
                          aria-label="Excluir"
                          onClick={() => void handleDelete(p)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <ProductModal
        open={productModalOpen}
        product={editing}
        categories={categories}
        onClose={() => setProductModalOpen(false)}
        onCategoryCreated={(category) =>
          setCategories((prev) => [...prev, category].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR')))
        }
        onSaved={() => {
          flash(editing ? 'Produto atualizado.' : 'Produto cadastrado.');
          void loadProducts();
        }}
      />

      <MovementModal
        open={movementProduct !== null}
        products={movementProduct ? [movementProduct] : []}
        initialProductId={movementProduct?.id}
        onClose={() => setMovementProduct(null)}
        onSaved={(movement) => {
          flash(`${movement.type === 'IN' ? 'Entrada' : 'Saída'} de ${movement.quantity} registrada.`);
          void loadProducts();
        }}
      />
    </div>
  );
}
