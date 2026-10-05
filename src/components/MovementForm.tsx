import { useState, type FormEvent } from 'react';
import { ArrowDownCircle, ArrowUpCircle, Loader2, ShoppingCart } from 'lucide-react';
import { createMovement } from '../services/api';
import type { MovementInput, Product, StockMovement } from '../types';
import { cn, formatCurrency, formatNumber, getErrorMessage } from '../lib/utils';

type MovementKind = 'SALE' | 'IN' | 'OUT';

const KINDS: { value: MovementKind; label: string; icon: typeof ShoppingCart; active: string }[] = [
  { value: 'SALE', label: 'Venda', icon: ShoppingCart, active: 'border-sky-500 bg-sky-50 text-sky-700' },
  { value: 'IN', label: 'Entrada', icon: ArrowDownCircle, active: 'border-emerald-500 bg-emerald-50 text-emerald-700' },
  { value: 'OUT', label: 'Outra saída', icon: ArrowUpCircle, active: 'border-red-500 bg-red-50 text-red-700' },
];

const REASON_PLACEHOLDER: Record<MovementKind, string> = {
  SALE: 'Ex.: venda balcão, cliente João',
  IN: 'Ex.: compra de fornecedor',
  OUT: 'Ex.: avaria, perda, uso em evento',
};

const SUBMIT_LABEL: Record<MovementKind, string> = {
  SALE: 'Registrar venda',
  IN: 'Registrar entrada',
  OUT: 'Registrar saída',
};

interface MovementFormProps {
  products: Product[];
  initialProductId?: string;
  onSaved: (movement: StockMovement) => void;
  onCancel?: () => void;
}

const priceToInput = (product?: Product) => (product ? product.salePrice.toFixed(2).replace('.', ',') : '');
/** Aceita "1.234,56", "1234,56" e "1234.56". */
const parsePrice = (value: string) => {
  const trimmed = value.trim();
  if (!trimmed) return Number.NaN;
  return Number(trimmed.includes(',') ? trimmed.replace(/\./g, '').replace(',', '.') : trimmed);
};

export default function MovementForm({ products, initialProductId, onSaved, onCancel }: MovementFormProps) {
  const [productId, setProductId] = useState(initialProductId ?? '');
  const [kind, setKind] = useState<MovementKind>('SALE');
  const [quantity, setQuantity] = useState('1');
  const [unitPrice, setUnitPrice] = useState(() => priceToInput(products.find((p) => p.id === initialProductId)));
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const selected = products.find((p) => p.id === productId);
  const qty = Number(quantity);
  const price = parsePrice(unitPrice);
  const saleValid = kind === 'SALE' && selected && Number.isInteger(qty) && qty > 0 && Number.isFinite(price);

  function handleProductChange(id: string) {
    setProductId(id);
    setUnitPrice(priceToInput(products.find((p) => p.id === id)));
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);

    if (!productId) return setError('Selecione um produto.');
    if (!Number.isInteger(qty) || qty <= 0) return setError('Quantidade deve ser um número inteiro maior que zero.');
    if (kind !== 'IN' && selected && qty > selected.quantity) {
      return setError(`Saldo insuficiente. Disponível: ${formatNumber(selected.quantity)}.`);
    }
    if (kind === 'SALE' && (!Number.isFinite(price) || price < 0)) return setError('Preço de venda inválido.');

    const input: MovementInput = {
      productId,
      type: kind === 'IN' ? 'IN' : 'OUT',
      quantity: qty,
      reason: reason.trim() || null,
      isSale: kind === 'SALE',
      ...(kind === 'SALE' ? { unitPrice: price } : {}),
    };

    setSubmitting(true);
    try {
      const movement = await createMovement(input);
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
        <select className="input" value={productId} onChange={(e) => handleProductChange(e.target.value)} required>
          <option value="">Selecione...</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name} ({p.sku}) - saldo {formatNumber(p.quantity)}
            </option>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-3 gap-2">
        {KINDS.map(({ value, label, icon: Icon, active }) => (
          <button
            key={value}
            type="button"
            onClick={() => setKind(value)}
            className={cn(
              'btn border px-2',
              kind === value ? active : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-50',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" /> {label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
        {kind === 'SALE' && (
          <label className="block space-y-1">
            <span className="text-sm font-medium">Preço unitário (R$)</span>
            <input
              className="input"
              inputMode="decimal"
              value={unitPrice}
              onChange={(e) => setUnitPrice(e.target.value)}
              placeholder="0,00"
              required
            />
          </label>
        )}
      </div>

      {saleValid && selected && (
        <div className="grid grid-cols-2 gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm">
          <span className="text-slate-500">Total da venda</span>
          <span className="text-right font-semibold">{formatCurrency(qty * price)}</span>
          <span className="text-slate-500">Lucro estimado</span>
          <span
            className={cn(
              'text-right font-semibold',
              qty * (price - selected.costPrice) >= 0 ? 'text-emerald-700' : 'text-red-700',
            )}
          >
            {formatCurrency(qty * (price - selected.costPrice))}
          </span>
        </div>
      )}

      <label className="block space-y-1">
        <span className="text-sm font-medium">Motivo / observação (opcional)</span>
        <input
          className="input"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          maxLength={200}
          placeholder={REASON_PLACEHOLDER[kind]}
        />
      </label>

      <div className="flex justify-end gap-2">
        {onCancel && (
          <button type="button" className="btn-secondary" onClick={onCancel}>
            Cancelar
          </button>
        )}
        <button type="submit" className="btn-primary" disabled={submitting}>
          {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
          {SUBMIT_LABEL[kind]}
        </button>
      </div>
    </form>
  );
}
