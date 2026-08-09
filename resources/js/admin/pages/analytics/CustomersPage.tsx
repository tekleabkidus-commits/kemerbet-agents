import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import {
    AnalyticsFilterBar, useAnalyticsFilters, HourFilterHint, BreakdownBar,
} from './shared';

interface ReferrerRow {
    source: string;
    count: number;
}

interface TrafficData {
    referrers: ReferrerRow[];
    devices: { mobile: number; desktop: number; other: number };
    new_vs_returning: { new: number; returning: number };
    agent_filter_unsupported?: boolean;
}

interface ClicksInsightsData {
    repeat_clickers: number;
    one_day_clickers: number;
    clicks_per_visitor_distribution: Record<string, number>;
    click_referrers: ReferrerRow[];
    offline_click_attempts: number;
}

const DISTRIBUTION_ORDER = ['1', '2-3', '4-10', '10+'];

function BarListPanel({ title, subtitle, rows, hint, emptyLabel }: {
    title: string;
    subtitle?: string;
    rows: Array<{ name: string; count: number }>;
    hint?: React.ReactNode;
    emptyLabel: string;
}) {
    const max = Math.max(1, ...rows.map((r) => r.count));
    return (
        <div className="panel">
            <div className="panel-head">
                <div className="panel-title">{title}</div>
                <div className="panel-actions" style={{ gap: 10 }}>
                    {hint}
                    {subtitle && <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>{subtitle}</div>}
                </div>
            </div>
            <div className="panel-body">
                {rows.every((r) => r.count === 0) ? (
                    <div className="empty-state"><h3>{emptyLabel}</h3></div>
                ) : (
                    <div className="bar-list">
                        {rows.map((r) => (
                            <BreakdownBar
                                key={r.name}
                                name={r.name}
                                value={r.count.toLocaleString()}
                                pct={(r.count / max) * 100}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default function CustomersPage() {
    const { apiQuery, agentFilterActive } = useAnalyticsFilters();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [traffic, setTraffic] = useState<TrafficData | null>(null);
    const [insights, setInsights] = useState<ClicksInsightsData | null>(null);

    const fetchAll = useCallback(async () => {
        const [trafficRes, insightsRes] = await Promise.all([
            api.get(`/api/admin/stats/traffic?${apiQuery}`),
            api.get(`/api/admin/stats/clicks-insights?${apiQuery}`),
        ]);
        setTraffic(trafficRes.data.data);
        setInsights(insightsRes.data.data);
    }, [apiQuery]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchAll()
            .catch(() => setError('Failed to load customer analytics'))
            .finally(() => setLoading(false));
    }, [fetchAll]);

    if (loading) {
        return <div className="dash-loading">Loading customer analytics...</div>;
    }

    const agentHint = traffic?.agent_filter_unsupported
        ? <HourFilterHint active label="agent filter not applied (visits have no agent)" />
        : null;

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
                    <h1>Analytics &mdash; Customers</h1>
                    <div className="subtitle">Where players come from and how they click</div>
                </div>
                <AnalyticsFilterBar />
            </div>

            <div className="two-col">
                <BarListPanel
                    title="Traffic Sources"
                    subtitle="By visit referrer"
                    hint={agentHint}
                    emptyLabel="No visits in this range"
                    rows={(traffic?.referrers ?? []).map((r) => ({ name: r.source, count: r.count }))}
                />
                <BarListPanel
                    title="Devices"
                    subtitle="From visit user agents"
                    hint={agentHint}
                    emptyLabel="No visits in this range"
                    rows={[
                        { name: 'Mobile', count: traffic?.devices.mobile ?? 0 },
                        { name: 'Desktop', count: traffic?.devices.desktop ?? 0 },
                        { name: 'Other', count: traffic?.devices.other ?? 0 },
                    ]}
                />
            </div>

            <div className="two-col">
                <BarListPanel
                    title="New vs Returning Visitors"
                    subtitle="First-ever visit inside range = new"
                    hint={agentHint}
                    emptyLabel="No visitors in this range"
                    rows={[
                        { name: 'New', count: traffic?.new_vs_returning.new ?? 0 },
                        { name: 'Returning', count: traffic?.new_vs_returning.returning ?? 0 },
                    ]}
                />
                <BarListPanel
                    title="Repeat Clickers"
                    subtitle="Clicked deposit on 2+ distinct days"
                    emptyLabel="No clickers in this range"
                    rows={[
                        { name: 'Repeat (2+ days)', count: insights?.repeat_clickers ?? 0 },
                        { name: 'One-day only', count: insights?.one_day_clickers ?? 0 },
                    ]}
                />
            </div>

            <div className="two-col">
                <BarListPanel
                    title="Clicks per Visitor"
                    subtitle="Distribution across the range"
                    emptyLabel="No clicks in this range"
                    rows={DISTRIBUTION_ORDER.map((bucket) => ({
                        name: `${bucket} click${bucket === '1' ? '' : 's'}`,
                        count: insights?.clicks_per_visitor_distribution[bucket] ?? 0,
                    }))}
                />
                <BarListPanel
                    title="Click Referrers"
                    subtitle="Pages the deposit clicks came from"
                    emptyLabel="No clicks in this range"
                    rows={(insights?.click_referrers ?? []).map((r) => ({ name: r.source, count: r.count }))}
                />
            </div>
        </>
    );
}
