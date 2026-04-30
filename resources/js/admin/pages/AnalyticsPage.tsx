import { StatCard } from './DashboardPage';
import '../../../css/analytics.css';

// --- Hardcoded sample data (replaced with API data in F5B) ---

const SAMPLE_STATS = [
    { label: 'Total Visitors', value: '26,438', delta: '\u2191 18% vs previous 7d', deltaType: 'up' as const, accent: 'gold' as const },
    { label: 'Unique Visitors', value: '8,247', delta: '\u2191 11%', deltaType: 'up' as const, accent: 'blue' as const },
    { label: 'Deposit Clicks', value: '3,381', delta: '\u2191 9%', deltaType: 'up' as const },
    { label: 'Click-Through Rate', value: '12.8%', delta: '\u2193 0.4 pts', deltaType: 'down' as const },
];

const SAMPLE_DAYS = ['Apr 20', 'Apr 21', 'Apr 22', 'Apr 23', 'Apr 24', 'Apr 25', 'Apr 26'];
const SAMPLE_VISITORS = [3120, 3580, 2940, 4120, 3650, 4380, 3847];
const SAMPLE_CLICKS = [392, 458, 387, 524, 471, 568, 486];

const SAMPLE_PAYMENT_METHODS = [
    { name: 'TeleBirr', agents: 28, pct: 96 },
    { name: 'CBE Birr', agents: 22, pct: 78 },
    { name: 'M-Pesa', agents: 17, pct: 62 },
    { name: 'Awash', agents: 12, pct: 42 },
    { name: 'Dashen', agents: 10, pct: 35 },
    { name: 'Bank of Abyssinia', agents: 4, pct: 14 },
    { name: 'Cooperative', agents: 2, pct: 7 },
];

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

// --- Heatmap data generator (matches mockup's intensity function) ---

function generateHeatmapData(): number[][] {
    const grid: number[][] = [];
    for (let day = 0; day < 7; day++) {
        const row: number[] = [];
        for (let hour = 0; hour < 24; hour++) {
            let base = 0;
            if (hour >= 7 && hour <= 22) {
                const distFromPeak = Math.abs(hour - 20);
                base = Math.max(0, 1 - distFromPeak * 0.15);
            }
            if (hour >= 0 && hour <= 2) base = Math.max(base, 0.2);
            if (day <= 4) base *= 0.95;
            else base *= 1.15;
            base += Math.sin(day * 7 + hour) * 0.06;
            row.push(Math.max(0, Math.min(1, base)));
        }
        grid.push(row);
    }
    return grid;
}

const HEATMAP_DATA = generateHeatmapData();
const HEATMAP_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

// --- Helpers ---

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

// --- SVG Chart Builder ---

function buildTrendsSvg(
    days: string[],
    visitors: number[],
    clicks: number[],
): string {
    const w = 960, h = 220, padL = 50, padR = 12, padT = 16, padB = 28;
    const innerW = w - padL - padR;
    const innerH = h - padT - padB;
    const maxV = 5000;
    const maxC = 700;
    const xStep = innerW / (days.length - 1);
    const xs = (i: number) => padL + i * xStep;
    const yV = (v: number) => padT + innerH - (v / maxV) * innerH;
    const yC = (v: number) => padT + innerH - (v / maxC) * innerH;

    const linePath = (data: number[], mapY: (v: number) => number) =>
        data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${mapY(v)}`).join(' ');

    const areaPath = (data: number[], mapY: (v: number) => number) => {
        const top = data.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xs(i)} ${mapY(v)}`).join(' ');
        return `${top} L ${xs(data.length - 1)} ${padT + innerH} L ${xs(0)} ${padT + innerH} Z`;
    };

    const gridLines = [0, 0.25, 0.5, 0.75, 1].map(p => {
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

    // Header row: empty corner + 24 hour labels
    cells.push(<div key="corner" />);
    for (let h = 0; h < 24; h++) {
        cells.push(
            h % 3 === 0
                ? <div key={`h-${h}`} className="hour-label">{h}</div>
                : <div key={`h-${h}`} />,
        );
    }

    // Data rows
    days.forEach((day, dayIdx) => {
        cells.push(<div key={`d-${dayIdx}`} className="day-label">{day}</div>);
        for (let h = 0; h < 24; h++) {
            const v = data[dayIdx][h];
            const opacity = v < 0.05 ? 0.04 : 0.05 + v * 0.95;
            const clickCount = Math.round(v * 80);
            const hourLabel = String(h).padStart(2, '0') + ':00';
            cells.push(
                <div
                    key={`c-${dayIdx}-${h}`}
                    className="heat-cell"
                    style={{ background: `rgba(0,168,107,${opacity})` }}
                    title={`${day} ${hourLabel} \u00b7 ${clickCount} clicks`}
                />,
            );
        }
    });

    return <div className="heatmap">{cells}</div>;
}

function PaymentBar({ name, agents, pct }: { name: string; agents: number; pct: number }) {
    return (
        <div className="bar-row">
            <div className="bar-label">{name}</div>
            <div className="bar-track">
                <div
                    className="bar-fill"
                    style={{ width: `${pct}%`, background: 'linear-gradient(90deg, var(--green-dark), var(--green))' }}
                />
            </div>
            <div className="bar-value">{agents} agents</div>
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
    const chartSvg = buildTrendsSvg(SAMPLE_DAYS, SAMPLE_VISITORS, SAMPLE_CLICKS);

    return (
        <>
            {/* Page Header */}
            <div className="page-head">
                <div>
                    <h1>Analytics</h1>
                    <div className="subtitle">Performance metrics, trends, and agent insights</div>
                </div>
                <div className="page-actions">
                    <select className="filter-select" defaultValue="7d">
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
                {SAMPLE_STATS.map((s) => (
                    <StatCard key={s.label} {...s} />
                ))}
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
                    <div className="trends-chart-wrap" dangerouslySetInnerHTML={{ __html: chartSvg }} />
                    <div className="trends-labels">
                        {SAMPLE_DAYS.map((d) => <span key={d}>{d}</span>)}
                    </div>
                </div>
            </div>

            {/* Two-Column: Heatmap + Payment Methods */}
            <div className="two-col">
                {/* Heatmap */}
                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">When players deposit</div>
                        <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Day &times; Hour heatmap</div>
                    </div>
                    <div className="panel-body">
                        <HeatmapGrid data={HEATMAP_DATA} days={HEATMAP_DAYS} />
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

                {/* Payment Methods */}
                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">Payment Methods</div>
                        <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>By agent click rate</div>
                    </div>
                    <div className="panel-body">
                        <div className="bar-list">
                            {SAMPLE_PAYMENT_METHODS.map((m) => (
                                <PaymentBar key={m.name} name={m.name} agents={m.agents} pct={m.pct} />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Leaderboard */}
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
