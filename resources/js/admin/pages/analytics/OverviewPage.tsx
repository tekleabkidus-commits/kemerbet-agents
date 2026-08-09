import { useCallback, useEffect, useState } from 'react';
import {
    ResponsiveContainer, AreaChart, Area, XAxis, YAxis,
    CartesianGrid, Tooltip,
} from 'recharts';
import api from '@/api';
import { StatCard } from '../DashboardPage';
import {
    AnalyticsFilterBar, useAnalyticsFilters, HourFilterHint,
    changeDelta, formatShortDate, ChartTooltip, formatAxisTick, BreakdownBar,
} from './shared';

interface FunnelMetrics {
    total_visits: number;
    unique_visitors: number;
    deposit_clicks: number;
    unique_clickers: number;
    visit_to_click_rate: number;
}

interface FunnelData {
    current: FunnelMetrics;
    previous: FunnelMetrics;
    change: Record<keyof FunnelMetrics, number | null>;
}

interface TimelineDay {
    date: string;
    total_visits: number;
    deposit_clicks: number;
}

interface RecordEntry {
    date?: string;
    hour?: string;
    count: number;
}

interface RecordsData {
    best_visit_day: RecordEntry | null;
    best_visit_hour: RecordEntry | null;
    best_click_day: RecordEntry | null;
    best_click_hour: RecordEntry | null;
}

function formatRecordHour(slot: string): string {
    const d = new Date(slot.replace(' ', 'T'));
    if (Number.isNaN(d.getTime())) return slot;
    return `${d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}, ${String(d.getHours()).padStart(2, '0')}:00`;
}

function RecordRow({ label, entry, isHour }: { label: string; entry: RecordEntry | null; isHour?: boolean }) {
    return (
        <div className="bar-row">
            <div className="bar-label" style={{ flexBasis: 160 }}>{label}</div>
            <div className="bar-value" style={{ textAlign: 'left', flex: 1 }}>
                {entry
                    ? <>
                        <strong>{entry.count.toLocaleString()}</strong>
                        <span style={{ color: 'var(--text-dim)' }}>
                            {' '}on {isHour ? formatRecordHour(entry.hour ?? '') : formatShortDate(entry.date ?? '')}
                        </span>
                    </>
                    : <span style={{ color: 'var(--text-dim)' }}>no data yet</span>}
            </div>
        </div>
    );
}

