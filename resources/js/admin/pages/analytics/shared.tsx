import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/api';
import '../../../../css/analytics.css';

// --- Global filter contract (URL search params, shared by all pages) ---

export interface AnalyticsFilters {
    range: string; // today | 7d | 30d | 90d | custom
    from: string;
    to: string;
    agentId: string; // '' = all agents
    hourFrom: string; // '' = no hour filter
    hourTo: string;
}

export function useAnalyticsFilters() {
    const [searchParams, setSearchParams] = useSearchParams();

    const filters: AnalyticsFilters = {
        range: searchParams.get('range') ?? '7d',
        from: searchParams.get('from') ?? '',
        to: searchParams.get('to') ?? '',
        agentId: searchParams.get('agent_id') ?? '',
        hourFrom: searchParams.get('hour_from') ?? '',
        hourTo: searchParams.get('hour_to') ?? '',
    };

    const set = (updates: Record<string, string>) => {
        const next = new URLSearchParams(searchParams);
        Object.entries(updates).forEach(([key, value]) => {
            if (value === '') next.delete(key);
            else next.set(key, value);
        });
        setSearchParams(next, { replace: true });
    };

    // Date-only query for legacy endpoints (timeline, leaderboard) that
    // don't accept agent/hour filters.
    const dateParts: string[] = [];
    if (filters.range === 'custom' && filters.from && filters.to) {
        dateParts.push(`from=${filters.from}&to=${filters.to}`);
    } else {
        dateParts.push(`range=${filters.range === 'custom' ? '7d' : filters.range}`);
    }
    const dateQuery = dateParts.join('&');

    const extraParts: string[] = [];
    if (filters.agentId !== '') extraParts.push(`agent_id=${filters.agentId}`);
    if (filters.hourFrom !== '') extraParts.push(`hour_from=${filters.hourFrom}`);
    if (filters.hourTo !== '') extraParts.push(`hour_to=${filters.hourTo}`);
    const apiQuery = [dateQuery, ...extraParts].join('&');

    return {
        filters,
        set,
        apiQuery,
        dateQuery,
        agentQuery: filters.agentId !== '' ? `agent_id=${filters.agentId}` : '',
        hourFilterActive: filters.hourFrom !== '' || filters.hourTo !== '',
        agentFilterActive: filters.agentId !== '',
    };
}

// --- Filter bar ---

interface AgentOption {
    id: number;
    display_number: number;
    telegram_username: string;
}

export function AnalyticsFilterBar() {
    const { filters, set } = useAnalyticsFilters();
    const [agents, setAgents] = useState<AgentOption[]>([]);
    const [agentSearch, setAgentSearch] = useState('');
    const [dropdownOpen, setDropdownOpen] = useState(false);

    useEffect(() => {
        api.get('/api/admin/agents?per_page=100')
            .then((res) => setAgents(res.data.data))
            .catch(() => setAgents([]));
    }, []);

    const selected = agents.find((a) => String(a.id) === filters.agentId);
    const matches = agents.filter((a) =>
        `agent ${a.display_number} @${a.telegram_username}`.toLowerCase().includes(agentSearch.toLowerCase()),
    );

    const hourOptions = Array.from({ length: 24 }, (_, h) => h);

    return (
        <div className="page-actions" style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
            <select
                className="filter-select"
                value={filters.range}
                onChange={(e) => set({ range: e.target.value })}
                aria-label="Date range"
            >
                <option value="today">Today</option>
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
                <option value="custom">Custom range</option>
            </select>

            {filters.range === 'custom' && (
                <>
                    <input
                        type="date"
                        className="filter-select"
                        value={filters.from}
                        onChange={(e) => set({ from: e.target.value })}
                        aria-label="From date"
                    />
                    <input
                        type="date"
                        className="filter-select"
                        value={filters.to}
                        onChange={(e) => set({ to: e.target.value })}
                        aria-label="To date"
                    />
                </>
            )}

            <div style={{ position: 'relative' }}>
                <input
                    type="text"
                    className="filter-select"
                    placeholder="All agents"
                    aria-label="Agent filter"
                    value={dropdownOpen ? agentSearch : selected ? `Agent ${selected.display_number}` : ''}
                    onFocus={() => { setDropdownOpen(true); setAgentSearch(''); }}
                    onBlur={() => setTimeout(() => setDropdownOpen(false), 150)}
                    onChange={(e) => setAgentSearch(e.target.value)}
                />
                {dropdownOpen && (
                    <div
                        style={{
                            position: 'absolute', top: '100%', left: 0, zIndex: 30, minWidth: 180,
                            maxHeight: 240, overflowY: 'auto', background: 'var(--bg-card)',
                            border: '1px solid var(--border)', borderRadius: 8, marginTop: 4,
                        }}
                    >
                        <div
                            style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '.82rem', color: 'var(--text-muted)' }}
                            onMouseDown={() => set({ agent_id: '' })}
                        >
                            All agents
                        </div>
                        {matches.map((a) => (
                            <div
                                key={a.id}
                                style={{ padding: '8px 12px', cursor: 'pointer', fontSize: '.82rem' }}
                                onMouseDown={() => set({ agent_id: String(a.id) })}
                            >
                                Agent {a.display_number} <span style={{ color: 'var(--text-dim)' }}>@{a.telegram_username}</span>
                            </div>
                        ))}
                        {matches.length === 0 && (
                            <div style={{ padding: '8px 12px', fontSize: '.82rem', color: 'var(--text-dim)' }}>No matches</div>
                        )}
                    </div>
                )}
            </div>

            <select
                className="filter-select"
                value={filters.hourFrom}
                onChange={(e) => set({ hour_from: e.target.value })}
                aria-label="Hour from"
            >
                <option value="">From: any hour</option>
                {hourOptions.map((h) => <option key={h} value={h}>From {String(h).padStart(2, '0')}:00</option>)}
            </select>
            <select
                className="filter-select"
                value={filters.hourTo}
                onChange={(e) => set({ hour_to: e.target.value })}
                aria-label="Hour to"
            >
                <option value="">To: any hour</option>
                {hourOptions.map((h) => <option key={h} value={h}>To {String(h).padStart(2, '0')}:59</option>)}
            </select>

            {(filters.agentId !== '' || filters.hourFrom !== '' || filters.hourTo !== '' || filters.range !== '7d') && (
                <button
                    className="btn btn-secondary btn-sm"
                    onClick={() => set({ range: '', from: '', to: '', agent_id: '', hour_from: '', hour_to: '' })}
                >
                    Reset
                </button>
            )}
        </div>
    );
}

