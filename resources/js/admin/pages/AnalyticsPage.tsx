import { useCallback, useEffect, useState } from 'react';
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

// --- Leaderboard (hardcoded — F5D wires to real API) ---

const SAMPLE_LEADERBOARD = [
    { rank: 1, num: 3, name: 'Agent 3', tg: '@yehoneagent', clicks: 187, hours: '34h 12m', rate: 5.5, sessions: 21, lastSeen: 'Online now', live: true },
    { rank: 2, num: 7, name: 'Agent 7', tg: '@DOITFAST21', clicks: 142, hours: '28h 47m', rate: 4.9, sessions: 18, lastSeen: 'Online now', live: true },
    { rank: 3, num: 14, name: 'Agent 14', tg: '@tewodros_ab', clicks: 98, hours: '21h 5m', rate: 4.6, sessions: 14, lastSeen: 'Online now', live: true },
    { rank: 4, num: 4, name: 'Agent 4', tg: '@kemeragent_4', clicks: 76, hours: '18h 33m', rate: 4.1, sessions: 12, lastSeen: '12m ago', live: false },
    { rank: 5, num: 22, name: 'Agent 22', tg: '@obina_t', clicks: 68, hours: '15h 18m', rate: 4.4, sessions: 9, lastSeen: 'Online now', live: true },
    { rank: 6, num: 11, name: 'Agent 11', tg: '@balem18', clicks: 52, hours: '12h 4m', rate: 4.3, sessions: 8, lastSeen: 'Online now', live: true },
    { rank: 7, num: 19, name: 'Agent 19', tg: '@kemerdepositagent', clicks: 41, hours: '9h 42m', rate: 4.2, sessions: 6, lastSeen: 'Online now', live: true },
    { rank: 8, num: 12, name: 'Agent 12', tg: '@obina_t', clicks: 38, hours: '11h 17m', rate: 3.4, sessions: 9, lastSeen: '44m ago', live: false },
];

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
    // Postgres DOW: 0=Sun, 1=Mon, ..., 6=Sat → Display: 0=Mon, ..., 6=Sun
    const dowToDisplay: Record<number, number> = { 1: 0, 2: 1, 3: 2, 4: 3, 5: 4, 6: 5, 0: 6 };
    const grid: number[][] = Array.from({ length: 7 }, () => Array(24).fill(0));
    buckets.forEach((b) => {
        const displayDay = dowToDisplay[b.day];
        if (displayDay !== undefined) grid[displayDay][b.hour] = b.count;
    });
    const max = Math.max(1, ...grid.flat());
    return grid.map((row) => row.map((v) => v / max));
}

// --- SVG Chart Builder ---

