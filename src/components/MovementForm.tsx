import { useState, type FormEvent } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Loader2 } from 'lucide-react';
import { createMovement } from '../services/api';
import type { MovementType, Product, StockMovement } from '../types';
import { cn, formatNumber, getErrorMessage } from '../lib/utils';

interface MovementFormProps {
  products: Product[];
  initialProductId?: string;
  onSaved: (movement: StockMovement) => void;
  onCancel?: () => void;
}

export default function MovementForm({ products, initialProductId, onSaved, onCancel }: MovementFormProps) {
  const [productId, setProductId] = useState(initialProductId ?? '');
  const [type, setType] = useState<MovementType>('IN');
  const [quantity, setQuantity] = useState('1');
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = products.find((p) => p.id === productId);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    const qty = Number(quantity);
    if (!productId) return setError('Selecione um produto.');
    if (!Number.isInteger(qty) || qty <= 0) return setError('Quantidade deve ser um número inteiro maior que zero.');
    if (type === 'OUT' && selected && qty > selected.quantity) {
      return setError(`Saldo insuficiente. Disponível: ${formatNumber(selected.quantity)}.`);
    }

    setSubmitting(true);
    try {
      const movement = await createMovement({ productId, type, quantity: qty, reason: reason.trim() || null });
      setQuantity('1');
      setReason('');
      onSaved(movement);
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
        <span className="text-sm font-medium">Produto</span>
        <select className="input" value={productId} onChange={(e) => setProductId(e.target.value)} required>
          <option value="">Selecione...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku}) - saldo {formatNumber(p.quantity)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-2 gap-2">
        {(['IN', 'OUT'] as const).map((option) => {
          const isIn = option === 'IN';
          const Icon = isIn ? ArrowDownCircle : ArrowUpCircle;
          return (
            <button
              key={option}
              type="button"
              onClick={() => setType(option)}
              className={cn(
                'btn border',
                type === option
                  ? isIn
                    ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                    : 'border-red-500 bg-red-50 text-red-700'
                  : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
              )}
            >
              <Icon className="h-4 w-4" /> {isIn ? 'Entrada' : 'Saída'}
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <label className="block space-y-1">
          <span className="text-sm font-medium">Quantidade</span>
          <input
            className="input"
            type="number"
            min={1}
            step={1}
            max={1000000}
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
            required
          />
        </label>
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-sm font-medium">Motivo (opcional)</span>
          <input
            className="input"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            maxLength={200}
            placeholder={type === 'IN' ? 'Ex.: compra de fornecedor' : 'Ex.: venda balcão'}
          />
        </label>
      </div>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          Registrar {type === 'IN' ? 'entrada' : 'saída'}
        </button>
      </div>
    </form>
  );
}
