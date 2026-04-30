import { useNavigate } from 'react-router-dom';
import '../../../css/dashboard.css';

// --- Hardcoded sample data (replaced with API data in F4B) ---

const SAMPLE_STATS = {
    liveAgents: 11,
    totalAgents: 28,
    visitorsToday: 3847,
    depositClicks: 486,
    ctr: 12.6,
    liveDelta: '3 going live in last hour',
    visitorsDelta: '↑ 12% vs yesterday',
    clicksDelta: '↑ 8% vs yesterday',
    ctrDelta: '— same as yesterday',
};

const SAMPLE_LIVE_AGENTS = [
    { id: 1, displayNumber: 7, name: 'Agent 7', telegram: '@DOITFAST21', clicks: 23, liveTime: '1h 23m', endsIn: '37m' },
    { id: 2, displayNumber: 14, name: 'Agent 14', telegram: '@tewodros_ab', clicks: 18, liveTime: '47m', endsIn: '1h 13m' },
    { id: 3, displayNumber: 3, name: 'Agent 3', telegram: '@yehoneagent', clicks: 31, liveTime: '2h 4m', endsIn: '56m' },
    { id: 4, displayNumber: 19, name: 'Agent 19', telegram: '@kemerdepositagent', clicks: 9, liveTime: '12m', endsIn: '18m' },
    { id: 5, displayNumber: 22, name: 'Agent 22', telegram: '@obina_t', clicks: 14, liveTime: '38m', endsIn: '1h 22m' },
    { id: 6, displayNumber: 11, name: 'Agent 11', telegram: '@balem18', clicks: 7, liveTime: '23m', endsIn: '7m' },
];

const SAMPLE_ACTIVITY = [
    { id: 1, type: 'online' as const, text: '<strong>Agent 19</strong> <span class="muted">went online for 30m</span>', time: '2m ago' },
    { id: 2, type: 'click' as const, text: '<span class="muted">Deposit click on</span> <strong>Agent 3</strong>', time: '3m ago' },
    { id: 3, type: 'extend' as const, text: '<strong>Agent 7</strong> <span class="muted">extended +1h</span>', time: '8m ago' },
    { id: 4, type: 'offline' as const, text: '<strong>Agent 4</strong> <span class="muted">went offline (2h session)</span>', time: '12m ago' },
    { id: 5, type: 'online' as const, text: '<strong>Agent 22</strong> <span class="muted">went online for 2h</span>', time: '38m ago' },
    { id: 6, type: 'click' as const, text: '<span class="muted">Deposit click on</span> <strong>Agent 14</strong>', time: '42m ago' },
    { id: 7, type: 'offline' as const, text: '<strong>Agent 12</strong> <span class="muted">went offline manually</span>', time: '44m ago' },
];

const SAMPLE_PERFORMERS = [
    { id: 1, name: 'Agent 3', sub: '@yehoneagent · 4h 12m live', clicks: 31 },
    { id: 2, name: 'Agent 7', sub: '@DOITFAST21 · 3h 47m live', clicks: 23 },
    { id: 3, name: 'Agent 14', sub: '@tewodros_ab · 2h 18m live', clicks: 18 },
    { id: 4, name: 'Agent 22', sub: '@obina_t · 38m live', clicks: 14 },
    { id: 5, name: 'Agent 4', sub: '@kemeragent_4 · 2h 1m live', clicks: 12 },
];

// --- Helpers ---

