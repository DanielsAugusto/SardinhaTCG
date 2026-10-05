import Modal from './Modal';
import MovementForm from './MovementForm';
import type { Product, StockMovement } from '../types';

interface MovementModalProps {
  open: boolean;
  products: Product[];
  initialProductId?: string;
  onClose: () => void;
  onSaved: (movement: StockMovement) => void;
}

export default function MovementModal({ open, products, initialProductId, onClose, onSaved }: MovementModalProps) {
  return (
    <Modal open={open} title="Registrar movimentação" onClose={onClose}>
      <MovementForm
        key={initialProductId ?? 'none'}
        products={products}
        initialProductId={initialProductId}
        onCancel={onClose}
        onSaved={(movement) => {
          onSaved(movement);
          onClose();
        }}
      />
    </Modal>
  );
}
