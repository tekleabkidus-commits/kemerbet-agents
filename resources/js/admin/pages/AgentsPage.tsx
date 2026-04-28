import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Pencil, RefreshCw, Trash2, Plus, Loader2 } from 'lucide-react';
import api from '@/api';
import EditAgentModal from '@/components/EditAgentModal';
import NewAgentModal from '@/components/NewAgentModal';

// --- Types ---

interface PaymentMethod {
    id: number;
    slug: string;
    display_name: string;
}

interface Agent {
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
    clicks_today: number;
    clicks_total: number;
    created_at: string;
}

interface Meta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

// TODO: Wire to GET /api/admin/payment-methods in Phase B Task 5
const PAYMENT_METHOD_OPTIONS: { slug: string; label: string }[] = [
    { slug: 'telebirr', label: 'TeleBirr' },
    { slug: 'mpesa', label: 'M-Pesa' },
    { slug: 'cbe_birr', label: 'CBE Birr' },
    { slug: 'dashen', label: 'Dashen Bank' },
    { slug: 'awash', label: 'Awash Bank' },
    { slug: 'boa', label: 'Bank of Abyssinia' },
    { slug: 'coop', label: 'Cooperative Bank' },
    { slug: 'wegagen', label: 'Wegagen Bank' },
];

// --- Helpers ---

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function formatLastSeen(iso: string | null): string {
    if (!iso) return '\u2014';
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    const remMin = minutes % 60;
    if (hours < 24) return remMin > 0 ? `${hours}h ${remMin}m ago` : `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

// --- Sub-components ---

interface FilterBarProps {
    search: string;
    status: string;
    paymentMethod: string;
    sort: string;
    onSearch: (v: string) => void;
    onStatus: (v: string) => void;
    onPayment: (v: string) => void;
    onSort: (v: string) => void;
    showing: number;
    total: number;
}

function FilterBar({ search, status, paymentMethod, sort, onSearch, onStatus, onPayment, onSort, showing, total }: FilterBarProps) {
    return (
        <div className="panel-head panel-head-clean">
            <div className="filter-row">
                <div className="search-bar">
                    <input type="text" placeholder="Search by number, username…" value={search} onChange={(e) => onSearch(e.target.value)} />
                </div>
                <select className="filter-select" value={status} onChange={(e) => onStatus(e.target.value)}>
                    <option value="all">All status</option>
                    <option value="live">Live now</option>
                    <option value="offline">Offline</option>
                    <option value="disabled">Disabled</option>
                    <option value="deleted">Deleted</option>
                </select>
                <select className="filter-select" value={paymentMethod} onChange={(e) => onPayment(e.target.value)}>
                    <option value="">All payment methods</option>
                    {PAYMENT_METHOD_OPTIONS.map((pm) => (
                        <option key={pm.slug} value={pm.slug}>{pm.label}</option>
                    ))}
                </select>
                <select className="filter-select" value={sort} onChange={(e) => onSort(e.target.value)}>
                    <option value="number">Sort by number</option>
                    <option value="last_seen">Sort by last seen</option>
                </select>
            </div>
            <div className="results-count">
                Showing {showing} of {total}
            </div>
        </div>
    );
}

function AgentRow({ agent: a, onEdit }: { agent: Agent; onEdit: (id: number) => void }) {
    const num = pad(a.display_number);
    const extra = a.payment_methods.length - 3;
    const statusLabel = a.computed_status === 'live' ? 'Live' : a.computed_status === 'disabled' ? 'Disabled' : 'Offline';
    const t2 = 'Coming in Task 2';

    return (
        <tr>
            <td className="cell-id">{num}</td>
            <td>
                <div className={`cell-agent ${a.computed_status === 'disabled' ? 'disabled' : ''}`}>
                    <div className="avatar">{num}</div>
                    <div className="info">
                        <div className="name">Agent {a.display_number}</div>
                        <div className="username">@{a.telegram_username}</div>
                    </div>
                </div>
            </td>
            <td><span className={`status-pill ${a.computed_status}`}>{statusLabel}</span></td>
            <td>
                <div className="bank-tags">
                    {a.payment_methods.slice(0, 3).map((pm) => <span key={pm.id} className="bank-tag">{pm.display_name}</span>)}
                    {extra > 0 && <span className="bank-tag">+{extra}</span>}
                </div>
            </td>
            <td className="cell-clicks clicks-zero">
                <div className="today">{a.clicks_today}</div>
                <div className="total">{a.clicks_total.toLocaleString()} total</div>
            </td>
            <td className={`cell-time ${a.computed_status === 'live' ? 'live' : ''}`}>
                {a.computed_status === 'live' ? 'Online now' : formatLastSeen(a.last_status_change_at)}
            </td>
            <td>
                <div className="cell-actions">
                    <button className="icon-btn" onClick={() => onEdit(a.id)}><Pencil size={13} /></button>
                    <button className="icon-btn" disabled title={t2}><RefreshCw size={13} /></button>
                    <button className="icon-btn danger" disabled title={t2}><Trash2 size={13} /></button>
                </div>
            </td>
        </tr>
    );
}

// --- Main page ---

export default function AgentsPage() {
    const [params, setParams] = useSearchParams();
    const [agents, setAgents] = useState<Agent[]>([]);
    const [meta, setMeta] = useState<Meta>({ current_page: 1, last_page: 1, per_page: 20, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [editingAgentId, setEditingAgentId] = useState<number | null>(null);
    const [isNewAgentOpen, setIsNewAgentOpen] = useState(false);
    const [agentsVersion, setAgentsVersion] = useState(0);

    const search = params.get('search') ?? '';
    const status = params.get('status') ?? 'all';
    const paymentMethod = params.get('payment_method') ?? '';
    const sort = params.get('sort') ?? 'number';
    const page = parseInt(params.get('page') ?? '1', 10);

    // Debounced search: local input state that syncs to URL params after 300ms
    const [searchInput, setSearchInput] = useState(search);
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const updateParam = useCallback((key: string, value: string, resetPage = true) => {
        setParams((prev) => {
            const next = new URLSearchParams(prev);
            if (value && value !== 'all' && value !== 'number') {
                next.set(key, value);
            } else {
                next.delete(key);
            }
            if (resetPage) next.delete('page');
            return next;
        });
    }, [setParams]);

    const handleSearchChange = useCallback((value: string) => {
        setSearchInput(value);
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(() => {
            updateParam('search', value);
        }, 300);
    }, [updateParam]);

    // Sync searchInput when URL search param changes externally (e.g. back/forward)
    useEffect(() => {
        setSearchInput(search);
    }, [search]);

    // Fetch agents
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);
        const q = new URLSearchParams();
        if (search) q.set('search', search);
        if (status !== 'all') q.set('status', status);
        if (paymentMethod) q.set('payment_method', paymentMethod);
        if (sort !== 'number') q.set('sort', sort);
        if (page > 1) q.set('page', String(page));
        api.get(`/api/admin/agents?${q}`)
            .then((res) => { if (!cancelled) { setAgents(res.data.data); setMeta(res.data.meta); } })
            .catch(() => { if (!cancelled) setError('Failed to load agents. Try refreshing.'); })
            .finally(() => { if (!cancelled) setLoading(false); });
        return () => { cancelled = true; };
    }, [search, status, paymentMethod, sort, page, agentsVersion]);

    const hasFilters = search || status !== 'all' || paymentMethod || sort !== 'number';
    const clearFilters = () => { setParams({}); setSearchInput(''); };
    const goToPage = (p: number) => updateParam('page', p > 1 ? String(p) : '', false);

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Agents</h1>
                    <div className="subtitle">
                        Manage all agents, tokens, and payment methods
                        {meta.total > 0 && <> &middot; {meta.total} total</>}
                    </div>
                </div>
                <div className="page-actions">
                    <button className="btn btn-primary" onClick={() => setIsNewAgentOpen(true)}>
                        <Plus size={14} /> New Agent
                    </button>
                </div>
            </div>

            <div className="panel">
                <FilterBar
                    search={searchInput} status={status} paymentMethod={paymentMethod} sort={sort}
                    onSearch={handleSearchChange}
                    onStatus={(v) => updateParam('status', v)}
                    onPayment={(v) => updateParam('payment_method', v)}
                    onSort={(v) => updateParam('sort', v)}
                    showing={agents.length} total={meta.total}
                />

                {error && (
                    <div className="alert-pad">
                        <div className="alert alert-error">{error}</div>
                    </div>
                )}

                {loading ? (
                    <div className="empty-state">
                        <Loader2 size={28} className="loader-spin" />
                    </div>
                ) : agents.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">{hasFilters ? '\uD83D\uDD0D' : '\uD83D\uDC65'}</div>
                        <h3>{hasFilters ? 'No agents match your filters' : 'No agents yet'}</h3>
                        <p>{hasFilters ? 'Try adjusting your search or filters.' : 'Create your first agent to get started.'}</p>
                        {hasFilters && (
                            <button className="btn btn-secondary btn-sm empty-clear-btn" onClick={clearFilters}>
                                Clear filters
                            </button>
                        )}
                    </div>
                ) : (
                    <>
                        <div className="table-wrap">
                            <table className="table">
                                <thead>
                                    <tr>
                                        <th className="col-id">#</th>
                                        <th>Agent</th>
                                        <th>Status</th>
                                        <th>Payment Methods</th>
                                        <th>Today / Total</th>
                                        <th>Last Seen</th>
                                        <th className="col-actions">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {agents.map((agent) => (
                                        <AgentRow key={agent.id} agent={agent} onEdit={setEditingAgentId} />
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {meta.last_page > 1 && (
                            <div className="pagination-bar">
                                <div>Page {meta.current_page} of {meta.last_page}</div>
                                <div className="pagination-actions">
                                    <button
                                        className="btn btn-ghost btn-sm"
                                        disabled={meta.current_page <= 1}
                                        onClick={() => goToPage(meta.current_page - 1)}
                                    >
                                        &larr; Previous
                                    </button>
                                    <button
                                        className="btn btn-secondary btn-sm"
                                        disabled={meta.current_page >= meta.last_page}
                                        onClick={() => goToPage(meta.current_page + 1)}
                                    >
                                        Next &rarr;
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            <EditAgentModal
                agentId={editingAgentId}
                onClose={() => setEditingAgentId(null)}
                onSaved={() => setAgentsVersion((v) => v + 1)}
            />

            <NewAgentModal
                isOpen={isNewAgentOpen}
                onClose={() => setIsNewAgentOpen(false)}
                onCreated={() => setAgentsVersion((v) => v + 1)}
            />
        </>
    );
}