function formatToday(): string {
    const d = new Date();
    const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${date} · ${time} EAT`;
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
}

// --- Sub-components ---

function StatCard({
    label, value, delta, deltaType, accent, children,
}: {
    label: string;
    value: string;
    delta: string;
    deltaType: 'up' | 'down' | 'neutral';
    accent?: 'gold' | 'blue';
    children?: React.ReactNode;
}) {
    return (
        <div className={`stat-card${accent ? ` ${accent}` : ''}`}>
            <div className="label">{label}</div>
            <div className="value">{children ?? value}</div>
            <div className={`delta ${deltaType}`}>
                {deltaType === 'up' && delta.startsWith('↑') ? null : deltaType === 'up' ? <span className="ticker-dot" /> : null}
                {delta}
            </div>
        </div>
    );
}

function LiveAgentCard({ displayNumber, name, telegram, clicks, liveTime, endsIn }: {
    displayNumber: number;
    name: string;
    telegram: string;
    clicks: number;
    liveTime: string;
    endsIn: string;
}) {
    return (
        <div className="live-agent-card">
            <div className="live-agent-head">
                <div className="live-agent-avatar">{pad(displayNumber)}</div>
                <div className="live-agent-name">{name}</div>
            </div>
            <div className="live-agent-meta">
                <span>{telegram}</span>
                <span className="clicks">{clicks}</span>
            </div>
            <div className="live-agent-time">Live {liveTime} · ends {endsIn}</div>
        </div>
    );
}

function ActivityRow({ type, html, time }: {
    type: 'online' | 'offline' | 'click' | 'extend' | 'expired';
    html: string;
    time: string;
}) {
    return (
        <li className="activity-row">
            <span className={`activity-dot ${type}`} />
            <div className="activity-text" dangerouslySetInnerHTML={{ __html: html }} />
            <span className="activity-time">{time}</span>
        </li>
    );
}

function PerformerRow({ rank, name, sub, clicks }: {
    rank: number;
    name: string;
    sub: string;
    clicks: number;
}) {
    return (
        <div className="performer-row">
            <div className="performer-rank">{rank}</div>
            <div className="performer-info">
                <div className="performer-name">{name}</div>
                <div className="performer-sub">{sub}</div>
            </div>
            <div>
                <div className="performer-stat">{clicks}</div>
                <div className="performer-stat-label">CLICKS</div>
            </div>
        </div>
    );
}

// --- Main Component ---

export default function DashboardPage() {
    const navigate = useNavigate();
    const stats = SAMPLE_STATS;
    const liveAgents = SAMPLE_LIVE_AGENTS;
    const activity = SAMPLE_ACTIVITY;
    const performers = SAMPLE_PERFORMERS;

    // Set to true to preview loading state, false for normal render
    const loading = false;
    // Set to a string to preview error state
    const error: string | null = null;
    // Set to true to preview empty live grid
    const showEmptyState = false;

    if (loading) {
        return (
            <div className="dash-loading">
                Loading dashboard...
            </div>
        );
    }

    return (
        <>
            {/* Error State */}
            {error && (
                <div className="dash-error">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-danger" onClick={() => window.location.reload()}>
                        Retry
                    </button>
                </div>
            )}

            {/* Page Header */}
            <div className="page-head">
                <div>
                    <h1>Dashboard</h1>
                    <div className="subtitle">
                        Overview of agent activity and performance · {formatToday()}
                    </div>
                </div>
                <div className="page-actions">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => alert('Export CSV coming soon')}
                    >
                        Export CSV
                    </button>
                    <button
                        className="btn btn-primary"
                        onClick={() => navigate('/admin/agents')}
                    >
                        + New Agent
                    </button>
                </div>
            </div>

            {/* Stat Cards */}
            <div className="stats-grid">
                <StatCard
                    label="Live Agents"
                    value=""
                    delta={stats.liveDelta}
                    deltaType="up"
                >
                    {stats.liveAgents}
                    <span style={{ fontSize: '1rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        {' '}/ {stats.totalAgents}
                    </span>
                </StatCard>
                <StatCard
                    label="Visitors Today"
                    value={stats.visitorsToday.toLocaleString()}
                    delta={stats.visitorsDelta}
                    deltaType="up"
                    accent="gold"
                />
                <StatCard
                    label="Deposit Clicks"
                    value={stats.depositClicks.toLocaleString()}
                    delta={stats.clicksDelta}
                    deltaType="up"
                    accent="blue"
                />
                <StatCard
                    label="Click-Through Rate"
                    value={`${stats.ctr}%`}
                    delta={stats.ctrDelta}
                    deltaType="neutral"
                />
            </div>

            {/* Currently Live Panel */}
            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">
                        Currently Live
                        <span className="live-pill">
                            {showEmptyState ? 0 : liveAgents.length} active
                        </span>
                    </div>
                    <div className="panel-actions">
                        <button
                            className="btn btn-ghost btn-sm"
                            onClick={() => navigate('/admin/agents')}
                        >
                            View all &rarr;
                        </button>
                    </div>
                </div>
                {showEmptyState || liveAgents.length === 0 ? (
                    <div className="empty-state">
                        <div className="icon">&#9675;</div>
                        <h3>No agents currently live</h3>
                        <p>When agents go online they&apos;ll appear here.</p>
                    </div>
                ) : (
                    <div className="live-grid">
                        {liveAgents.map((a) => (
                            <LiveAgentCard
                                key={a.id}
                                displayNumber={a.displayNumber}
                                name={a.name}
                                telegram={a.telegram}
                                clicks={a.clicks}
                                liveTime={a.liveTime}
                                endsIn={a.endsIn}
                            />
                        ))}
                    </div>
                )}
            </div>

            {/* Two-Column: Activity + Performers */}
            <div className="two-col">
                {/* Recent Activity */}
                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">Recent Activity</div>
                        <div className="panel-actions">
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => navigate('/admin/activity')}
                            >
                                View all &rarr;
                            </button>
                        </div>
                    </div>
                    <ul className="activity-list">
                        {activity.map((a) => (
                            <ActivityRow key={a.id} type={a.type} html={a.text} time={a.time} />
                        ))}
                    </ul>
                </div>

                {/* Top Performers Today */}
                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">Top Performers Today</div>
                        <div className="panel-actions">
                            <button
                                className="btn btn-ghost btn-sm"
                                onClick={() => navigate('/admin/analytics')}
                            >
                                Full leaderboard &rarr;
                            </button>
                        </div>
                    </div>
                    <div>
                        {performers.map((p, i) => (
                            <PerformerRow
                                key={p.id}
                                rank={i + 1}
                                name={p.name}
                                sub={p.sub}
                                clicks={p.clicks}
                            />
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
}
