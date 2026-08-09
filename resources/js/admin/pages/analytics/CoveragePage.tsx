import { useCallback, useEffect, useState } from 'react';
import api from '@/api';
import {
    AnalyticsFilterBar, useAnalyticsFilters,
    HEATMAP_DAYS, HeatmapGrid, buildHeatmapGrid, formatShortDate,
} from './shared';

interface MatrixCell {
    day: number;
    hour: number;
}

interface LiveCell extends MatrixCell {
    avg_agents_live: number;
}

interface ClickCell extends MatrixCell {
    count: number;
}

interface GapHour {
    date: string;
    hour: number;
}

interface CoverageData {
    live_matrix: LiveCell[];
    clicks_matrix: ClickCell[];
    gap_hours: GapHour[];
}

const MAX_GAPS_SHOWN = 168;

export default function CoveragePage() {
    const { apiQuery } = useAnalyticsFilters();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [coverage, setCoverage] = useState<CoverageData | null>(null);
    const [offlineAttempts, setOfflineAttempts] = useState<number>(0);

    const fetchAll = useCallback(async () => {
        const [coverageRes, insightsRes] = await Promise.all([
            api.get(`/api/admin/stats/coverage?${apiQuery}`),
            api.get(`/api/admin/stats/clicks-insights?${apiQuery}`),
        ]);
        setCoverage(coverageRes.data.data);
        setOfflineAttempts(insightsRes.data.data.offline_click_attempts);
    }, [apiQuery]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchAll()
            .catch(() => setError('Failed to load coverage analytics'))
            .finally(() => setLoading(false));
    }, [fetchAll]);

    function handleRetry() {
        setLoading(true);
        setError(null);
        fetchAll()
            .catch(() => setError('Failed to load coverage analytics'))
            .finally(() => setLoading(false));
    }

    if (loading) {
        return <div className="dash-loading">Loading coverage analytics...</div>;
    }

    const liveGrid = buildHeatmapGrid(
        (coverage?.live_matrix ?? []).map((c) => ({ day: c.day, hour: c.hour, value: c.avg_agents_live })),
    );
    const clicksGrid = buildHeatmapGrid(
        (coverage?.clicks_matrix ?? []).map((c) => ({ day: c.day, hour: c.hour, value: c.count })),
    );

    const gaps = coverage?.gap_hours ?? [];
    const shownGaps = gaps.slice(0, MAX_GAPS_SHOWN);

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
                    <h1>Analytics &mdash; Coverage</h1>
                    <div className="subtitle">When agents are live vs when players want to deposit</div>
                </div>
                <AnalyticsFilterBar />
            </div>

            <div className="two-col">
                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">Agent Coverage</div>
                        <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Avg agents live, day &times; hour</div>
                    </div>
                    <div className="panel-body">
                        {(coverage?.live_matrix ?? []).length === 0 ? (
                            <div className="empty-state"><h3>No live sessions in this range</h3></div>
                        ) : (
                            <HeatmapGrid data={liveGrid} days={HEATMAP_DAYS} />
                        )}
                    </div>
                </div>

                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">Click Demand</div>
                        <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>Deposit clicks, day &times; hour</div>
                    </div>
                    <div className="panel-body">
                        {(coverage?.clicks_matrix ?? []).length === 0 ? (
                            <div className="empty-state"><h3>No clicks in this range</h3></div>
                        ) : (
                            <HeatmapGrid data={clicksGrid} days={HEATMAP_DAYS} />
                        )}
                    </div>
                </div>
            </div>

            <div className="two-col">
                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">Coverage Gaps</div>
                        <div style={{ fontSize: '.74rem', color: 'var(--text-dim)' }}>
                            {gaps.length.toLocaleString()} hour slot{gaps.length === 1 ? '' : 's'} with zero live agents
                        </div>
                    </div>
                    <div className="panel-body">
                        {gaps.length === 0 ? (
                            <div className="empty-state"><h3>No gaps — full coverage in this range</h3></div>
                        ) : (
                            <>
                                <div style={{ maxHeight: 260, overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                                    {shownGaps.map((g) => (
                                        <span
                                            key={`${g.date}-${g.hour}`}
                                            style={{
                                                fontSize: '.72rem', color: 'var(--text-muted)',
                                                border: '1px solid var(--border)', borderRadius: 6, padding: '3px 8px',
                                            }}
                                        >
                                            {formatShortDate(g.date)} {String(g.hour).padStart(2, '0')}:00
                                        </span>
                                    ))}
                                </div>
                                {gaps.length > MAX_GAPS_SHOWN && (
                                    <div style={{ marginTop: 10, fontSize: '.74rem', color: 'var(--text-dim)' }}>
                                        +{(gaps.length - MAX_GAPS_SHOWN).toLocaleString()} more not shown
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="panel">
                    <div className="panel-head">
                        <div className="panel-title">Offline Click Attempts</div>
                    </div>
                    <div className="panel-body">
                        <div style={{ fontSize: '2rem', fontWeight: 800, color: offlineAttempts > 0 ? 'var(--gold)' : 'var(--green)' }}>
                            {offlineAttempts.toLocaleString()}
                        </div>
                        <div style={{ fontSize: '.78rem', color: 'var(--text-muted)', marginTop: 8, lineHeight: 1.5 }}>
                            Deposit clicks that arrived while the agent was not live, judged by the
                            agent&apos;s status-event history at click time. Each one is a player who
                            wanted to deposit but found the agent offline.
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
}
