import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/api';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';

// --- Types ---

interface PaymentMethod {
    id: number;
    slug: string;
    display_name: string;
    display_order: number;
    is_active: boolean;
    icon_url: string | null;
    agents_count: number;
}

// --- Helpers ---

function slugify(name: string): string {
    return name
        .toLowerCase()
        .replace(/[^a-z0-9 ]/g, '')
        .replace(/\s+/g, '_')
        .substring(0, 50);
}

// --- Sub-components ---

function MethodRow({
    method,
    isFirst,
    isLast,
    onMoveUp,
    onMoveDown,
    onEdit,
    onToggleActive,
    onDelete,
}: {
    method: PaymentMethod;
    isFirst: boolean;
    isLast: boolean;
    onMoveUp: () => void;
    onMoveDown: () => void;
    onEdit: () => void;
    onToggleActive: () => void;
    onDelete: () => void;
}) {
    return (
        <tr style={!method.is_active ? { opacity: 0.6 } : undefined}>
            <td>
                <div className="order-handle-wrap">
                    <button
                        className="order-arrow"
                        disabled={isFirst}
                        onClick={onMoveUp}
                        title="Move up"
                    >
                        ▲
                    </button>
                    <button
                        className="order-arrow"
                        disabled={isLast}
                        onClick={onMoveDown}
                        title="Move down"
                    >
                        ▼
                    </button>
                </div>
            </td>
            <td>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div className="method-icon">
                        {method.icon_url ? (
                            <img src={method.icon_url} alt="" style={{ width: 20, height: 20 }} />
                        ) : (
                            '💳'
                        )}
                    </div>
                    <div>
                        <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{method.display_name}</div>
                    </div>
                </div>
            </td>
            <td><code className="slug-code">{method.slug}</code></td>
            <td>
                {method.is_active ? (
                    <span className="status-pill success">Active</span>
                ) : (
                    <span className="status-pill warning">Disabled</span>
                )}
            </td>
            <td><strong>{method.agents_count} agent{method.agents_count !== 1 ? 's' : ''}</strong></td>
            <td>&mdash;</td>
            <td>
                <div className="cell-actions">
                    {!method.is_active && (
                        <button className="icon-btn" title="Re-enable" style={{ color: 'var(--green)' }} onClick={onToggleActive}>
                            ▶
                        </button>
                    )}
                    <button className="icon-btn" title="Edit" onClick={onEdit}>
                        ✎
                    </button>
                    {method.is_active && (
                        <button className="icon-btn" title="Deactivate" onClick={onToggleActive}>
                            ⏸
                        </button>
                    )}
                    <button
                        className="icon-btn danger"
                        title={method.agents_count > 0 ? 'Cannot delete: linked to agents' : 'Delete'}
                        onClick={onDelete}
                        disabled={method.agents_count > 0}
                    >
                        ×
                    </button>
                </div>
            </td>
        </tr>
    );
}

// --- Main Component ---

