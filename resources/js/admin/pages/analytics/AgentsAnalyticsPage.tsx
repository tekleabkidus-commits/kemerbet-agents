import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import {
    AnalyticsFilterBar, useAnalyticsFilters, HourFilterHint,
    pad, formatHoursMinutes, formatLastSeen, Sparkline,
} from './shared';

interface PerformanceRow {
    agent_id: number;
    display_number: number;
    telegram_username: string;
    deposit_clicks: number;
    minutes_live: number;
    clicks_per_hour_online: number | null;
    uptime_days: number;
    sessions: number;
    avg_session_minutes: number;
    expired_offline_count: number;
    manual_offline_count: number;
    expired_vs_manual_offline: number | null;
    notification_response_rate: number | null;
}

interface PinRow {
    agent_id: number;
    display_number: number;
    telegram_username: string;
    pinned_hours: number;
    unpinned_hours: number;
    pinned_clicks: number;
    unpinned_clicks: number;
    pinned_clicks_per_hour: number | null;
    unpinned_clicks_per_hour: number | null;
    insufficient_data: boolean;
}

interface PinData {
    agents: PinRow[];
    aggregate: Omit<PinRow, 'agent_id' | 'display_number' | 'telegram_username'> | null;
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

interface SparklineData {
    days: string[];
    agents: Record<string, number[]>;
}

type SortableColumn = keyof Omit<PerformanceRow, 'agent_id' | 'telegram_username'>;

const COLUMNS: Array<{ key: SortableColumn; label: string }> = [
    { key: 'display_number', label: 'Agent' },
    { key: 'deposit_clicks', label: 'Clicks' },
    { key: 'minutes_live', label: 'Live Time' },
    { key: 'clicks_per_hour_online', label: 'Clicks/hr Online' },
    { key: 'uptime_days', label: 'Uptime Days' },
    { key: 'sessions', label: 'Sessions' },
    { key: 'avg_session_minutes', label: 'Avg Session' },
    { key: 'expired_vs_manual_offline', label: 'Expired : Manual' },
    { key: 'notification_response_rate', label: 'Notif. Response' },
];

function num(v: number | null, suffix = ''): string {
    return v === null ? '—' : `${v}${suffix}`;
}

export default function AgentsAnalyticsPage() {
    const { apiQuery, dateQuery, hourFilterActive, agentFilterActive } = useAnalyticsFilters();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [rows, setRows] = useState<PerformanceRow[]>([]);
    const [unsupported, setUnsupported] = useState<string[]>([]);
    const [pin, setPin] = useState<PinData | null>(null);
    const [spark, setSpark] = useState<SparklineData>({ days: [], agents: {} });
    const [leaderboard, setLeaderboard] = useState<LeaderboardAgent[]>([]);
    const [lbSort, setLbSort] = useState('deposit_clicks');
    const [sortCol, setSortCol] = useState<SortableColumn>('deposit_clicks');
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc');

    const fetchAll = useCallback(async () => {
        const [perfRes, pinRes, sparkRes, lbRes] = await Promise.all([
            api.get(`/api/admin/stats/agent-performance?${apiQuery}`),
            api.get(`/api/admin/stats/pin-effectiveness?${apiQuery}`),
            api.get(`/api/admin/stats/sparklines?${apiQuery}`),
            api.get(`/api/admin/stats/leaderboard?${dateQuery}&sort=${lbSort}&limit=50`),
        ]);
        setRows(perfRes.data.data.agents);
        setUnsupported(perfRes.data.data.hour_filter_unsupported ?? []);
        setPin(pinRes.data.data);
        setSpark({ days: sparkRes.data.data.days, agents: sparkRes.data.data.agents ?? {} });
        setLeaderboard(lbRes.data.data);
    }, [apiQuery, dateQuery, lbSort]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchAll()
            .catch(() => setError('Failed to load agent analytics'))
            .finally(() => setLoading(false));
    }, [fetchAll]);

