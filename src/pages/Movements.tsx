import { useCallback, useEffect, useState } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Loader2, ShoppingCart } from 'lucide-react';
import MovementForm from '../components/MovementForm';
import { getMovements, getProducts } from '../services/api';
import type { Product, StockMovement } from '../types';
import { describeMovement, formatCurrency, formatDateTime, formatNumber, getErrorMessage } from '../lib/utils';

export default function Movements() {
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filterProductId, setFilterProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadMovements = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setMovements(await getMovements(filterProductId || undefined));
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, [filterProductId]);

  const loadProducts = useCallback(async () => {
    try {
      setProducts(await getProducts());
    } catch (err) {
      setError(getErrorMessage(err));
    }
  }, []);

  useEffect(() => {
    void loadMovements();
  }, [loadMovements]);

  useEffect(() => {
    void loadProducts();
  }, [loadProducts]);

  function handleSaved(movement: StockMovement) {
    setNotice(`${describeMovement(movement)} registrada para ${movement.product?.name ?? 'o produto'}.`);
    window.setTimeout(() => setNotice(null), 3000);
    void loadMovements();
    void loadProducts();
  }

  return (
    <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
      <section className="card h-fit p-5 xl:col-span-1">
        <h2 className="mb-4 font-semibold">Nova movimentação</h2>
        {products.length === 0 && !loading ? (
          <p className="text-sm text-slate-500">Cadastre um produto antes de registrar movimentações.</p>
        ) : (
          <MovementForm products={products} onSaved={handleSaved} />
        )}
        {notice && <div className="mt-4 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</div>}
      </section>

      <section className="card overflow-hidden xl:col-span-2">
        <div className="flex flex-col gap-3 border-b border-slate-200 px-5 py-4 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="font-semibold">Histórico</h2>
          <select className="input sm:w-72" value={filterProductId} onChange={(e) => setFilterProductId(e.target.value)}>
            <option value="">Todos os produtos</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.sku})
              </option>
            ))}
          </select>
        </div>

        {error && (
          <div role="alert" className="mx-5 mt-4 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Data</th>
                <th className="px-5 py-3">Produto</th>
                <th className="px-5 py-3">Tipo</th>
                <th className="px-5 py-3 text-right">Qtd.</th>
                <th className="px-5 py-3 text-right">Valor</th>
                <th className="px-5 py-3">Motivo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading && movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-5 py-10 text-center text-slate-500">
                    Nenhuma movimentação registrada.
                  </td>
                </tr>
              ) : (
                movements.map((m) => (
                  <tr key={m.id}>
                    <td className="whitespace-nowrap px-5 py-3 text-slate-500">{formatDateTime(m.createdAt)}</td>
                    <td className="px-5 py-3">
                      <p className="font-medium">{m.product?.name}</p>
                      <p className="text-xs text-slate-500">{m.product?.sku}</p>
                    </td>
                    <td className="px-5 py-3">
                      {m.type === 'IN' ? (
                        <span className="inline-flex items-center gap-1 text-emerald-700">
                          <ArrowDownCircle className="h-4 w-4" /> Entrada
                        </span>
                      ) : m.isSale ? (
                        <span className="inline-flex items-center gap-1 text-sky-700">
                          <ShoppingCart className="h-4 w-4" /> Venda
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-red-700">
                          <ArrowUpCircle className="h-4 w-4" /> Saída
                        </span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-right font-semibold">{formatNumber(m.quantity)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-right">
                      {m.isSale && m.unitPrice !== null ? (
                        <>
                          <p className="font-medium">{formatCurrency(m.unitPrice * m.quantity)}</p>
                          {m.unitCost !== null && (
                            <p className="text-xs text-emerald-700">
                              lucro {formatCurrency((m.unitPrice - m.unitCost) * m.quantity)}
                            </p>
                          )}
                        </>
                      ) : (
                        <span className="text-slate-400">-</span>
                      )}
                    </td>
                    <td className="px-5 py-3 text-slate-600">{m.reason ?? '-'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
