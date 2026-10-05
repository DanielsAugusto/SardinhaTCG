import { useCallback, useEffect, useState, type ComponentType } from 'react';
import { AlertTriangle, Boxes, DollarSign, Loader2, Package, PackageX, RefreshCw, TrendingUp } from 'lucide-react';
import { Link } from 'react-router-dom';
import StockBadge from '../components/StockBadge';
import { getDashboard } from '../services/api';
import type { DashboardData } from '../types';
import { cn, formatCurrency, formatNumber, getErrorMessage } from '../lib/utils';

interface MetricCardProps {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone?: 'default' | 'warning' | 'danger' | 'success';
}

const TONES = {
  default: 'bg-sky-100 text-sky-700',
  success: 'bg-emerald-100 text-emerald-700',
  warning: 'bg-amber-100 text-amber-700',
  danger: 'bg-red-100 text-red-700',
};

function MetricCard({ label, value, icon: Icon, tone = 'default' }: MetricCardProps) {
  return (
    <div className="card flex items-center gap-4 p-5">
      <span className={cn('flex h-11 w-11 shrink-0 items-center justify-center rounded-xl', TONES[tone])}>
        <Icon className="h-5 w-5" />
      </span>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{label}</p>
        <p className="truncate text-xl font-semibold">{value}</p>
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      setData(await getDashboard());
    } catch (err) {
      setError(getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading && !data) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Carregando indicadores...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-500">Visão geral do estoque</p>
        <button className="btn-secondary" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={cn('h-4 w-4', loading && 'animate-spin')} /> Atualizar
        </button>
      </div>

      {error && (
        <div role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      {data && (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
            <MetricCard label="Produtos cadastrados" value={formatNumber(data.totalProducts)} icon={Package} />
            <MetricCard label="Itens em estoque" value={formatNumber(data.totalItems)} icon={Boxes} />
            <MetricCard label="Valor em estoque (custo)" value={formatCurrency(data.totalCostValue)} icon={DollarSign} tone="success" />
            <MetricCard label="Valor potencial de venda" value={formatCurrency(data.totalSaleValue)} icon={TrendingUp} tone="success" />
            <MetricCard label="Abaixo do mínimo" value={formatNumber(data.lowStockCount)} icon={AlertTriangle} tone="warning" />
            <MetricCard label="Produtos zerados" value={formatNumber(data.outOfStockCount)} icon={PackageX} tone="danger" />
          </div>

          <section className="card">
            <div className="flex items-center gap-2 border-b border-slate-200 px-5 py-4">
              <AlertTriangle className="h-4 w-4 text-amber-500" />
              <h2 className="font-semibold">Produtos críticos</h2>
            </div>

            {data.lowStockProducts.length === 0 ? (
              <p className="px-5 py-8 text-center text-sm text-slate-500">
                Nenhum produto abaixo do estoque mínimo.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
                    <tr>
                      <th className="px-5 py-3">Produto</th>
                      <th className="px-5 py-3">Categoria</th>
                      <th className="px-5 py-3 text-right">Saldo</th>
                      <th className="px-5 py-3 text-right">Mínimo</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.lowStockProducts.map((p) => (
                      <tr key={p.id}>
                        <td className="px-5 py-3">
                          <p className="font-medium">{p.name}</p>
                          <p className="text-xs text-slate-500">{p.sku}</p>
                        </td>
                        <td className="px-5 py-3">{p.category?.name}</td>
                        <td className="px-5 py-3 text-right font-semibold">{formatNumber(p.quantity)}</td>
                        <td className="px-5 py-3 text-right">{formatNumber(p.minQuantity)}</td>
                        <td className="px-5 py-3">
                          <StockBadge product={p} />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {data.lowStockCount > data.lowStockProducts.length && (
              <p className="border-t border-slate-200 px-5 py-3 text-xs text-slate-500">
                Mostrando {data.lowStockProducts.length} de {data.lowStockCount}.{' '}
                <Link to="/produtos" className="text-sky-600 hover:underline">
                  Ver todos os produtos
                </Link>
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
