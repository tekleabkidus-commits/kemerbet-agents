import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Copy, Check, RefreshCw, Loader2, ShieldOff, ShieldCheck, Trash2 } from 'lucide-react';
import api from '@/api';
import Modal from './Modal';
import ConfirmModal from './ConfirmModal';
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

interface EditAgentModalProps {
    agentId: number | null;
    onClose: () => void;
    onSaved: () => void;
}

// --- Inline sub-components ---

function TokenDisplay({
    tokenUrl,
    createdAt,
    lastUsedAt,
    onCopy,
    copied,
    onRegenerate,
}: {
    tokenUrl: string;
    createdAt: string | null;
    lastUsedAt: string | null;
    onCopy: () => void;
    copied: boolean;
    onRegenerate: () => void;
}) {
    return (
        <div className="token-section">
            <div className="token-row">
                <div className="token-box">{tokenUrl}</div>
            </div>
            <div className="token-meta">
                <span>Created {createdAt ? formatDate(createdAt) : '\u2014'}</span>
                <span>Last used {lastUsedAt ? formatDate(lastUsedAt) : 'never'}</span>
            </div>
            <div className="token-actions">
                <button type="button" className="btn btn-secondary btn-sm" onClick={onCopy}>
                    {copied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy link</>}
                </button>
                <button type="button" className="btn btn-warning btn-sm" onClick={onRegenerate}>
                    <RefreshCw size={12} /> Regenerate
                </button>
            </div>
        </div>
    );
}

// --- Helpers ---

function formatDate(iso: string): string {
    const d = new Date(iso);
    const month = d.toLocaleString('en-US', { month: 'short' });
    return `${month} ${d.getDate()}, ${d.getFullYear()}`;
}

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
        if (resp.status === 404) return 'Agent not found. It may have been deleted.';
    }
    return 'Something went wrong. Please try again.';
}

// --- Main component ---

