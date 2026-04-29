import { useEffect } from 'react';

interface Props {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  title: string;
  description: string;
  cancelLabel: string;
  confirmLabel: string;
}

export default function BottomSheetModal({
  open,
  onClose,
  onConfirm,
  title,
  description,
  cancelLabel,
  confirmLabel,
}: Props) {
  useEffect(() => {
    if (!open) return;

    // Lock body scroll while modal is open
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handler);

    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('keydown', handler);
    };
  }, [open, onClose]);

  return (
    <div
      className={`modal-backdrop${open ? ' show' : ''}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-handle"></div>
        <h2>{title}</h2>
        <p>{description}</p>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>
            {cancelLabel}
          </button>
          <button className="modal-btn confirm" onClick={onConfirm}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
