import { useCallback, useEffect, useState } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip,
} from 'recharts';
import api from '@/api';
import { StatCard } from './DashboardPage';
import '../../../css/analytics.css';

// --- Types ---

interface Overview {
    total_visits: number;
    unique_visitors: number;
    deposit_clicks: number;
    chat_clicks: number;
    total_minutes_live: number;
    total_sessions: number;
    ctr: number;
}

interface TimelineDay {
    date: string;
    total_visits: number;
    unique_visitors: number;
    deposit_clicks: number;
    chat_clicks: number;
}

interface HeatmapBucket {
    day: number;
    hour: number;
    count: number;
}

interface PaymentMethodBreakdown {
    slug: string;
    display_name: string;
    agent_count: number;
    click_count: number;
}

interface LeaderboardAgent {
    agent_id: number;
    display_number: number | null;
    telegram_username: string | null;
    deposit_clicks: number;
    minutes_live: number;
    times_went_online: number;
    click_rate: number;
    last_seen_at: string | null;
    is_live: boolean;
}

// --- Helpers ---

const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

function fmt(d: Date): string {
    return d.toISOString().slice(0, 10);
}

function formatShortDate(iso: string): string {
    const d = new Date(iso + 'T12:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function formatRelativeTime(iso: string): string {
    const seconds = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
}

function formatHoursMinutes(minutes: number): string {
    if (!minutes || minutes <= 0) return '0h';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m}m`;
}

function formatLastSeen(iso: string | null, isLive: boolean): string {
    if (isLive) return 'Online now';
    if (!iso) return '\u2014';
    return formatRelativeTime(iso);
}

function getPreviousRange(rangeKey: string): { from: string; to: string } | null {
    if (rangeKey === 'custom') return null;
    const today = new Date();
    const days = rangeKey === '30d' ? 30 : rangeKey === '90d' ? 90 : rangeKey === 'today' ? 1 : 7;
    const to = new Date(today);
    to.setDate(to.getDate() - days);
    const from = new Date(to);
    from.setDate(from.getDate() - days + 1);
    return { from: fmt(from), to: fmt(to) };
}

function computeDelta(current: number, previous: number): { text: string; type: 'up' | 'down' | 'neutral' } {
    if (previous === 0) {
        return current > 0
            ? { text: '\u2191 new this period', type: 'up' }
            : { text: '\u2014 no data', type: 'neutral' };
    }
    const pct = Math.round(((current - previous) / previous) * 100);
    if (pct > 0) return { text: `\u2191 ${pct}%`, type: 'up' };
    if (pct < 0) return { text: `\u2193 ${Math.abs(pct)}%`, type: 'down' };
    return { text: '\u2014 same as previous', type: 'neutral' };
}

function computeCtrDelta(current: number, previous: number): { text: string; type: 'up' | 'down' | 'neutral' } {
    const diff = current - previous;
    if (Math.abs(diff) < 0.05) return { text: '\u2014 same as previous', type: 'neutral' };
    const sign = diff > 0 ? '\u2191' : '\u2193';
    return { text: `${sign} ${Math.abs(diff).toFixed(1)} pts`, type: diff > 0 ? 'up' : 'down' };
}

function buildHeatmapGrid(buckets: HeatmapBucket[]): number[][] {
    const dowToDisplay: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    buckets.forEach((b) => {
        const displayDay = dowToDisplay[b.day];
        if (displayDay !== undefined) grid[displayDay][b.hour] = b.count;
    });
    const max = Math.max(1, ...grid.flat());
    return grid.map((row) => row.map((v) => v / max));
}

// --- Chart Tooltip ---

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ dataKey: string; value: number; color: string }>; label?: string }) {
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

function formatAxisTick(v: number): string {
    return v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v);
}

// --- Sub-components ---

function HeatmapGrid({ data, days }: { data: number[][]; days: string[] }) {
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

function PaymentBar({ name, value, pct }: { name: string; value: string; pct: number }) {
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

function LeaderboardRow({ rank, num, name, tg, clicks, hours, rate, sessions, lastSeen, live }: {
    rank: number;
    num: number;
    name: string;
    tg: string;
    clicks: number;
    hours: string;
    rate: number;
    sessions: number;
    lastSeen: string;
    live: boolean;
}) {
    const rankClass = rank <= 3 ? `lb-rank lb-${rank}` : 'lb-rank';
    return (
        <tr>
            <td><div className={rankClass}>{rank}</div></td>
            <td>
                <div className="cell-agent">
                    <div className="avatar">{pad(num)}</div>
                    <div className="info">
                        <div className="name">{name}</div>
                        <div className="username">{tg}</div>
                    </div>
                </div>
            </td>
            <td className="cell-clicks"><div className="today">{clicks}</div></td>
            <td>{hours}</td>
            <td>
                <strong style={{ color: rank <= 3 ? 'var(--green)' : 'var(--text)' }}>{rate.toFixed(1)}</strong>
                {' '}<span style={{ color: 'var(--text-dim)', fontSize: '.72rem' }}>/hr</span>
            </td>
            <td>{sessions}</td>
            <td className={`cell-time${live ? ' live' : ''}`}>{lastSeen}</td>
        </tr>
    );
}

// --- Main Component ---

export default function AnalyticsPage() {
    const [range, setRange] = useState('7d');
    const [sortKey, setSortKey] = useState('deposit_clicks');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [prevOverview, setPrevOverview] = useState<Overview | null>(null);
    const [timeline, setTimeline] = useState<TimelineDay[]>([]);
    const [heatmapBuckets, setHeatmapBuckets] = useState<HeatmapBucket[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodBreakdown[]>([]);
    const [leaderboard, setLeaderboard] = useState<LeaderboardAgent[]>([]);

    const fetchAnalytics = useCallback(async (rangeKey: string, sort: string) => {
        const prev = getPreviousRange(rangeKey);
        const calls: Promise<unknown>[] = [
            api.get(`/api/admin/stats/overview?range=${rangeKey}`),
            api.get(`/api/admin/stats/timeline?range=${rangeKey}`),
            api.get(`/api/admin/stats/heatmap?range=${rangeKey}`),
            api.get(`/api/admin/stats/payment-methods?range=${rangeKey}`),
            api.get(`/api/admin/stats/leaderboard?range=${rangeKey}&sort=${sort}&limit=50`),
        ];

        if (prev) {
            calls.push(api.get(`/api/admin/stats/overview?range=custom&from=${prev.from}&to=${prev.to}`));
        }

        const results = await Promise.all(calls) as { data: { data: unknown } }[];

        setOverview(results[0].data.data as Overview);
        setTimeline(results[1].data.data as TimelineDay[]);
        setHeatmapBuckets(results[2].data.data as HeatmapBucket[]);
        setPaymentMethods(results[3].data.data as PaymentMethodBreakdown[]);
        setLeaderboard(results[4].data.data as LeaderboardAgent[]);
        setPrevOverview(results[5] ? results[5].data.data as Overview : null);
    }, []);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchAnalytics(range, sortKey)
            .catch(() => setError('Failed to load analytics'))
            .finally(() => setLoading(false));
    }, [range, sortKey, fetchAnalytics]);

    function handleRangeChange(e: React.ChangeEvent<HTMLSelectElement>) {
        const val = e.target.value;
        if (val === 'custom') {
            alert('Custom date range coming soon');
            return;
        }
        setRange(val);
    }

    function handleRetry() {
        setError(null);
        setLoading(true);
        fetchAnalytics(range, sortKey)
            .catch(() => setError('Failed to load analytics'))
            .finally(() => setLoading(false));
    }

    // --- Derived state ---
    const visitorsDelta = overview && prevOverview
        ? computeDelta(overview.total_visits, prevOverview.total_visits)
        : { text: '\u2014', type: 'neutral' as const };

    const uniqueDelta = overview && prevOverview
        ? computeDelta(overview.unique_visitors, prevOverview.unique_visitors)
        : { text: '\u2014', type: 'neutral' as const };

    const clicksDelta = overview && prevOverview
        ? computeDelta(overview.deposit_clicks, prevOverview.deposit_clicks)
        : { text: '\u2014', type: 'neutral' as const };

    const ctrDelta = overview && prevOverview
        ? computeCtrDelta(overview.ctr, prevOverview.ctr)
        : { text: '\u2014', type: 'neutral' as const };

    const chartData = timeline.map((d) => ({
        date: formatShortDate(d.date),
        visitors: d.total_visits,
        clicks: d.deposit_clicks,
    }));

    const intensityGrid = buildHeatmapGrid(heatmapBuckets);

    const maxAgentCount = Math.max(1, ...paymentMethods.map((m) => m.agent_count));

    // --- Render ---
    if (loading) {
        return <div className="dash-loading">Loading analytics...</div>;
    }

    return (
        <>
            {error && (
                <div className="dash-error">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-danger" onClick={handleRetry}>Retry</button>
                </div>
            )}

            {/* Page Header */}
            <div className="page-head">
                <div>
                    <h1>Analytics</h1>
                    <div className="subtitle">Performance metrics, trends, and agent insights</div>
                </div>
                <div className="page-actions">
                    <select className="filter-select" value={range} onChange={handleRangeChange}>
                        <option value="today">Today</option>
                        <option value="7d">Last 7 days</option>
                        <option value="30d">Last 30 days</option>
                        <option value="90d">Last 90 days</option>
                        <option value="custom">Custom range&hellip;</option>
                    </select>
                    <button className="btn btn-secondary btn-sm" onClick={() => alert('Export CSV coming soon')}>
                        Export CSV
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <StatCard
                    label="Total Visitors"
                    value={(overview?.total_visits ?? 0).toLocaleString()}
                    delta={visitorsDelta.text}
                    deltaType={visitorsDelta.type}
                    accent="gold"
                />
                <StatCard
                    label="Unique Visitors"
                    value={(overview?.unique_visitors ?? 0).toLocaleString()}
                    delta={uniqueDelta.text}
                    deltaType={uniqueDelta.type}
                    accent="blue"
                />
                <StatCard
                    label="Deposit Clicks"
                    value={(overview?.deposit_clicks ?? 0).toLocaleString()}
                    delta={clicksDelta.text}
                    deltaType={clicksDelta.type}
                />
                <StatCard
                    label="Click-Through Rate"
                    value={`${(overview?.ctr ?? 0).toFixed(1)}%`}
                    delta={ctrDelta.text}
                    deltaType={ctrDelta.type}
                />
            </div>

            {/* Trends Chart */}
            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">Traffic &amp; Clicks Over Time</div>
                    <div className="panel-actions" style={{ gap: 14 }}>
                        <div style={{ display: 'flex', gap: 14, fontSize: '.78rem', color: 'var(--text-muted)' }}>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, background: 'var(--gold)', borderRadius: 2 }} />
                                Visitors
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                <span style={{ width: 10, height: 10, background: 'var(--green)', borderRadius: 2 }} />
                                Clicks
                            </span>
                        </div>
                    </div>
                </div>
                <div className="panel-body">
                    {chartData.length === 0 ? (
                        <div className="empty-state" style={{ padding: '60px 20px' }}>
                            <div className="icon">&#9675;</div>
                            <h3>No timeline data</h3>
                            <p>Data will appear once visits are recorded.</p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={300}>
                            <AreaChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                                <defs>
                                    <linearGradient id="gradVisitors" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#f5c518" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#f5c518" stopOpacity={0} />
                                    </linearGradient>
                                    <linearGradient id="gradClicks" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="0%" stopColor="#1dd88c" stopOpacity={0.4} />
                                        <stop offset="100%" stopColor="#1dd88c" stopOpacity={0} />
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                                <XAxis
                                    dataKey="date"
                                    stroke="#6b7a8f"
                                    tick={{ fontSize: 11 }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    yAxisId="visitors"
                                    orientation="left"
                                    stroke="#f5c518"
                                    tick={{ fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={formatAxisTick}
                                />
                                <YAxis
                                    yAxisId="clicks"
                                    orientation="right"
                                    stroke="#1dd88c"
                                    tick={{ fontSize: 10 }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={formatAxisTick}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Area
                                    yAxisId="visitors"
                                    type="monotone"
                                    dataKey="visitors"
                                    stroke="#f5c518"
                                    strokeWidth={2}
                                    fill="url(#gradVisitors)"
                                    activeDot={{ r: 4 }}
                                />
                                <Area
                                    yAxisId="clicks"
                                    type="monotone"
                                    dataKey="clicks"
                                    stroke="#1dd88c"
                                    strokeWidth={2}
                                    fill="url(#gradClicks)"
                                    activeDot={{ r: 4 }}
                                />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* Two-Column: Heatmap + Payment Methods */}
            <div className="two-col">
                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">When players deposit</div>
                        <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Day &times; Hour heatmap</div>
                    </div>
                    <div className="panel-body">
                        <HeatmapGrid data={intensityGrid} days={HEATMAP_DAYS} />
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 14, fontSize: '.72rem', color: 'var(--text-muted)' }}>
                            <span>Less</span>
                            <div style={{ display: 'flex', gap: 3 }}>
                                <span className="heat-legend" style={{ background: 'rgba(0,168,107,0.08)' }} />
                                <span className="heat-legend" style={{ background: 'rgba(0,168,107,0.25)' }} />
                                <span className="heat-legend" style={{ background: 'rgba(0,168,107,0.5)' }} />
                                <span className="heat-legend" style={{ background: 'rgba(0,168,107,0.75)' }} />
                                <span className="heat-legend" style={{ background: 'rgba(0,168,107,1)' }} />
                            </div>
                            <span>More</span>
                        </div>
                        <div className="insight-callout">
                            <strong>&#128161; Insight:</strong> Peak deposit traffic hits between{' '}
                            <span className="highlight">7&ndash;10 PM weekday evenings</span>.
                            Encourage agents to be live during this window.
                        </div>
                    </div>
                </div>

                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">Payment Methods</div>
                        <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>By agent coverage</div>
                    </div>
                    <div className="panel-body">
                        <div className="bar-list">
                            {paymentMethods.length === 0 ? (
                                <div className="empty-state"><h3>No payment methods</h3></div>
                            ) : (
                                paymentMethods.map((m) => (
                                    <PaymentBar
                                        key={m.slug}
                                        name={m.display_name}
                                        value={`${m.agent_count} agents`}
                                        pct={(m.agent_count / maxAgentCount) * 100}
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Leaderboard */}
            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">Agent Leaderboard</div>
                    <div className="panel-actions">
                        <select
                            className="filter-select"
                            value={sortKey}
                            onChange={(e) => {
                                const val = e.target.value;
                                if (val === 'conversion') return;
                                setSortKey(val);
                            }}
                        >
                            <option value="deposit_clicks">Sort by: Click Count</option>
                            <option value="minutes_live">Sort by: Live Hours</option>
                            <option value="click_rate">Sort by: Click Rate (per minute live)</option>
                            <option value="conversion" disabled>Sort by: Conversion Rate (coming soon)</option>
                        </select>
                    </div>
                </div>
                {leaderboard.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">&#9675;</div>
                        <h3>No agent data for selected range</h3>
                        <p>Agent activity will appear here once data is collected.</p>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th style={{ width: 50 }}>Rank</th>
                                    <th>Agent</th>
                                    <th>Clicks ({range === 'today' ? 'today' : range})</th>
                                    <th>Live Hours</th>
                                    <th>Click Rate</th>
                                    <th>Sessions</th>
                                    <th>Last Seen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((a, i) => (
                                    <LeaderboardRow
                                        key={a.agent_id}
                                        rank={i + 1}
                                        num={a.display_number ?? 0}
                                        name={`Agent ${a.display_number ?? '?'}`}
                                        tg={`@${a.telegram_username ?? '?'}`}
                                        clicks={a.deposit_clicks}
                                        hours={formatHoursMinutes(a.minutes_live)}
                                        rate={a.click_rate * 60}
                                        sessions={a.times_went_online}
                                        lastSeen={formatLastSeen(a.last_seen_at, a.is_live)}
                                        live={a.is_live}
                                    />
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
