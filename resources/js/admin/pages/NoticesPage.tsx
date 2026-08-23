import { useCallback, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import api from '@/api';
import Modal from '@/components/Modal';
import ConfirmModal from '@/components/ConfirmModal';

// --- Types ---

interface Notice {
    id: number;
    title: string | null;
    body: string;
    priority: 'urgent' | 'info';
    audience: 'agent' | 'player' | 'both';
    video_url: string | null;
    is_active: boolean;
    starts_at: string | null;
    ends_at: string | null;
    send_push: boolean;
    status: 'active' | 'scheduled' | 'expired' | 'off';
    created_at: string;
}

// --- Helpers ---

function previewBody(body: string): string {
    return body.length > 90 ? `${body.slice(0, 90)}…` : body;
}

function toDatetimeLocal(iso: string | null): string {
    if (!iso) return '';
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function fromDatetimeLocal(value: string): string | null {
    return value ? `${value.replace('T', ' ')}:00` : null;
}

const STATUS_LABELS: Record<Notice['status'], string> = {
    active: 'Active',
    scheduled: 'Scheduled',
    expired: 'Expired',
    off: 'Off',
};

function StatusBadge({ status }: { status: Notice['status'] }) {
    if (status === 'scheduled') {
        return (
            <span className="status-pill" style={{ background: 'var(--gold-bg)', color: 'var(--gold)' }}>
                {STATUS_LABELS[status]}
            </span>
        );
    }
    const cls = status === 'active' ? 'live' : status === 'expired' ? 'offline' : 'disabled';
    return <span className={`status-pill ${cls}`}>{STATUS_LABELS[status]}</span>;
}

function PriorityBadge({ priority }: { priority: Notice['priority'] }) {
    if (priority === 'urgent') {
        return (
            <span className="status-pill" style={{ background: 'var(--gold-bg)', color: 'var(--gold)' }}>
                Urgent
            </span>
        );
    }
    return <span className="status-pill offline">Info</span>;
}

function ToggleSwitch({ on, onClick, title }: { on: boolean; onClick: () => void; title?: string }) {
    return (
        <button
            type="button"
            className={`toggle ${on ? 'on' : ''}`}
            onClick={onClick}
            title={title}
            style={{
                width: 40,
                height: 22,
                borderRadius: 11,
                border: 'none',
                background: on ? 'var(--green)' : 'var(--bg-elev-2)',
                position: 'relative',
                cursor: 'pointer',
                transition: 'background .2s',
            }}
        >
            <span style={{
                position: 'absolute',
                top: 2,
                left: on ? 20 : 2,
                width: 18,
                height: 18,
                borderRadius: '50%',
                background: '#fff',
                transition: 'left .2s',
            }} />
        </button>
    );
}

// --- Main Component ---

export default function NoticesPage() {
    const [notices, setNotices] = useState<Notice[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Modal state
    const [modalOpen, setModalOpen] = useState(false);
    const [editingNotice, setEditingNotice] = useState<Notice | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);

    // Form state
    const [formTitle, setFormTitle] = useState('');
    const [formBody, setFormBody] = useState('');
    const [formPriority, setFormPriority] = useState<'urgent' | 'info'>('info');
    const [formAudience, setFormAudience] = useState<'agent' | 'player' | 'both'>('agent');
    const [formVideoUrl, setFormVideoUrl] = useState('');
    const [formActive, setFormActive] = useState(true);
    const [formStartsAt, setFormStartsAt] = useState('');
    const [formEndsAt, setFormEndsAt] = useState('');
    const [formSendPush, setFormSendPush] = useState(false);

    // Delete state
    const [deletingNotice, setDeletingNotice] = useState<Notice | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [deleteError, setDeleteError] = useState<string | null>(null);

    const fetchNotices = useCallback(() => {
        setLoading(true);
        setError(null);
        api.get('/api/admin/notices?per_page=100')
            .then((res) => setNotices(res.data.data))
            .catch(() => setError('Failed to load notices'))
            .finally(() => setLoading(false));
    }, []);

    useEffect(() => {
        fetchNotices();
    }, [fetchNotices]);

    // --- Modal handlers ---

    function openAddModal() {
        setEditingNotice(null);
        setFormTitle('');
        setFormBody('');
        setFormPriority('info');
        setFormAudience('agent');
        setFormVideoUrl('');
        setFormActive(true);
        setFormStartsAt('');
        setFormEndsAt('');
        setFormSendPush(false);
        setSaveError(null);
        setModalOpen(true);
    }

    function openEditModal(notice: Notice) {
        setEditingNotice(notice);
        setFormTitle(notice.title ?? '');
        setFormBody(notice.body);
        setFormPriority(notice.priority);
        setFormAudience(notice.audience ?? 'agent');
        setFormVideoUrl(notice.video_url ?? '');
        setFormActive(notice.is_active);
        setFormStartsAt(toDatetimeLocal(notice.starts_at));
        setFormEndsAt(toDatetimeLocal(notice.ends_at));
        setFormSendPush(false);
        setSaveError(null);
        setModalOpen(true);
    }

    function closeModal() {
        if (isSaving) return;
        setModalOpen(false);
        setEditingNotice(null);
        setSaveError(null);
    }

    async function handleSave() {
        setIsSaving(true);
        setSaveError(null);
        try {
            const data: Record<string, unknown> = {
                title: formTitle || null,
                body: formBody,
                priority: formPriority,
                audience: formAudience,
                video_url: formVideoUrl.trim() || null,
                is_active: formActive,
                starts_at: fromDatetimeLocal(formStartsAt),
                ends_at: fromDatetimeLocal(formEndsAt),
            };

            if (editingNotice) {
                await api.put(`/api/admin/notices/${editingNotice.id}`, data);
            } else {
                data.send_push = formSendPush;
                await api.post('/api/admin/notices', data);
            }
            closeModal();
            fetchNotices();
        } catch (err: unknown) {
            const resp = (err as { response?: { data?: { message?: string } } }).response;
            setSaveError(resp?.data?.message ?? 'Failed to save. Please check your input.');
        } finally {
            setIsSaving(false);
        }
    }

    // --- Toggle active ---

    async function handleToggle(notice: Notice) {
        // Optimistic update
        setNotices((prev) =>
            prev.map((n) => (n.id === notice.id ? { ...n, is_active: !notice.is_active } : n)),
        );
        try {
            const res = await api.post(`/api/admin/notices/${notice.id}/toggle`);
            setNotices((prev) =>
                prev.map((n) => (n.id === notice.id ? res.data.data : n)),
            );
        } catch {
            // Rollback
            setNotices((prev) =>
                prev.map((n) => (n.id === notice.id ? notice : n)),
            );
        }
    }

    // --- Delete ---

    async function handleDelete() {
        if (!deletingNotice) return;
        setIsDeleting(true);
        setDeleteError(null);
        try {
            await api.delete(`/api/admin/notices/${deletingNotice.id}`);
            setDeletingNotice(null);
            fetchNotices();
        } catch (err: unknown) {
            const resp = (err as { response?: { data?: { message?: string } } }).response;
            setDeleteError(resp?.data?.message ?? 'Failed to delete');
        } finally {
            setIsDeleting(false);
        }
    }

    // --- Derived ---

    const activeCount = notices.filter((n) => n.status === 'active').length;

    // --- Render ---

    return (
        <>
            {/* Page Header */}
            <div className="page-head">
                <div>
                    <h1>Notices</h1>
                    <div className="subtitle">Post announcements to the agent portal notice board</div>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={openAddModal}>+ New Notice</button>
                </div>
            </div>

            {error && (
                <div className="dash-error" style={{ marginBottom: 20 }}>
                    <span>{error}</span>
                    <button className="btn btn-sm btn-danger" onClick={fetchNotices}>Retry</button>
                </div>
            )}

            {/* Main Panel */}
            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">
                        All Notices{' '}
                        <span style={{ color: 'var(--text-muted)', fontWeight: 600, fontSize: '.82rem' }}>
                            &middot; {notices.length} total &middot; {activeCount} live now
                        </span>
                    </div>
                </div>

                {loading ? (
                    <div className="empty-state">
                        <Loader2 size={28} className="loader-spin" />
                    </div>
                ) : notices.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">&#128227;</div>
                        <h3>No notices</h3>
                        <p>Post a notice to show it on every agent's portal page.</p>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Notice</th>
                                    <th>Priority</th>
                                    <th>Status</th>
                                    <th>Enabled</th>
                                    <th style={{ textAlign: 'right' }}>Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {notices.map((n) => (
                                    <tr key={n.id} style={n.status !== 'active' ? { opacity: 0.7 } : undefined}>
                                        <td>
                                            {n.title && (
                                                <div style={{ fontWeight: 700, fontSize: '.9rem' }}>{n.title}</div>
                                            )}
                                            <div style={{ color: 'var(--text-muted)', fontSize: '.82rem' }}>
                                                {previewBody(n.body)}
                                            </div>
                                        </td>
                                        <td><PriorityBadge priority={n.priority} /></td>
                                        <td><StatusBadge status={n.status} /></td>
                                        <td>
                                            <ToggleSwitch
                                                on={n.is_active}
                                                onClick={() => handleToggle(n)}
                                                title={n.is_active ? 'Turn off' : 'Turn on'}
                                            />
                                        </td>
                                        <td>
                                            <div className="cell-actions">
                                                <button className="icon-btn" title="Edit" onClick={() => openEditModal(n)}>
                                                    ✎
                                                </button>
                                                <button
                                                    className="icon-btn danger"
                                                    title="Delete"
                                                    onClick={() => { setDeleteError(null); setDeletingNotice(n); }}
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal
                isOpen={modalOpen}
                onClose={closeModal}
                title={editingNotice ? 'Edit Notice' : 'New Notice'}
                subtitle="Shown on every agent's portal page"
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
                            Message<span className="req">*</span>
                        </label>
                        <textarea
                            className="form-textarea"
                            value={formBody}
                            onChange={(e) => setFormBody(e.target.value)}
                            maxLength={1000}
                            rows={4}
                            placeholder="What should agents know?"
                        />
                    </div>

                    <div className="form-row">
                        <label className="form-label">
                            Title <span className="hint">optional</span>
                        </label>
                        <input
                            type="text"
                            className="form-input"
                            value={formTitle}
                            onChange={(e) => setFormTitle(e.target.value)}
                            placeholder="e.g., Payout schedule change"
                        />
                    </div>

                    <div className="form-row">
                        <label className="form-label">Priority</label>
                        <select
                            className="form-select"
                            value={formPriority}
                            onChange={(e) => setFormPriority(e.target.value as 'urgent' | 'info')}
                        >
                            <option value="info">Info</option>
                            <option value="urgent">Urgent</option>
                        </select>
                    </div>

                    <div className="form-row">
                        <label className="form-label">
                            Audience <span className="hint">who sees this notice</span>
                        </label>
                        <select
                            className="form-select"
                            value={formAudience}
                            onChange={(e) => setFormAudience(e.target.value as 'agent' | 'player' | 'both')}
                        >
                            <option value="agent">Agents (secret page)</option>
                            <option value="player">Players (public widget)</option>
                            <option value="both">Both</option>
                        </select>
                    </div>

                    {(formAudience === 'player' || formAudience === 'both') && (
                        <div className="form-row">
                            <label className="form-label">
                                Video URL <span className="hint">optional YouTube link shown in the player notice</span>
                            </label>
                            <input
                                type="text"
                                className="form-input"
                                value={formVideoUrl}
                                onChange={(e) => setFormVideoUrl(e.target.value)}
                                placeholder="https://www.youtube.com/watch?v=..."
                            />
                        </div>
                    )}

                    <div className="form-row">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '4px 0' }}>
                            <div>
                                <div style={{ fontWeight: 700, fontSize: '.85rem' }}>Active</div>
                                <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Visible to agents (within schedule)</div>
                            </div>
                            <ToggleSwitch on={formActive} onClick={() => setFormActive(!formActive)} />
                        </div>
                    </div>

                    <div className="form-row">
                        <label className="form-label">
                            Show from <span className="hint">optional</span>
                        </label>
                        <input
                            type="datetime-local"
                            className="form-input"
                            value={formStartsAt}
                            onChange={(e) => setFormStartsAt(e.target.value)}
                        />
                    </div>

                    <div className="form-row">
                        <label className="form-label">
                            Show until <span className="hint">optional</span>
                        </label>
                        <input
                            type="datetime-local"
                            className="form-input"
                            value={formEndsAt}
                            onChange={(e) => setFormEndsAt(e.target.value)}
                        />
                    </div>

                    {!editingNotice && (
                        <div className="form-row">
                            <label style={{ display: 'flex', alignItems: 'center', gap: 8, cursor: 'pointer', fontSize: '.85rem', fontWeight: 700 }}>
                                <input
                                    type="checkbox"
                                    checked={formSendPush}
                                    onChange={(e) => setFormSendPush(e.target.checked)}
                                />
                                Send push notification to agents
                            </label>
                            <div className="form-help">Sends immediately to all subscribed agents</div>
                        </div>
                    )}

                    {saveError && (
                        <div className="alert alert-error">{saveError}</div>
                    )}
                </div>
            </Modal>

            {/* Delete Confirmation */}
            <ConfirmModal
                isOpen={!!deletingNotice}
                onClose={() => setDeletingNotice(null)}
                onConfirm={handleDelete}
                title="Delete Notice"
                message="Are you sure you want to delete this notice? Agents will stop seeing it immediately."
                confirmLabel="Delete"
                confirmStyle="danger"
                isProcessing={isDeleting}
                error={deleteError ?? undefined}
            />
        </>
    );
}