export default function EditAgentModal({ agentId, onClose, onSaved }: EditAgentModalProps) {
    const navigate = useNavigate();

    // Data
    const [agent, setAgent] = useState<AgentDetail | null>(null);
    const [allMethods, setAllMethods] = useState<PaymentMethod[]>([]);

    // Form state
    const [displayNumber, setDisplayNumber] = useState(1);
    const [telegramUsername, setTelegramUsername] = useState('');
    const [notes, setNotes] = useState('');
    const [selectedMethodIds, setSelectedMethodIds] = useState<number[]>([]);

    // UI state
    const [isLoading, setIsLoading] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [confirmError, setConfirmError] = useState<string | null>(null);
    const [confirmAction, setConfirmAction] = useState<'disable' | 'enable' | 'regenerate' | 'delete' | null>(null);
    const [newTokenUrl, setNewTokenUrl] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);

    // Fetch agent + payment methods on agentId change; reset when null
    useEffect(() => {
        if (agentId === null) {
            setAgent(null);
            setDisplayNumber(1);
            setTelegramUsername('');
            setNotes('');
            setSelectedMethodIds([]);
            setAllMethods([]);
            setIsLoading(false);
            setError(null);
            setSaveError(null);
            setConfirmError(null);
            setConfirmAction(null);
            setNewTokenUrl(null);
            setCopied(false);
            return;
        }

        let cancelled = false;
        setIsLoading(true);
        setError(null);
        setSaveError(null);
        setNewTokenUrl(null);
        setCopied(false);
        setConfirmAction(null);

        Promise.all([
            api.get<{ data: AgentDetail }>(`/api/admin/agents/${agentId}`),
            api.get<{ data: PaymentMethod[] }>('/api/admin/payment-methods'),
        ])
            .then(([agentRes, methodsRes]) => {
                if (cancelled) return;
                const a = agentRes.data.data;
                setAgent(a);
                setDisplayNumber(a.display_number);
                setTelegramUsername(a.telegram_username);
                setNotes(a.notes ?? '');
                setSelectedMethodIds(a.payment_methods.map((pm) => pm.id));
                setAllMethods(methodsRes.data.data);
            })
            .catch((err) => {
                if (cancelled) return;
                setError(errorMessage(err));
            })
            .finally(() => {
                if (!cancelled) setIsLoading(false);
            });

        return () => { cancelled = true; };
    }, [agentId]);

    // --- Handlers ---

    function handleSave() {
        if (!agent) return;
        setIsSaving(true);
        setSaveError(null);

        api.put<{ data: AgentDetail }>(`/api/admin/agents/${agent.id}`, {
            display_number: displayNumber,
            telegram_username: telegramUsername,
            notes: notes || null,
            payment_method_ids: selectedMethodIds,
        })
            .then((res) => {
                setAgent(res.data.data);
                onSaved();
            })
            .catch((err) => setSaveError(errorMessage(err)))
            .finally(() => setIsSaving(false));
    }

    function handleDisable() {
        if (!agent) return;
        setIsProcessing(true);
        setConfirmError(null);

        api.post<{ data: AgentDetail }>(`/api/admin/agents/${agent.id}/disable`)
            .then((res) => {
                setAgent(res.data.data);
                setConfirmAction(null);
                onSaved();
            })
            .catch((err) => setConfirmError(errorMessage(err)))
            .finally(() => setIsProcessing(false));
    }

    function handleEnable() {
        if (!agent) return;
        setIsProcessing(true);
        setConfirmError(null);

        api.post<{ data: AgentDetail }>(`/api/admin/agents/${agent.id}/enable`)
            .then((res) => {
                setAgent(res.data.data);
                setConfirmAction(null);
                onSaved();
            })
            .catch((err) => setConfirmError(errorMessage(err)))
            .finally(() => setIsProcessing(false));
    }

    function handleRegenerateToken() {
        if (!agent) return;
        setIsProcessing(true);
        setConfirmError(null);

        api.post<{ data: AgentDetail }>(`/api/admin/agents/${agent.id}/regenerate-token`)
            .then((res) => {
                const updated = res.data.data;
                setAgent(updated);
                setConfirmAction(null);
                if (updated.active_token_url) {
                    setNewTokenUrl(updated.active_token_url);
                    setCopied(false);
                }
            })
            .catch((err) => setConfirmError(errorMessage(err)))
            .finally(() => setIsProcessing(false));
    }

    function handleDelete() {
        if (!agent) return;
        setIsProcessing(true);
        setConfirmError(null);

        api.delete(`/api/admin/agents/${agent.id}`)
            .then(() => {
                setConfirmAction(null);
                onSaved();
                onClose();
            })
            .catch((err) => setConfirmError(errorMessage(err)))
            .finally(() => setIsProcessing(false));
    }

    function handleCopyToken(url: string) {
        navigator.clipboard.writeText(url).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    }

    function handleModalClose() {
        // If token was just regenerated, fire onSaved before closing
        if (newTokenUrl) {
            onSaved();
        }
        onClose();
    }

    function toggleMethod(id: number) {
        setSelectedMethodIds((prev) =>
            prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id],
        );
    }

    const isOpen = agentId !== null;
    const title = agent ? `Edit Agent ${agent.display_number}` : 'Edit Agent';
    const subtitle = agent ? `@${agent.telegram_username}` : undefined;

    return (
        <>
            <Modal
                isOpen={isOpen}
                onClose={handleModalClose}
                title={title}
                subtitle={subtitle}
                footerSplit
                footer={
                    agent ? (
                        <>
                            <button
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => setConfirmAction('delete')}
                                disabled={isSaving}
                            >
                                <Trash2 size={13} /> Delete
                            </button>
                            <div className="modal-footer-right">
                                <button
                                    type="button"
                                    className="btn btn-secondary btn-sm"
                                    onClick={() => { onClose(); navigate(`/admin/activity?agent_id=${agent.id}`); }}
                                    disabled={isSaving}
                                >
                                    View activity
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-secondary"
                                    onClick={handleModalClose}
                                    disabled={isSaving}
                                >
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="btn btn-primary"
                                    onClick={handleSave}
                                    disabled={isSaving}
                                >
                                    {isSaving ? (
                                        <><Loader2 size={14} className="loader-spin" /> Saving…</>
                                    ) : (
                                        'Save Changes'
                                    )}
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="modal-footer-right">
                            <button type="button" className="btn btn-secondary" onClick={onClose}>
                                Close
                            </button>
                        </div>
                    )
                }
            >
                {isLoading ? (
                    <div className="empty-state">
                        <Loader2 size={28} className="loader-spin" />
                    </div>
                ) : error ? (
                    <div className="alert alert-error">{error}</div>
                ) : agent && (
                    <div className="form-grid">
                        {/* Display number */}
                        <div className="form-row">
                            <label className="form-label">
                                Display Number <span className="req">*</span> <span className="hint">order on public page</span>
                            </label>
                            <input
                                type="number"
                                min={1}
                                className="form-input"
                                value={displayNumber}
                                onChange={(e) => setDisplayNumber(parseInt(e.target.value) || 0)}
                            />
                        </div>

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
                            <label className="form-label">Payment Methods</label>
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

                        <hr className="section-divider" />

                        {/* Token section */}
                        <div className="form-row">
                            <label className="form-label">Secret Link</label>
                            {newTokenUrl ? (
                                <TokenReveal
                                    tokenUrl={newTokenUrl}
                                    telegramUsername={agent.telegram_username}
                                    onCopy={() => handleCopyToken(newTokenUrl)}
                                    copied={copied}
                                    onDismiss={() => { setNewTokenUrl(null); setCopied(false); }}
                                    warning="The old link has been revoked and the agent was taken offline. They will need to use this new link to go live again."
                                />
                            ) : agent.active_token_url ? (
                                <TokenDisplay
                                    tokenUrl={agent.active_token_url}
                                    createdAt={agent.active_token_created_at}
                                    lastUsedAt={agent.active_token_last_used_at}
                                    onCopy={() => handleCopyToken(agent.active_token_url!)}
                                    copied={copied}
                                    onRegenerate={() => setConfirmAction('regenerate')}
                                />
                            ) : (
                                <div className="panel-text">No active token.</div>
                            )}
                        </div>

                        <hr className="section-divider" />

                        {/* Disable / Enable */}
                        {agent.computed_status === 'disabled' ? (
                            <button
                                type="button"
                                className="btn btn-warning"
                                onClick={() => setConfirmAction('enable')}
                            >
                                <ShieldCheck size={14} /> Re-enable Agent
                            </button>
                        ) : (
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setConfirmAction('disable')}
                            >
                                <ShieldOff size={14} /> Disable Agent
                            </button>
                        )}

                        {/* Save error */}
                        {saveError && (
                            <div className="alert alert-error">{saveError}</div>
                        )}
                    </div>
                )}
            </Modal>

            {agent && (
                <>
                    {/* Confirm: Disable */}
                    <ConfirmModal
                        isOpen={confirmAction === 'disable'}
                        onClose={() => { setConfirmAction(null); setConfirmError(null); }}
                        onConfirm={handleDisable}
                        title="Disable Agent"
                        message={`Agent ${agent.display_number} will be hidden from the public page immediately. You can re-enable them later.`}
                        confirmLabel="Disable"
                        confirmStyle="warning"
                        isProcessing={isProcessing}
                        error={confirmError ?? undefined}
                    />

                    {/* Confirm: Enable */}
                    <ConfirmModal
                        isOpen={confirmAction === 'enable'}
                        onClose={() => { setConfirmAction(null); setConfirmError(null); }}
                        onConfirm={handleEnable}
                        title="Re-enable Agent"
                        message={`Agent ${agent.display_number} will become visible on the public page again (once they go online).`}
                        confirmLabel="Re-enable"
                        confirmStyle="warning"
                        isProcessing={isProcessing}
                        error={confirmError ?? undefined}
                    />

                    {/* Confirm: Regenerate Token */}
                    <ConfirmModal
                        isOpen={confirmAction === 'regenerate'}
                        onClose={() => { setConfirmAction(null); setConfirmError(null); }}
                        onConfirm={handleRegenerateToken}
                        title="Regenerate Token"
                        message="The current secret link will stop working immediately. A new link will be generated. The agent will also be taken offline."
                        confirmLabel="Regenerate"
                        confirmStyle="warning"
                        isProcessing={isProcessing}
                        error={confirmError ?? undefined}
                    />

                    {/* Confirm: Delete */}
                    <ConfirmModal
                        isOpen={confirmAction === 'delete'}
                        onClose={() => { setConfirmAction(null); setConfirmError(null); }}
                        onConfirm={handleDelete}
                        title="Delete Agent"
                        message={`Agent ${agent.display_number} will be removed and hidden from all views. You can restore them from the Deleted filter.`}
                        confirmLabel="Delete"
                        confirmStyle="danger"
                        isProcessing={isProcessing}
                        error={confirmError ?? undefined}
                    />
                </>
            )}
        </>
    );
}