export function HourFilterHint({ active, label = 'hour filter not applied' }: { active: boolean; label?: string }) {
    if (!active) return null;
    return (
        <span style={{ fontSize: '.7rem', color: 'var(--gold)', border: '1px solid var(--gold)', borderRadius: 999, padding: '2px 8px' }}>
            {label}
        </span>
    );
}

// --- Shared visual components / helpers (from the original AnalyticsPage) ---

export const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

export function pad(n: number): string {
    return String(n).padStart(2, '0');
}

export function formatShortDate(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export function formatRelativeTime(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

export function formatHoursMinutes(minutes: number): string {
    if (!minutes || minutes <= 0) return '0h';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m}m`;
}

export function formatLastSeen(iso: string | null, isLive: boolean): string {
    if (isLive) return 'Online now';
    if (!iso) return '—';
    return formatRelativeTime(iso);
}

export function changeDelta(change: number | null): { text: string; type: 'up' | 'down' | 'neutral' } {
    if (change === null) return { text: '— no previous data', type: 'neutral' };
    if (change > 0) return { text: `↑ ${change}%`, type: 'up' };
    if (change < 0) return { text: `↓ ${Math.abs(change)}%`, type: 'down' };
    return { text: '— same as previous', type: 'neutral' };
}

export interface HeatmapBucket {
    day: number;
    hour: number;
    count: number;
}

export function buildHeatmapGrid(buckets: Array<{ day: number; hour: number; value: number }>): number[][] {
    const dowToDisplay: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    buckets.forEach((b) => {
        const displayDay = dowToDisplay[b.day];
        if (displayDay !== undefined) grid[displayDay][b.hour] = b.value;
    });
    const max = Math.max(1, ...grid.flat());
    return grid.map((row) => row.map((v) => v / max));
}

export function HeatmapGrid({ data, days }: { data: number[][]; days: string[] }) {
    const cells: React.ReactNode[] = [];

    cells.push(<div key="corner" />);
    for (let h = 0; h < 24; h++) {
        cells.push(
            h % 3 === 0
                ? <div key={`h-${h}`} className="hour-label">{h}</div>
                : <div key={`h-${h}`} />,
        );
    }

    days.forEach((day, dayIdx) => {
        cells.push(<div key={`d-${dayIdx}`} className="day-label">{day}</div>);
        for (let h = 0; h < 24; h++) {
            const v = data[dayIdx]?.[h] ?? 0;
            const opacity = v < 0.05 ? 0.04 : 0.05 + v * 0.95;
            const hourLabel = String(h).padStart(2, '0') + ':00';
            cells.push(
                <div
                    key={`c-${dayIdx}-${h}`}
                    className="heat-cell"
                    style={{ background: `rgba(0,168,107,${opacity})` }}
                    title={`${day} ${hourLabel}`}
                />,
            );
        }
    });

    return <div className="heatmap">{cells}</div>;
}

export function BreakdownBar({ name, value, pct }: { name: string; value: string; pct: number }) {
    return (
        <div className="bar-row">
            <div className="bar-label">{name}</div>
            <div className="bar-track">
                <div
                    className="bar-fill"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--green-dark), var(--green))' }}
                />
            </div>
            <div className="bar-value">{value}</div>
        </div>
    );
}

export function Sparkline({ values }: { values: number[] }) {
    if (values.length === 0) return <span style={{ color: 'var(--text-dim)' }}>&mdash;</span>;
    const max = Math.max(1, ...values);
    const points = values
        .map((v, i) => `${(i / Math.max(1, values.length - 1)) * 60},${18 - (v / max) * 16}`)
        .join(' ');
    return (
        <svg width={60} height={20} aria-hidden="true">
            <polyline points={points} fill="none" stroke="var(--green)" strokeWidth={1.5} />
        </svg>
    );
}

export function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) {
    if (!active || !payload?.length) return null;
    return (
        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: '.82rem' }}>
            <div style={{ fontWeight: 700, marginBottom: 4 }}>{label}</div>
            {payload.map((p) => (
                <div key={p.dataKey} style={{ color: p.color }}>
                    {p.dataKey === 'visitors' ? 'Visitors' : 'Clicks'}: {p.value.toLocaleString()}
                </div>
            ))}
        </div>
    );
}

export function formatAxisTick(v: number): string {
    return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);
}
