import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/api';
import Modal from './Modal';
import TokenReveal from './TokenReveal';

// --- Types ---

interface PaymentMethod {
    id: number;
    slug: string;
    display_name: string;
}

interface AgentDetail {
    id: number;
    display_number: number;
    telegram_username: string;
    status: string;
    computed_status: 'live' | 'offline' | 'disabled';
    live_until: string | null;
    seconds_remaining: number | null;
    last_status_change_at: string | null;
    payment_methods: PaymentMethod[];
    notes: string | null;
    active_token_url: string | null;
    active_token_created_at: string | null;
    active_token_last_used_at: string | null;
    clicks_today: number;
    clicks_total: number;
    created_at: string;
}

interface NewAgentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreated: () => void;
}

// --- Helpers ---

function errorMessage(err: unknown): string {
    if (
        typeof err === 'object' &&
        err !== null &&
        'response' in err &&
        typeof (err as Record<string, unknown>).response === 'object'
    ) {
        const resp = (err as { response: { data?: { message?: string }; status?: number } }).response;
        if (resp.data?.message) return resp.data.message;
        if (resp.status === 422) return 'Validation failed. Please check your input.';
    }
    return 'Something went wrong. Please try again.';
}

// --- Main component ---

export default function NewAgentModal({ isOpen, onClose, onCreated }: NewAgentModalProps) {
    // Form state
    const [telegramUsername, setTelegramUsername] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedMethodIds, setSelectedMethodIds] = useState<number[]>([]);

    // Data
    const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);
    const [newAgent, setNewAgent] = useState<AgentDetail | null>(null);

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [isCreating, setIsCreating] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [createError, setCreateError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Fetch payment methods when opened; reset all state when closed
    useEffect(() => {
        if (!isOpen) {
            setTelegramUsername('');
            setNotes('');
            setSelectedMethodIds([]);
            setAllMethods([]);
            setNewAgent(null);
            setIsLoading(false);
            setIsCreating(false);
            setError(null);
            setCreateError(null);
            setCopied(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);

        api.get<{ data: PaymentMethod[] }>('/api/admin/payment-methods')
            .then((res) => {
                if (!cancelled) setAllMethods(res.data.data);
            })
            .catch((err) => {
                if (!cancelled) setError(errorMessage(err));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
    }, [isOpen]);

    // --- Handlers ---

    function handleCreate() {
        setIsCreating(true);
        setCreateError(null);

        api.post<{ data: AgentDetail }>('/api/admin/agents', {
            telegram_username: telegramUsername,
            notes: notes || null,
            payment_method_ids: selectedMethodIds,
        })
            .then((res) => {
                setNewAgent(res.data.data);
            })
            .catch((err) => setCreateError(errorMessage(err)))
            .finally(() => setIsCreating(false));
    }

    function handleCopyToken(url: string) {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    function handleClose() {
        if (newAgent) {
            onCreated();
        }
        onClose();
    }

    function toggleMethod(id: number) {
        setSelectedMethodIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    // --- Render ---

    const isRevealMode = newAgent !== null;
    const title = isRevealMode ? 'Agent Created' : 'New Agent';
    const subtitle = isRevealMode ? `Agent ${newAgent.display_number}` : undefined;

    return (
        <Modal
            isOpen={isOpen}
            onClose={handleClose}
            title={title}
            subtitle={subtitle}
            footer={
                isRevealMode ? (
                    <button type="button" className="btn btn-primary" onClick={handleClose}>
                        Done
                    </button>
                ) : error ? (
                    <div className="modal-footer-right">
                        <button type="button" className="btn btn-secondary" onClick={onClose}>
                            Close
                        </button>
                    </div>
                ) : (
                    <>
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={isCreating}
                        >
                            Cancel
                        </button>
                        <button
                            type="button"
                            className="btn btn-primary"
                            onClick={handleCreate}
                            disabled={isCreating}
                        >
                            {isCreating ? (
                                <><Loader2 size={14} className="loader-spin" /> Creating…</>
                            ) : (
                                'Create Agent'
                            )}
                        </button>
                    </>
                )
            }
        >
            {isRevealMode ? (
                <TokenReveal
                    tokenUrl={newAgent.active_token_url!}
                    telegramUsername={newAgent.telegram_username}
                    onCopy={() => handleCopyToken(newAgent.active_token_url!)}
                    copied={copied}
                    onDismiss={handleClose}
                    warning="Save this link — it won't be shown again. Send it to the agent so they can go online."
                />
            ) : isLoading ? (
                <div className="empty-state">
                    <Loader2 size={28} className="loader-spin" />
                </div>
            ) : error ? (
                <div className="alert alert-error">{error}</div>
            ) : (
                <div className="form-grid">
                    {/* Telegram username */}
                    <div className="form-row">
                        <label className="form-label">
                            Telegram Username <span className="req">*</span>
                        </label>
                        <div className="input-wrap">
                            <span className="input-prefix">@</span>
                            <input
                                type="text"
                                className="form-input with-prefix"
                                value={telegramUsername}
                                onChange={(e) => setTelegramUsername(e.target.value)}
                                placeholder="username"
                            />
                        </div>
                    </div>

                    {/* Payment methods */}
                    <div className="form-row">
                        <label className="form-label">
                            Payment Methods <span className="req">*</span>
                        </label>
                        <div className="check-group">
                            {allMethods.map((pm) => {
                                const checked = selectedMethodIds.includes(pm.id);
                                return (
                                    <label
                                        key={pm.id}
                                        className={`check-card${checked ? ' checked' : ''}`}
                                    >
                                        <input
                                            type="checkbox"
                                            checked={checked}
                                            onChange={() => toggleMethod(pm.id)}
                                        />
                                        {pm.display_name}
                                    </label>
                                );
                            })}
                        </div>
                    </div>

                    {/* Notes */}
                    <div className="form-row">
                        <label className="form-label">
                            Notes <span className="hint">internal only</span>
                        </label>
                        <textarea
                            className="form-textarea"
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            placeholder="Optional notes about this agent…"
                            rows={3}
                        />
                    </div>

                    {/* Create error */}
                    {createError && (
                        <div className="alert alert-error">{createError}</div>
                    )}
                </div>
            )}
        </Modal>
    );
}
