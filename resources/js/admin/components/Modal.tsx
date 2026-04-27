import { useEffect, useRef, type ReactNode } from 'react';
import { X } from 'lucide-react';

const FOCUSABLE_SELECTOR =
    'button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

interface ModalProps {
    isOpen: boolean;
    onClose: () => void;
    title: string;
    subtitle?: string;
    children: ReactNode;
    footer: ReactNode;
    footerSplit?: boolean;
    size?: 'default' | 'small';
    showCloseButton?: boolean;
}

export default function Modal({
    isOpen,
    onClose,
    title,
    subtitle,
    children,
    footer,
    footerSplit = false,
    size = 'default',
    showCloseButton = true,
}: ModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null);
    const modalRef = useRef<HTMLDivElement>(null);

    // Body scroll lock
    useEffect(() => {
        if (!isOpen) return;
        document.body.classList.add('modal-open');
        return () => document.body.classList.remove('modal-open');
    }, [isOpen]);

    // ESC key handler
    useEffect(() => {
        if (!isOpen) return;
        function handleKeyDown(e: KeyboardEvent) {
            if (e.key === 'Escape') onClose();
        }
        document.addEventListener('keydown', handleKeyDown);
        return () => document.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, onClose]);

    // Focus trap + auto-restore
    // Focus trap: if no focusable elements exist (e.g., modal with only static text),
    // Tab/Shift+Tab will exit the modal. Acceptable for our use cases since every modal
    // has at least Cancel and Confirm buttons. If a no-button modal is needed later,
    // add tabindex="-1" to modalRef and focus it as fallback.
    useEffect(() => {
        if (!isOpen) return;

        const previouslyFocused = document.activeElement as HTMLElement | null;
        const modalEl = modalRef.current;
        if (!modalEl) return;

        // Focus first focusable element
        const firstFocusable = modalEl.querySelector<HTMLElement>(FOCUSABLE_SELECTOR);
        if (firstFocusable) {
            firstFocusable.focus();
        }

        function handleTabKey(e: KeyboardEvent) {
            if (e.key !== 'Tab' || !modalEl) return;

            const focusable = Array.from(modalEl.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
            if (focusable.length === 0) return;

            const first = focusable[0];
            const last = focusable[focusable.length - 1];

            if (e.shiftKey && document.activeElement === first) {
                e.preventDefault();
                last.focus();
            } else if (!e.shiftKey && document.activeElement === last) {
                e.preventDefault();
                first.focus();
            }
        }

        document.addEventListener('keydown', handleTabKey);
        return () => {
            document.removeEventListener('keydown', handleTabKey);
            previouslyFocused?.focus();
        };
    }, [isOpen]);

    if (!isOpen) return null;

    return (
        <div
            className="modal-overlay open"
            ref={overlayRef}
            onClick={(e) => { if (e.target === overlayRef.current) onClose(); }}
        >
            <div
                className={`modal ${size === 'small' ? 'modal-small' : ''}`}
                ref={modalRef}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="modal-header">
                    <div>
                        <div className="modal-title">{title}</div>
                        {subtitle && <div className="modal-subtitle">{subtitle}</div>}
                    </div>
                    {showCloseButton && (
                        <button className="modal-close" onClick={onClose} aria-label="Close">
                            <X size={16} />
                        </button>
                    )}
                </div>
                <div className="modal-body">{children}</div>
                <div className={`modal-footer ${footerSplit ? 'modal-footer-split' : ''}`}>
                    {footer}
                </div>
            </div>
        </div>
    );
}