export default function OverviewPage() {
    const { apiQuery, dateQuery, agentQuery, hourFilterActive, agentFilterActive } = useAnalyticsFilters();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [funnel, setFunnel] = useState<FunnelData | null>(null);
    const [timeline, setTimeline] = useState<TimelineDay[]>([]);
    const [records, setRecords] = useState<RecordsData | null>(null);

    const fetchAll = useCallback(async () => {
        const [funnelRes, timelineRes, recordsRes] = await Promise.all([
            api.get(`/api/admin/stats/funnel?${apiQuery}`),
            api.get(`/api/admin/stats/timeline?${dateQuery}`),
            api.get(`/api/admin/stats/records${agentQuery ? `?${agentQuery}` : ''}`),
        ]);
        setFunnel(funnelRes.data.data);
        setTimeline(timelineRes.data.data);
        setRecords(recordsRes.data.data);
    }, [apiQuery, dateQuery, agentQuery]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchAll()
            .catch(() => setError('Failed to load analytics'))
            .finally(() => setLoading(false));
    }, [fetchAll]);

    const chartData = timeline.map((d) => ({
        date: formatShortDate(d.date),
        visitors: d.total_visits,
        clicks: d.deposit_clicks,
    }));

    const current = funnel?.current;
    const funnelMax = Math.max(1, current?.total_visits ?? 0);

    if (loading) {
        return <div className="dash-loading">Loading analytics...</div>;
    }

    return (
        <>
            {error && (
                <div className="dash-error">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-danger" onClick={() => window.location.reload()}>Retry</button>
                </div>
            )}

            <div className="page-head">
                <div>
                    <h1>Analytics &mdash; Overview</h1>
                    <div className="subtitle">Funnel, trends, and all-time records</div>
                </div>
                <AnalyticsFilterBar />
            </div>

            <div className="stats-grid" style={{ marginBottom: 20 }}>
                <StatCard
                    label="Total Visits"
                    value={(current?.total_visits ?? 0).toLocaleString()}
                    delta={changeDelta(funnel?.change.total_visits ?? null).text}
                    deltaType={changeDelta(funnel?.change.total_visits ?? null).type}
                    accent="gold"
                />
                <StatCard
                    label="Unique Visitors"
                    value={(current?.unique_visitors ?? 0).toLocaleString()}
                    delta={changeDelta(funnel?.change.unique_visitors ?? null).text}
                    deltaType={changeDelta(funnel?.change.unique_visitors ?? null).type}
                    accent="blue"
                />
                <StatCard
                    label="Deposit Clicks"
                    value={(current?.deposit_clicks ?? 0).toLocaleString()}
                    delta={changeDelta(funnel?.change.deposit_clicks ?? null).text}
                    deltaType={changeDelta(funnel?.change.deposit_clicks ?? null).type}
                />
                <StatCard
                    label="Visit &rarr; Click Rate"
                    value={`${(((current?.visit_to_click_rate) ?? 0) * 100).toFixed(1)}%`}
                    delta={changeDelta(funnel?.change.visit_to_click_rate ?? null).text}
                    deltaType={changeDelta(funnel?.change.visit_to_click_rate ?? null).type}
                />
            </div>

            <div className="panel">
                <div className="panel-head">
                    <div className="panel-title">Traffic &amp; Clicks Over Time</div>
                    <div className="panel-actions" style={{ gap: 10 }}>
                        <HourFilterHint active={hourFilterActive || agentFilterActive} label="agent/hour filters not applied" />
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
                                <XAxis dataKey="date" stroke="#6b7a8f" tick={{ fontSize: 11 }} axisLine={false} tickLine={false} />
                                <YAxis yAxisId="visitors" orientation="left" stroke="#f5c518" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAxisTick} />
                                <YAxis yAxisId="clicks" orientation="right" stroke="#1dd88c" tick={{ fontSize: 10 }} axisLine={false} tickLine={false} tickFormatter={formatAxisTick} />
                                <Tooltip content={<ChartTooltip />} />
                                <Area yAxisId="visitors" type="monotone" dataKey="visitors" stroke="#f5c518" strokeWidth={2} fill="url(#gradVisitors)" activeDot={{ r: 4 }} />
                                <Area yAxisId="clicks" type="monotone" dataKey="clicks" stroke="#1dd88c" strokeWidth={2} fill="url(#gradClicks)" activeDot={{ r: 4 }} />
                            </AreaChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            <div className="two-col">
                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">Conversion Funnel</div>
                        <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Visits &rarr; unique visitors &rarr; clickers</div>
                    </div>
                    <div className="panel-body">
                        {current && current.total_visits === 0 && current.unique_clickers === 0 ? (
                            <div className="empty-state"><h3>No funnel data for this range</h3></div>
                        ) : (
                            <div className="bar-list">
                                <BreakdownBar
                                    name="Visits"
                                    value={(current?.total_visits ?? 0).toLocaleString()}
                                    pct={((current?.total_visits ?? 0) / funnelMax) * 100}
                                />
                                <BreakdownBar
                                    name="Unique visitors"
                                    value={(current?.unique_visitors ?? 0).toLocaleString()}
                                    pct={((current?.unique_visitors ?? 0) / funnelMax) * 100}
                                />
                                <BreakdownBar
                                    name="Clicked deposit"
                                    value={(current?.unique_clickers ?? 0).toLocaleString()}
                                    pct={((current?.unique_clickers ?? 0) / funnelMax) * 100}
                                />
                            </div>
                        )}
                    </div>
                </div>

                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">All-Time Records</div>
                        <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Ignores the date filter</div>
                    </div>
                    <div className="panel-body">
                        <div className="bar-list">
                            <RecordRow label="Best day — visits" entry={records?.best_visit_day ?? null} />
                            <RecordRow label="Best hour — visits" entry={records?.best_visit_hour ?? null} isHour />
                            <RecordRow label="Best day — clicks" entry={records?.best_click_day ?? null} />
                            <RecordRow label="Best hour — clicks" entry={records?.best_click_hour ?? null} isHour />
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
