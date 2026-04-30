import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/api';
import '../../../css/dashboard.css';

// --- Types ---

interface Agent {
    id: number;
    display_number: number;
    telegram_username: string;
    status: string;
    computed_status: 'live' | 'offline' | 'disabled';
    live_until: string | null;
    seconds_remaining: number | null;
    clicks_today: number;
}

interface Overview {
    total_visits: number;
    unique_visitors: number;
    deposit_clicks: number;
    chat_clicks: number;
    total_minutes_live: number;
    total_sessions: number;
    ctr: number;
}

interface ActivityEvent {
    id: number;
    agent_id: number;
    agent: { id: number; display_number: number; telegram_username: string } | null;
    event_type: string;
    duration_minutes: number | null;
    created_at: string;
}

interface Performer {
    agent_id: number;
    display_number: number | null;
    telegram_username: string | null;
    deposit_clicks: number;
    minutes_live: number;
}

// --- Helpers ---

function formatToday(): string {
    const d = new Date();
    const date = d.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });
    const time = d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    return `${date} \u00b7 ${time} EAT`;
}

function pad(n: number): string {
    return String(n).padStart(2, '0');
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

function formatCountdown(seconds: number): string {
    if (seconds <= 0) return '0m';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    if (h > 0) return m > 0 ? `${h}h ${m}m` : `${h}h`;
    return `${m}m`;
}

function formatLiveTime(liveUntil: string, secondsRemaining: number): string {
    const totalSessionSeconds = Math.floor((new Date(liveUntil).getTime() - Date.now()) / 1000);
    const elapsed = Math.max(0, -totalSessionSeconds + secondsRemaining);
    const elapsedStr = formatCountdown(elapsed);
    const remainingStr = formatCountdown(secondsRemaining);
    return `Live ${elapsedStr} \u00b7 ends ${remainingStr}`;
}

function computeDelta(today: number, yesterday: number): { text: string; type: 'up' | 'down' | 'neutral' } {
    if (yesterday === 0) {
        return today > 0
            ? { text: '\u2191 new today', type: 'up' }
            : { text: '\u2014 no data', type: 'neutral' };
    }
    const pct = Math.round(((today - yesterday) / yesterday) * 100);
    if (pct > 0) return { text: `\u2191 ${pct}% vs yesterday`, type: 'up' };
    if (pct < 0) return { text: `\u2193 ${Math.abs(pct)}% vs yesterday`, type: 'down' };
    return { text: '\u2014 same as yesterday', type: 'neutral' };
}

function mapEventDot(eventType: string): 'online' | 'offline' | 'extend' | 'expired' {
    switch (eventType) {
        case 'went_online': return 'online';
        case 'went_offline': return 'offline';
        case 'extended': return 'extend';
        case 'session_expired': return 'expired';
        default: return 'offline';
    }
}

function formatEventText(event: ActivityEvent): string {
    const num = event.agent ? `Agent ${event.agent.display_number}` : `Agent #${event.agent_id}`;
    const bold = `<strong>${num}</strong>`;
    switch (event.event_type) {
        case 'went_online': {
            const dur = event.duration_minutes
                ? (event.duration_minutes >= 60 ? `${Math.floor(event.duration_minutes / 60)}h` : `${event.duration_minutes}m`)
                : '';
            return `${bold} <span class="muted">went online${dur ? ` for ${dur}` : ''}</span>`;
        }
        case 'went_offline':
            return `${bold} <span class="muted">went offline</span>`;
        case 'session_expired':
            return `${bold} <span class="muted">session expired</span>`;
        case 'extended': {
            const ext = event.duration_minutes
                ? (event.duration_minutes >= 60 ? `+${Math.floor(event.duration_minutes / 60)}h` : `+${event.duration_minutes}m`)
                : '';
            return `${bold} <span class="muted">extended${ext ? ` ${ext}` : ''}</span>`;
        }
        default:
            return `${bold} <span class="muted">${event.event_type.replace(/_/g, ' ')}</span>`;
    }
}

function todayDateStr(): string {
    return new Date().toISOString().slice(0, 10);
}

function yesterdayDateStr(): string {
    return new Date(Date.now() - 86400000).toISOString().slice(0, 10);
}

// --- Sub-components ---

export function StatCard({
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
                {deltaType === 'up' && !delta.startsWith('\u2191') && <span className="ticker-dot" />}
                {delta}
            </div>
        </div>
    );
}

function LiveAgentCard({ displayNumber, name, telegram, clicks, liveUntil, secondsRemaining }: {
    displayNumber: number;
    name: string;
    telegram: string;
    clicks: number;
    liveUntil: string;
    secondsRemaining: number;
}) {
    return (
        <div className="live-agent-card">
            <div className="live-agent-head">
                <div className="live-agent-avatar">{pad(displayNumber)}</div>
                <div className="live-agent-name">{name}</div>
            </div>
            <div className="live-agent-meta">
                <span>@{telegram}</span>
                <span className="clicks">{clicks}</span>
            </div>
            <div className="live-agent-time">
                {formatLiveTime(liveUntil, secondsRemaining)}
            </div>
        </div>
    );
}

function ActivityRow({ type, html, time }: {
    type: string;
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

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [agents, setAgents] = useState<Agent[]>([]);
    const [overview, setOverview] = useState<Overview | null>(null);
    const [yesterdayOverview, setYesterdayOverview] = useState<Overview | null>(null);
    const [activity, setActivity] = useState<ActivityEvent[]>([]);
    const [performers, setPerformers] = useState<Performer[]>([]);

    const fetchLive = useCallback(async () => {
        const today = todayDateStr();
        const [agentsRes, todayRes, activityRes, leaderboardRes] = await Promise.all([
            api.get('/api/admin/agents?per_page=100'),
            api.get(`/api/admin/stats/overview?range=custom&from=${today}&to=${today}`),
            api.get('/api/admin/activity?per_page=20'),
            api.get(`/api/admin/stats/leaderboard?range=custom&from=${today}&to=${today}&sort=deposit_clicks&limit=5`),
        ]);
        setAgents(agentsRes.data.data);
        setOverview(todayRes.data.data);
        setActivity(activityRes.data.data);
        setPerformers(leaderboardRes.data.data);
    }, []);

    useEffect(() => {
        // One-time: yesterday overview for deltas
        const yesterday = yesterdayDateStr();
        api.get(`/api/admin/stats/overview?range=custom&from=${yesterday}&to=${yesterday}`)
            .then((res) => setYesterdayOverview(res.data.data))
            .catch(() => {});

        // Polled: live data
        fetchLive()
            .catch(() => setError('Failed to load dashboard'))
            .finally(() => setLoading(false));

        const interval = setInterval(() => {
            if (!document.hidden) fetchLive().catch(() => {});
        }, 30_000);

        const onVisibility = () => {
            if (!document.hidden) fetchLive().catch(() => {});
        };
        document.addEventListener('visibilitychange', onVisibility);

        return () => {
            clearInterval(interval);
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [fetchLive]);

    function handleRetry() {
        setError(null);
        setLoading(true);
        fetchLive()
            .catch(() => setError('Failed to load dashboard'))
            .finally(() => setLoading(false));
    }

    // --- Derived state ---
    const totalAgents = agents.filter((a) => a.status === 'active').length;
    const liveAgents = agents
        .filter((a) => a.computed_status === 'live')
        .sort((a, b) => (a.seconds_remaining ?? 0) - (b.seconds_remaining ?? 0));

    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    const recentOnlineCount = activity.filter(
        (a) => a.event_type === 'went_online' && new Date(a.created_at).getTime() > oneHourAgo,
    ).length;

    const visitorsDelta = overview && yesterdayOverview
        ? computeDelta(overview.total_visits, yesterdayOverview.total_visits)
        : { text: 'today', type: 'neutral' as const };

    const clicksDelta = overview && yesterdayOverview
        ? computeDelta(overview.deposit_clicks, yesterdayOverview.deposit_clicks)
        : { text: 'today', type: 'neutral' as const };

    const ctrToday = overview?.ctr ?? 0;
    const ctrYesterday = yesterdayOverview?.ctr ?? 0;
    const ctrDelta = overview && yesterdayOverview
        ? (ctrToday === ctrYesterday
            ? { text: '\u2014 same as yesterday', type: 'neutral' as const }
            : ctrToday > ctrYesterday
                ? { text: `\u2191 vs yesterday`, type: 'up' as const }
                : { text: `\u2193 vs yesterday`, type: 'down' as const })
        : { text: 'today', type: 'neutral' as const };

    // Build a clicks map from leaderboard for live agent cards
    const clicksMap = new Map<number, number>();
    performers.forEach((p) => { if (p.agent_id) clicksMap.set(p.agent_id, p.deposit_clicks); });

    // --- Render ---
    if (loading) {
        return <div className="dash-loading">Loading dashboard...</div>;
    }

    return (
        <>
            {error && (
                <div className="dash-error">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-danger" onClick={handleRetry}>Retry</button>
                </div>
            )}

            <div className="page-head">
                <div>
                    <h1>Dashboard</h1>
                    <div className="subtitle">
                        Overview of agent activity and performance &middot; {formatToday()}
                    </div>
                </div>
                <div className="page-actions">
                    <button className="btn btn-secondary btn-sm" onClick={() => alert('Export CSV coming soon')}>
                        Export CSV
                    </button>
                    <button className="btn btn-primary" onClick={() => navigate('/admin/agents')}>
                        + New Agent
                    </button>
                </div>
            </div>

            <div className="stats-grid">
                <StatCard
                    label="Live Agents"
                    value=""
                    delta={recentOnlineCount > 0 ? `${recentOnlineCount} went live in last hour` : 'No new sessions in last hour'}
                    deltaType={recentOnlineCount > 0 ? 'up' : 'neutral'}
                >
                    {liveAgents.length}
                    <span style={{ fontSize: '1rem', color: 'var(--text-dim)', fontWeight: 600 }}>
                        {' '}/ {totalAgents}
                    </span>
                </StatCard>
                <StatCard
                    label="Visitors Today"
                    value={(overview?.total_visits ?? 0).toLocaleString()}
                    delta={visitorsDelta.text}
                    deltaType={visitorsDelta.type}
                    accent="gold"
                />
                <StatCard
                    label="Deposit Clicks"
                    value={(overview?.deposit_clicks ?? 0).toLocaleString()}
                    delta={clicksDelta.text}
                    deltaType={clicksDelta.type}
                    accent="blue"
                />
                <StatCard
                    label="Click-Through Rate"
                    value={`${(overview?.ctr ?? 0).toFixed(1)}%`}
                    delta={ctrDelta.text}
                    deltaType={ctrDelta.type}
                />
            </div>

            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">
                        Currently Live
                        <span className="live-pill">{liveAgents.length} active</span>
                    </div>
                    <div className="panel-actions">
                        <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/agents')}>
                            View all &rarr;
                        </button>
                    </div>
                </div>
                {liveAgents.length === 0 ? (
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
                                displayNumber={a.display_number}
                                name={`Agent ${a.display_number}`}
                                telegram={a.telegram_username}
                                clicks={clicksMap.get(a.id) ?? a.clicks_today}
                                liveUntil={a.live_until!}
                                secondsRemaining={a.seconds_remaining ?? 0}
                            />
                        ))}
                    </div>
                )}
            </div>

            <div className="two-col">
                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">Recent Activity</div>
                        <div className="panel-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/activity')}>
                                View all &rarr;
                            </button>
                        </div>
                    </div>
                    <ul className="activity-list">
                        {activity.length === 0 ? (
                            <li className="activity-row"><span className="activity-text muted">No recent activity</span></li>
                        ) : (
                            activity.map((a) => (
                                <ActivityRow
                                    key={a.id}
                                    type={mapEventDot(a.event_type)}
                                    html={formatEventText(a)}
                                    time={formatRelativeTime(a.created_at)}
                                />
                            ))
                        )}
                    </ul>
                </div>

                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">Top Performers Today</div>
                        <div className="panel-actions">
                            <button className="btn btn-ghost btn-sm" onClick={() => navigate('/admin/analytics')}>
                                Full leaderboard &rarr;
                            </button>
                        </div>
                    </div>
                    <div>
                        {performers.length === 0 ? (
                            <div className="empty-state">
                                <div className="icon">&#9675;</div>
                                <h3>No clicks today</h3>
                                <p>Top performers will appear here once agents receive clicks.</p>
                            </div>
                        ) : (
                            performers.map((p, i) => (
                                <PerformerRow
                                    key={p.agent_id}
                                    rank={i + 1}
                                    name={`Agent ${p.display_number ?? '?'}`}
                                    sub={`@${p.telegram_username ?? '?'} \u00b7 ${formatCountdown(p.minutes_live * 60)} live`}
                                    clicks={p.deposit_clicks}
                                />
                            ))
                        )}
                    </div>
                </div>
            </div>
        </>
    );
}