export default function PaymentMethodsPage() {
    const [methods, setMethods] = useState<PaymentMethod[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingMethod, setEditingMethod] = useState<PaymentMethod | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Form state
    const [formName, setFormName] = useState('');
    const [formSlug, setFormSlug] = useState('');
    const [formIconUrl, setFormIconUrl] = useState('');
    const [formActive, setFormActive] = useState(true);
    const [slugTouched, setSlugTouched] = useState(false);

    // Delete state
    const [deletingMethod, setDeletingMethod] = useState<PaymentMethod | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const fetchMethods = useCallback(() => {
        setLoading(true);
        setError(null);
        api.get('/api/admin/payment-methods?include_inactive=true')
            .then((res) => setMethods(res.data.data))
            .catch(() => setError('Failed to load payment methods'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchMethods();
    }, [fetchMethods]);

    // --- Modal handlers ---

    function openAddModal() {
        setEditingMethod(null);
        setFormName('');
        setFormSlug('');
        setFormIconUrl('');
        setFormActive(true);
        setSlugTouched(false);
        setSaveError(null);
        setModalOpen(true);
    }

    function openEditModal(method: PaymentMethod) {
        setEditingMethod(method);
        setFormName(method.display_name);
        setFormSlug(method.slug);
        setFormIconUrl(method.icon_url ?? '');
        setFormActive(method.is_active);
        setSlugTouched(true);
        setSaveError(null);
        setModalOpen(true);
    }

    function closeModal() {
        if (isSaving) return;
        setModalOpen(false);
        setEditingMethod(null);
        setSaveError(null);
    }

    async function handleSave() {
        setIsSaving(true);
        setSaveError(null);
        try {
            const data: Record<string, unknown> = {
                display_name: formName,
                slug: formSlug,
                is_active: formActive,
            };
            if (formIconUrl) data.icon_url = formIconUrl;

            if (editingMethod) {
                await api.put(`/api/admin/payment-methods/${editingMethod.id}`, data);
            } else {
                await api.post('/api/admin/payment-methods', data);
            }
            closeModal();
            fetchMethods();
        } catch (err: unknown) {
            const resp = (err as { response?: { data?: { message?: string } } }).response;
            setSaveError(resp?.data?.message ?? 'Failed to save. Please check your input.');
        } finally {
            setIsSaving(false);
        }
    }

    function handleNameChange(value: string) {
        setFormName(value);
        if (!slugTouched) {
            setFormSlug(slugify(value));
        }
    }

    // --- Toggle active ---

    async function handleToggleActive(method: PaymentMethod) {
        const newActive = !method.is_active;
        // Optimistic update
        setMethods((prev) =>
            prev.map((m) => (m.id === method.id ? { ...m, is_active: newActive } : m)),
        );
        try {
            await api.put(`/api/admin/payment-methods/${method.id}`, { is_active: newActive });
        } catch {
            // Rollback
            setMethods((prev) =>
                prev.map((m) => (m.id === method.id ? { ...m, is_active: method.is_active } : m)),
            );
        }
    }

    // --- Reorder ---

    async function handleMove(index: number, direction: -1 | 1) {
        const newIndex = index + direction;
        if (newIndex < 0 || newIndex >= methods.length) return;

        const reordered = [...methods];
        const [moved] = reordered.splice(index, 1);
        reordered.splice(newIndex, 0, moved);
        setMethods(reordered);

        try {
            await api.post('/api/admin/payment-methods/reorder', {
                ids: reordered.map((m) => m.id),
            });
        } catch {
            fetchMethods(); // Rollback by refetching
        }
    }

    // --- Delete ---

    async function handleDelete() {
        if (!deletingMethod) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await api.delete(`/api/admin/payment-methods/${deletingMethod.id}`);
            setDeletingMethod(null);
            fetchMethods();
        } catch (err: unknown) {
            const resp = (err as { response?: { data?: { message?: string } } }).response;
            setDeleteError(resp?.data?.message ?? 'Failed to delete');
        } finally {
            setIsDeleting(false);
        }
    }

    // --- Derived ---

    const activeCount = methods.filter((m) => m.is_active).length;

    // --- Render ---

    return (
        <>
            {/* Page Header */}
            <div className="page-head">
                <div>
                    <h1>Payment Methods</h1>
                    <div className="subtitle">Manage the master list of payment methods that agents can support</div>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openAddModal}>+ Add Method</button>
                </div>
            </div>

            {error && (
                <div className="dash-error" style={{ marginBottom: 20 }}>
                    <span>{error}</span>
                    <button className="btn btn-sm btn-danger" onClick={fetchMethods}>Retry</button>
                </div>
            )}

            {/* Main Panel */}
            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">
                        All Methods{' '}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '.82rem' }}>
                            &middot; {methods.length} total &middot; {activeCount} active
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="empty-state">
                        <Loader2 size={28} className="loader-spin" />
                    </div>
                ) : methods.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">&#9675;</div>
                        <h3>No payment methods</h3>
                        <p>Add a payment method to get started.</p>
                    </div>
                ) : (
                    <>
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th style={{ width: 50 }}>Order</th>
                                        <th>Method</th>
                                        <th>Slug</th>
                                        <th>Status</th>
                                        <th>Used by</th>
                                        <th>Total clicks</th>
                                        <th style={{ textAlign: 'right' }}>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {methods.map((m, i) => (
                                        <MethodRow
                                            key={m.id}
                                            method={m}
                                            isFirst={i === 0}
                                            isLast={i === methods.length - 1}
                                            onMoveUp={() => handleMove(i, -1)}
                                            onMoveDown={() => handleMove(i, 1)}
                                            onEdit={() => openEditModal(m)}
                                            onToggleActive={() => handleToggleActive(m)}
                                            onDelete={() => { setDeleteError(null); setDeletingMethod(m); }}
                                        />
                                    ))}
                                </tbody>
                            </table>
                        </div>
                        <div style={{
                            padding: '14px 18px',
                            borderTop: '1px solid var(--border)',
                            fontSize: '.78rem',
                            color: 'var(--text-dim)',
                            background: 'var(--bg-elev-1)',
                        }}>
                            &#128161; Use the ▲▼ arrows to reorder. Order controls how methods appear on agent cards.
                        </div>
                    </>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={closeModal}
                title={editingMethod ? 'Edit Payment Method' : 'Add Payment Method'}
                subtitle="Available to all agents to select"
                size="small"
                showCloseButton={!isSaving}
                footer={
                    <>
                        <button className="btn btn-secondary" onClick={closeModal} disabled={isSaving}>
                            Cancel
                        </button>
                        <button className="btn btn-primary" onClick={handleSave} disabled={isSaving}>
                            {isSaving ? (
                                <><Loader2 size={14} className="loader-spin" /> Saving&hellip;</>
                            ) : (
                                'Save'
                            )}
                        </button>
                    </>
                }
            >
                <div className="form-grid">
                    <div className="form-row">
                        <label className="form-label">
                            Display Name<span className="req">*</span>
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            value={formName}
                            onChange={(e) => handleNameChange(e.target.value)}
                            placeholder="e.g., Hibret Bank"
                        />
                        <div className="form-help">Shown on agent cards and in admin forms</div>
                    </div>

                    <div className="form-row">
                        <label className="form-label">
                            Slug<span className="req">*</span>
                            {' '}<span className="hint">lowercase, underscores only</span>
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            value={formSlug}
                            onChange={(e) => { setSlugTouched(true); setFormSlug(e.target.value); }}
                            placeholder="hibret_bank"
                            style={{ fontFamily: "'SF Mono', ui-monospace, monospace" }}
                            disabled={!!editingMethod}
                        />
                        {editingMethod && (
                            <div className="form-help">Slug cannot be changed after creation</div>
                        )}
                    </div>

                    <div className="form-row">
                        <label className="form-label">
                            Icon URL <span className="hint">optional</span>
                        </label>
                        <input
                            type="url"
                            className="form-input"
                            value={formIconUrl}
                            onChange={(e) => setFormIconUrl(e.target.value)}
                            placeholder="https://example.com/icon.png"
                        />
                    </div>

                    <div className="form-row">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '.85rem' }}>Active</div>
                                <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Available for agents to select</div>
                            </div>
                            <button
                                type="button"
                                className={`toggle ${formActive ? 'on' : ''}`}
                                onClick={() => setFormActive(!formActive)}
                                style={{
                                    width: 40,
                                    height: 22,
                                    borderRadius: 11,
                                    border: 'none',
                                    background: formActive ? 'var(--green)' : 'var(--bg-elev-2)',
                                    position: 'relative',
                                    cursor: 'pointer',
                                    transition: 'background .2s',
                                }}
                            >
                                <span style={{
                                    position: 'absolute',
                                    top: 2,
                                    left: formActive ? 20 : 2,
                                    width: 18,
                                    height: 18,
                                    borderRadius: '50%',
                                    background: '#fff',
                                    transition: 'left .2s',
                                }} />
                            </button>
                        </div>
                    </div>

                    {saveError && (
                        <div className="alert alert-error">{saveError}</div>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deletingMethod}
                onClose={() => setDeletingMethod(null)}
                onConfirm={handleDelete}
                title="Delete Payment Method"
                message={`Are you sure you want to delete "${deletingMethod?.display_name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                confirmStyle="danger"
                isProcessing={isDeleting}
                error={deleteError ?? undefined}
            />
        </>
    );
}