function buildTrendsSvg(days: string[], visitors: number[], clicks: number[]): string {
    if (days.length === 0) return '';

    const w = 960, h = 220, padL = 50, padR = 12, padT = 16, padB = 28;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const maxV = Math.max(1, ...visitors) * 1.2;
    const maxC = Math.max(1, ...clicks) * 1.2;
    const xStep = days.length > 1 ? innerW / (days.length - 1) : innerW;
    const xs = (i: number) => padL + i * xStep;
    const yV = (v: number) => padT + innerH - (v / maxV) * innerH;
    const yC = (v: number) => padT + innerH - (v / maxC) * innerH;

    const linePath = (data: number[], mapY: (v: number) => number) =>
        data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${mapY(v)}`).join(' ');

    const areaPath = (data: number[], mapY: (v: number) => number) => {
        const top = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${mapY(v)}`).join(' ');
        return `${top} L ${xs(data.length - 1)} ${padT + innerH} L ${xs(0)} ${padT + innerH} Z`;
    };

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map((p) => {
        const y = padT + innerH * (1 - p);
        return `<line x1="${padL}" x2="${w - padR}" y1="${y}" y2="${y}"/>
                <text x="${padL - 8}" y="${y + 3}" text-anchor="end">${Math.round(maxV * p).toLocaleString()}</text>`;
    }).join('');

    const vDots = visitors.map((v, i) =>
        `<circle class="chart-dot" cx="${xs(i)}" cy="${yV(v)}" r="3.5" fill="var(--gold)"><title>${days[i]}: ${v.toLocaleString()} visitors</title></circle>`,
    ).join('');

    const cDots = clicks.map((v, i) =>
        `<circle class="chart-dot" cx="${xs(i)}" cy="${yC(v)}" r="3.5" fill="var(--green)"><title>${days[i]}: ${v.toLocaleString()} clicks</title></circle>`,
    ).join('');

    return `<svg viewBox="0 0 ${w} ${h}" preserveAspectRatio="none">
      <defs>
        <linearGradient id="gradGold" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--gold)" stop-opacity=".4"/>
          <stop offset="100%" stop-color="var(--gold)" stop-opacity="0"/>
        </linearGradient>
        <linearGradient id="gradGreen" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stop-color="var(--green)" stop-opacity=".4"/>
          <stop offset="100%" stop-color="var(--green)" stop-opacity="0"/>
        </linearGradient>
      </defs>
      <g class="chart-grid chart-axis">${gridLines}</g>
      <path class="chart-area-visitors" d="${areaPath(visitors, yV)}"/>
      <path class="chart-area-clicks" d="${areaPath(clicks, yC)}"/>
      <path class="chart-line-visitors" d="${linePath(visitors, yV)}"/>
      <path class="chart-line-clicks" d="${linePath(clicks, yC)}"/>
      ${vDots}
      ${cDots}
    </svg>`;
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
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [prevOverview, setPrevOverview] = useState<Overview | null>(null);
    const [timeline, setTimeline] = useState<TimelineDay[]>([]);
    const [heatmapBuckets, setHeatmapBuckets] = useState<HeatmapBucket[]>([]);
    const [paymentMethods, setPaymentMethods] = useState<PaymentMethodBreakdown[]>([]);

    const fetchAnalytics = useCallback(async (rangeKey: string) => {
        const prev = getPreviousRange(rangeKey);
        const calls: Promise<unknown>[] = [
            api.get(`/api/admin/stats/overview?range=${rangeKey}`),
            api.get(`/api/admin/stats/timeline?range=${rangeKey}`),
            api.get(`/api/admin/stats/heatmap?range=${rangeKey}`),
            api.get(`/api/admin/stats/payment-methods?range=${rangeKey}`),
        ];

        if (prev) {
            calls.push(api.get(`/api/admin/stats/overview?range=custom&from=${prev.from}&to=${prev.to}`));
        }

        const results = await Promise.all(calls) as { data: { data: unknown } }[];

        setOverview(results[0].data.data as Overview);
        setTimeline(results[1].data.data as TimelineDay[]);
        setHeatmapBuckets(results[2].data.data as HeatmapBucket[]);
        setPaymentMethods(results[3].data.data as PaymentMethodBreakdown[]);
        setPrevOverview(results[4] ? results[4].data.data as Overview : null);
    }, []);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchAnalytics(range)
            .catch(() => setError('Failed to load analytics'))
            .finally(() => setLoading(false));
    }, [range, fetchAnalytics]);

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
        fetchAnalytics(range)
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

    const chartDays = timeline.map((d) => formatShortDate(d.date));
    const chartVisitors = timeline.map((d) => d.total_visits);
    const chartClicks = timeline.map((d) => d.deposit_clicks);
    const chartSvg = buildTrendsSvg(chartDays, chartVisitors, chartClicks);

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
                    {chartSvg ? (
                        <>
                            <div className="trends-chart-wrap" dangerouslySetInnerHTML={{ __html: chartSvg }} />
                            <div className="trends-labels">
                                {chartDays.map((d, i) => <span key={i}>{d}</span>)}
                            </div>
                        </>
                    ) : (
                        <div className="empty-state">
                            <h3>No data for selected range</h3>
                        </div>
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

            {/* Leaderboard (hardcoded — F5D wires) */}
            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">Agent Leaderboard</div>
                    <div className="panel-actions">
                        <select className="filter-select" defaultValue="clicks">
                            <option value="clicks">Sort by: Click Count</option>
                            <option value="hours">Sort by: Live Hours</option>
                            <option value="rate">Sort by: Click Rate (per minute live)</option>
                            <option value="conversion">Sort by: Conversion Rate</option>
                        </select>
                    </div>
                </div>
                <div className="table-wrap">
                    <table className="table">
                        <thead>
                            <tr>
                                <th style={{ width: 50 }}>Rank</th>
                                <th>Agent</th>
                                <th>Clicks (7d)</th>
                                <th>Live Hours</th>
                                <th>Click Rate</th>
                                <th>Sessions</th>
                                <th>Last Seen</th>
                            </tr>
                        </thead>
                        <tbody>
                            {SAMPLE_LEADERBOARD.map((a) => (
                                <LeaderboardRow key={a.rank} {...a} />
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </>
    );
}
