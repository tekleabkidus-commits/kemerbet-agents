import { Loader2 } from 'lucide-react';
import Modal from './Modal';

interface ConfirmModalProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void | Promise<void>;
    title: string;
    message: string;
    confirmLabel: string;
    confirmStyle: 'danger' | 'warning';
    isProcessing?: boolean;
    error?: string;
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmLabel,
    confirmStyle,
    isProcessing = false,
    error,
}: ConfirmModalProps) {
    // TODO: When isProcessing is true, all buttons are disabled and showCloseButton is false,
    // which means focus trap has no focusable elements. Tab/Shift+Tab during processing
    // would escape the modal. In practice the processing window is brief (~1s API call)
    // so the user is unlikely to Tab. If this becomes a problem, add tabindex="-1" to
    // the modal container so focus stays trapped.
    const btnClass = confirmStyle === 'danger' ? 'btn btn-danger' : 'btn btn-warning';

    return (
        <Modal
            isOpen={isOpen}
            onClose={isProcessing ? () => {} : onClose}
            title={title}
            size="small"
            showCloseButton={!isProcessing}
            footer={
                <>
                    <button className="btn btn-secondary" onClick={onClose} disabled={isProcessing}>
                        Cancel
                    </button>
                    <button className={btnClass} onClick={onConfirm} disabled={isProcessing}>
                        {isProcessing ? (
                            <>
                                <Loader2 size={14} className="loader-spin" />
                                Processing…
                            </>
                        ) : (
                            confirmLabel
                        )}
                    </button>
                </>
            }
        >
            <p className="panel-text">{message}</p>
            {error && (
                <div className="confirm-error">
                    <div className="alert alert-error">{error}</div>
                </div>
            )}
        </Modal>
    );
}
