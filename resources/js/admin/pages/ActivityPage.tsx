import { useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import api from '@/api';

// --- Types ---

interface AgentEmbed {
    id: number;
    display_number: number;
    telegram_username: string;
    status: string;
    deleted_at: string | null;
}

interface AdminEmbed {
    id: number;
    name: string;
    email: string;
}

interface ActivityEvent {
    id: number;
    agent_id: number;
    agent: AgentEmbed | null;
    admin_id: number | null;
    admin: AdminEmbed | null;
    event_type: string;
    duration_minutes: number | null;
    ip_address: string | null;
    created_at: string;
}

interface Meta {
    current_page: number;
    last_page: number;
    per_page: number;
    total: number;
}

// --- Constants ---

const EVENT_TYPE_OPTIONS: { value: string; label: string; group: 'agent' | 'admin' | 'destructive' }[] = [
    { value: 'went_online', label: 'Went online', group: 'agent' },
    { value: 'went_offline', label: 'Went offline', group: 'agent' },
    { value: 'extended', label: 'Extended session', group: 'agent' },
    { value: 'created_by_admin', label: 'Created', group: 'admin' },
    { value: 'enabled_by_admin', label: 'Re-enabled', group: 'admin' },
    { value: 'token_regenerated', label: 'Token regenerated', group: 'admin' },
    { value: 'restored_by_admin', label: 'Restored', group: 'admin' },
    { value: 'disabled_by_admin', label: 'Disabled', group: 'destructive' },
    { value: 'deleted_by_admin', label: 'Deleted', group: 'destructive' },
];

const BADGE_LABELS: Record<string, string> = {
    went_online: 'Online',
    went_offline: 'Offline',
    extended: 'Extended',
    created_by_admin: 'Created',
    disabled_by_admin: 'Disabled',
    enabled_by_admin: 'Enabled',
    token_regenerated: 'Token',
    restored_by_admin: 'Restored',
    deleted_by_admin: 'Deleted',
};

const BADGE_CLASS: Record<string, string> = {
    went_online: 'agent',
    went_offline: 'agent',
    extended: 'agent',
    created_by_admin: 'admin',
    enabled_by_admin: 'admin',
    token_regenerated: 'admin',
    restored_by_admin: 'admin',
    disabled_by_admin: 'destructive',
    deleted_by_admin: 'destructive',
};

// --- Helpers ---

function formatTimeAgo(iso: string): string {
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

function agentLabel(agent: AgentEmbed | null): string {
    if (!agent) return 'Unknown agent';
    return `Agent ${agent.display_number} (@${agent.telegram_username})`;
}

function formatDescription(event: ActivityEvent): { text: string; isDeleted: boolean } {
    const agent = agentLabel(event.agent);
    const admin = event.admin?.name ?? 'Admin';
    const isDeleted = event.agent?.deleted_at !== null && event.agent?.deleted_at !== undefined;

    let text: string;
    switch (event.event_type) {
        case 'went_online':
            text = `${agent} went online`;
            break;
        case 'went_offline':
            text = `${agent} went offline`;
            break;
        case 'extended':
            text = event.duration_minutes
                ? `${agent} extended session (+${event.duration_minutes} min)`
                : `${agent} extended session`;
            break;
        case 'created_by_admin':
            text = `${admin} created ${agent}`;
            break;
        case 'disabled_by_admin':
            text = `${admin} disabled ${agent}`;
            break;
        case 'enabled_by_admin':
            text = `${admin} re-enabled ${agent}`;
            break;
        case 'token_regenerated':
            text = `${admin} regenerated token for ${agent}`;
            break;
        case 'restored_by_admin':
            text = `${admin} restored ${agent}`;
            break;
        case 'deleted_by_admin':
            text = `${admin} deleted ${agent}`;
            break;
        default:
            text = `${agent}: ${event.event_type}`;
    }

    return { text, isDeleted };
}

// --- Sub-components ---

function FilterBar({
    eventType,
    dateFrom,
    dateTo,
    onEventType,
    onDateFrom,
    onDateTo,
    showing,
    total,
}: {
    eventType: string;
    dateFrom: string;
    dateTo: string;
    onEventType: (v: string) => void;
    onDateFrom: (v: string) => void;
    onDateTo: (v: string) => void;
    showing: number;
    total: number;
}) {
    const agentOptions = EVENT_TYPE_OPTIONS.filter((o) => o.group === 'agent');
    const adminOptions = EVENT_TYPE_OPTIONS.filter((o) => o.group === 'admin');
    const destructiveOptions = EVENT_TYPE_OPTIONS.filter((o) => o.group === 'destructive');

    return (
        <div className="panel-head panel-head-clean">
            <div className="filter-row">
                <select className="filter-select" value={eventType} onChange={(e) => onEventType(e.target.value)}>
                    <option value="">All events</option>
                    <optgroup label="Agent actions">
                        {agentOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                    <optgroup label="Admin actions">
                        {adminOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                    <optgroup label="Destructive">
                        {destructiveOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </optgroup>
                </select>
                <input
                    type="date"
                    className="date-input"
                    value={dateFrom}
                    onChange={(e) => onDateFrom(e.target.value)}
                    placeholder="From"
                />
                <input
                    type="date"
                    className="date-input"
                    value={dateTo}
                    onChange={(e) => onDateTo(e.target.value)}
                    placeholder="To"
                />
            </div>
            <div className="results-count">
                Showing {showing} of {total}
            </div>
        </div>
    );
}

function EventRow({ event }: { event: ActivityEvent }) {
    const badgeLabel = BADGE_LABELS[event.event_type] ?? event.event_type;
    const badgeClass = BADGE_CLASS[event.event_type] ?? 'admin';
    const { text, isDeleted } = formatDescription(event);

    return (
        <tr>
            <td className="cell-time">{formatTimeAgo(event.created_at)}</td>
            <td>
                <span className={`event-badge ${badgeClass}`}>{badgeLabel}</span>
                {' '}
                <span className="event-description">
                    {text}
                    {isDeleted && <span className="deleted-tag"> (deleted)</span>}
                </span>
            </td>
            <td className="cell-time">{event.ip_address ?? '\u2014'}</td>
        </tr>
    );
}

// --- Main page ---

export default function ActivityPage() {
    const [params, setParams] = useSearchParams();
    const [events, setEvents] = useState<ActivityEvent[]>([]);
    const [meta, setMeta] = useState<Meta>({ current_page: 1, last_page: 1, per_page: 50, total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const eventType = params.get('event_type') ?? '';
    const agentId = params.get('agent_id') ?? '';
    const dateFrom = params.get('date_from') ?? '';
    const dateTo = params.get('date_to') ?? '';
    const page = parseInt(params.get('page') ?? '1', 10);

    const updateParam = useCallback((key: string, value: string, resetPage = true) => {
        setParams((prev) => {
            const next = new URLSearchParams(prev);
            if (value) {
                next.set(key, value);
            } else {
                next.delete(key);
            }
            if (resetPage) next.delete('page');
            return next;
        });
    }, [setParams]);

    // Fetch activity
    useEffect(() => {
        let cancelled = false;
        setLoading(true);
        setError(null);

        const q = new URLSearchParams();
        if (eventType) q.set('event_type[]', eventType);
        if (agentId) q.set('agent_id', agentId);
        if (dateFrom) q.set('date_from', dateFrom);
        if (dateTo) q.set('date_to', dateTo);
        if (page > 1) q.set('page', String(page));
        q.set('per_page', '50');

        api.get(`/api/admin/activity?${q}`)
            .then((res) => { if (!cancelled) { setEvents(res.data.data); setMeta(res.data.meta); } })
            .catch(() => { if (!cancelled) setError('Failed to load activity. Try refreshing.'); })
            .finally(() => { if (!cancelled) setLoading(false); });

        return () => { cancelled = true; };
    }, [eventType, agentId, dateFrom, dateTo, page]);

    const hasFilters = eventType || agentId || dateFrom || dateTo;

    // Derive agent label for filter banner from first event in response
    const filteredAgent = agentId && events.length > 0 && events[0].agent
        ? `Agent ${events[0].agent.display_number} (@${events[0].agent.telegram_username})`
        : agentId ? `Agent #${agentId}` : null;
    const clearFilters = () => setParams({});
    const goToPage = (p: number) => updateParam('page', p > 1 ? String(p) : '', false);

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Activity</h1>
                    <div className="subtitle">
                        Audit log of all agent actions
                        {meta.total > 0 && <> &middot; {meta.total} events</>}
                    </div>
                </div>
            </div>

            <div className="panel">
                <FilterBar
                    eventType={eventType} dateFrom={dateFrom} dateTo={dateTo}
                    onEventType={(v) => updateParam('event_type', v)}
                    onDateFrom={(v) => updateParam('date_from', v)}
                    onDateTo={(v) => updateParam('date_to', v)}
                    showing={events.length} total={meta.total}
                />

                {filteredAgent && (
                    <div className="filter-banner">
                        <span>Showing activity for {filteredAgent}</span>
                        <button
                            type="button"
                            className="filter-banner-clear"
                            onClick={() => updateParam('agent_id', '')}
                        >
                            Show all events
                        </button>
                    </div>
                )}

                {error && (
                    <div className="alert-pad">
                        <div className="alert alert-error">{error}</div>
                    </div>
                )}

                {loading ? (
                    <div className="empty-state">
                        <Loader2 size={28} className="loader-spin" />
                    </div>
                ) : events.length === 0 ? (
                    <div className="empty-state">
                        <div className="empty-icon">{hasFilters ? '\uD83D\uDD0D' : '\uD83D\uDCCB'}</div>
                        <h3>{hasFilters ? 'No events match your filters' : 'No activity yet'}</h3>
                        <p>{hasFilters ? 'Try adjusting your filters.' : 'Events will appear here as agents and admins take actions.'}</p>
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
                                        <th className="col-time">Time</th>
                                        <th>Event</th>
                                        <th className="col-time">IP</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {events.map((event) => (
                                        <EventRow key={event.id} event={event} />
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
        </>
    );
}