    function handleRetry() {
        setLoading(true);
        setError(null);
        fetchAll()
            .catch(() => setError('Failed to load agent analytics'))
            .finally(() => setLoading(false));
    }

    function handleSort(col: SortableColumn) {
        if (col === sortCol) {
            setSortDir((d) => (d === 'desc' ? 'asc' : 'desc'));
        } else {
            setSortCol(col);
            setSortDir('desc');
        }
    }

    const sorted = [...rows].sort((a, b) => {
        const av = a[sortCol] ?? -1;
        const bv = b[sortCol] ?? -1;
        return sortDir === 'desc' ? Number(bv) - Number(av) : Number(av) - Number(bv);
    });

    if (loading) {
        return <div className="dash-loading">Loading agent analytics...</div>;
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
                    <h1>Analytics &mdash; Agents</h1>
                    <div className="subtitle">Per-agent performance, pin effectiveness, and leaderboard</div>
                </div>
                <AnalyticsFilterBar />
            </div>

            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">Agent Performance</div>
                    <div className="panel-actions" style={{ gap: 10 }}>
                        {unsupported.length > 0 && (
                            <HourFilterHint active label={`hour filter not applied to: ${unsupported.join(', ')}`} />
                        )}
                    </div>
                </div>
                {sorted.length === 0 ? (
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
                                    {COLUMNS.map((c) => (
                                        <th
                                            key={c.key}
                                            onClick={() => handleSort(c.key)}
                                            style={{ cursor: 'pointer', userSelect: 'none' }}
                                            title={`Sort by ${c.label}`}
                                        >
                                            {c.label}{sortCol === c.key ? (sortDir === 'desc' ? ' ↓' : ' ↑') : ''}
                                        </th>
                                    ))}
                                    <th>14-Day Trend</th>
                                </tr>
                            </thead>
                            <tbody>
                                {sorted.map((a) => (
                                    <tr key={a.agent_id}>
                                        <td>
                                            <div className="cell-agent">
                                                <div className="avatar">{pad(a.display_number)}</div>
                                                <div className="info">
                                                    <div className="name">Agent {a.display_number}</div>
                                                    <div className="username">@{a.telegram_username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="cell-clicks"><div className="today">{a.deposit_clicks}</div></td>
                                        <td>{formatHoursMinutes(a.minutes_live)}</td>
                                        <td>{num(a.clicks_per_hour_online, ' /hr')}</td>
                                        <td>{Math.round(a.uptime_days * 100)}%</td>
                                        <td>{a.sessions}</td>
                                        <td>{formatHoursMinutes(a.avg_session_minutes)}</td>
                                        <td title={`${a.expired_offline_count} expired, ${a.manual_offline_count} manual`}>
                                            {a.expired_offline_count} : {a.manual_offline_count}
                                        </td>
                                        <td>{a.notification_response_rate === null ? '—' : `${Math.round(a.notification_response_rate * 100)}%`}</td>
                                        <td><Sparkline values={spark.agents[String(a.agent_id)] ?? []} /></td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">Pin Effectiveness</div>
                    <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Clicks/hour while pinned vs unpinned</div>
                </div>
                {!pin || pin.agents.length === 0 ? (
                    <div className="empty-state">
                        <h3>No pin history in this range</h3>
                        <p>Pin an online agent from the Agents page to start measuring.</p>
                    </div>
                ) : (
                    <div className="table-wrap">
                        <table className="table">
                            <thead>
                                <tr>
                                    <th>Agent</th>
                                    <th>Pinned Hours</th>
                                    <th>Pinned Clicks/hr</th>
                                    <th>Unpinned Hours</th>
                                    <th>Unpinned Clicks/hr</th>
                                    <th>Data</th>
                                </tr>
                            </thead>
                            <tbody>
                                {pin.agents.map((p) => (
                                    <tr key={p.agent_id}>
                                        <td>
                                            <div className="cell-agent">
                                                <div className="avatar">{pad(p.display_number)}</div>
                                                <div className="info">
                                                    <div className="name">Agent {p.display_number}</div>
                                                    <div className="username">@{p.telegram_username}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td>{p.pinned_hours}h ({p.pinned_clicks} clicks)</td>
                                        <td><strong>{num(p.pinned_clicks_per_hour)}</strong></td>
                                        <td>{p.unpinned_hours}h ({p.unpinned_clicks} clicks)</td>
                                        <td><strong>{num(p.unpinned_clicks_per_hour)}</strong></td>
                                        <td>
                                            {p.insufficient_data
                                                ? <span style={{ color: 'var(--gold)', fontSize: '.74rem' }}>insufficient (&lt;2h in a state)</span>
                                                : <span style={{ color: 'var(--green)', fontSize: '.74rem' }}>ok</span>}
                                        </td>
                                    </tr>
                                ))}
                                {pin.aggregate && (
                                    <tr>
                                        <td><strong>All pinned agents</strong></td>
                                        <td>{pin.aggregate.pinned_hours}h ({pin.aggregate.pinned_clicks} clicks)</td>
                                        <td><strong>{num(pin.aggregate.pinned_clicks_per_hour)}</strong></td>
                                        <td>{pin.aggregate.unpinned_hours}h ({pin.aggregate.unpinned_clicks} clicks)</td>
                                        <td><strong>{num(pin.aggregate.unpinned_clicks_per_hour)}</strong></td>
                                        <td>{pin.aggregate.insufficient_data ? <span style={{ color: 'var(--gold)', fontSize: '.74rem' }}>insufficient</span> : ''}</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">Agent Leaderboard</div>
                    <div className="panel-actions" style={{ gap: 10 }}>
                        <HourFilterHint active={hourFilterActive || agentFilterActive} label="agent/hour filters not applied" />
                        <select
                            className="filter-select"
                            value={lbSort}
                            onChange={(e) => setLbSort(e.target.value)}
                        >
                            <option value="deposit_clicks">Sort by: Click Count</option>
                            <option value="minutes_live">Sort by: Live Hours</option>
                            <option value="click_rate">Sort by: Click Rate (per minute live)</option>
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
                                    <th>Clicks</th>
                                    <th>Live Hours</th>
                                    <th>Click Rate</th>
                                    <th>Sessions</th>
                                    <th>Last Seen</th>
                                </tr>
                            </thead>
                            <tbody>
                                {leaderboard.map((a, i) => {
                                    const rank = i + 1;
                                    const rankClass = rank <= 3 ? `lb-rank lb-${rank}` : 'lb-rank';
                                    return (
                                        <tr key={a.agent_id}>
                                            <td><div className={rankClass}>{rank}</div></td>
                                            <td>
                                                <div className="cell-agent">
                                                    <div className="avatar">{pad(a.display_number ?? 0)}</div>
                                                    <div className="info">
                                                        <div className="name">Agent {a.display_number ?? '?'}</div>
                                                        <div className="username">@{a.telegram_username ?? '?'}</div>
                                                    </div>
                                                </div>
                                            </td>
                                            <td className="cell-clicks"><div className="today">{a.deposit_clicks}</div></td>
                                            <td>{formatHoursMinutes(a.minutes_live)}</td>
                                            <td>
                                                <strong style={{ color: rank <= 3 ? 'var(--green)' : 'var(--text)' }}>{(a.click_rate * 60).toFixed(1)}</strong>
                                                {' '}<span style={{ color: 'var(--text-dim)', fontSize: '.72rem' }}>/hr</span>
                                            </td>
                                            <td>{a.times_went_online}</td>
                                            <td className={`cell-time${a.is_live ? ' live' : ''}`}>{formatLastSeen(a.last_seen_at, a.is_live)}</td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </>
    );
}
