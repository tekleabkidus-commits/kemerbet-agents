import { useCallback, useEffect, useState } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts';
import api from '@/api';
import { AnalyticsFilterBar, useAnalyticsFilters, ChartTooltip, formatAxisTick, pad } from './shared';

interface AmountBucket {
    label: string;
    count: number;
}

interface HourBucket {
    hour: number;
    count: number;
}

interface WithdrawalDemand {
    total_requests: number;
    total_amount: number;
    avg_amount: number;
    filled: number;
    unmet: number;
    fill_rate: number;
    by_amount: AmountBucket[];
    by_hour: HourBucket[];
}

function fmtEtb(n: number): string {
    return n.toLocaleString('en-US');
}

export default function WithdrawalsPage() {
    const { apiQuery } = useAnalyticsFilters();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [data, setData] = useState<WithdrawalDemand | null>(null);

    const fetchData = useCallback(async () => {
        const res = await api.get(`/api/admin/stats/withdrawal-demand?${apiQuery}`);
        setData(res.data.data as WithdrawalDemand);
    }, [apiQuery]);

    useEffect(() => {
        setLoading(true);
        setError(null);
        fetchData()
            .catch(() => setError('Failed to load withdrawal analytics'))
            .finally(() => setLoading(false));
    }, [fetchData]);

    function handleRetry() {
        setLoading(true);
        setError(null);
        fetchData()
            .catch(() => setError('Failed to load withdrawal analytics'))
            .finally(() => setLoading(false));
    }

    const maxAmount = data ? Math.max(1, ...data.by_amount.map((b) => b.count)) : 1;

    return (
        <>
            <div className="page-head">
                <div>
                    <h1>Withdrawals</h1>
                    <div className="subtitle">Player withdrawal demand, fill rate, and timing</div>
                </div>
            </div>

            <AnalyticsFilterBar />

            {loading ? (
                <div className="empty-state"><div className="icon">&#8987;</div></div>
            ) : error ? (
                <div className="dash-error">
                    <span>{error}</span>
                    <button className="btn btn-sm btn-danger" onClick={handleRetry}>Retry</button>
                </div>
            ) : data ? (
                <>
                    {/* Stat tiles */}
                    <div className="stat-grid" style={{ marginBottom: 20 }}>
                        <div className="stat-card">
                            <div className="stat-card-label">Withdrawal requests</div>
                            <div className="stat-card-value">{fmtEtb(data.total_requests)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-label">Total requested</div>
                            <div className="stat-card-value">{fmtEtb(data.total_amount)} <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>ETB</span></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-label">Average request</div>
                            <div className="stat-card-value">{fmtEtb(data.avg_amount)} <span style={{ fontSize: '.7rem', color: 'var(--text-muted)' }}>ETB</span></div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card-label">Fill rate</div>
                            <div className="stat-card-value">{data.fill_rate}%</div>
                            <div style={{ fontSize: '.72rem', color: 'var(--text-muted)', marginTop: 4 }}>
                                {fmtEtb(data.filled)} filled &middot; {fmtEtb(data.unmet)} unmet
                            </div>
                        </div>
                    </div>

                    {/* Demand by amount */}
                    <div className="panel" style={{ marginBottom: 20 }}>
                        <div className="panel-head"><div className="panel-title">Demand by amount</div></div>
                        <div className="panel-body">
                            {data.by_amount.every((b) => b.count === 0) ? (
                                <div style={{ color: 'var(--text-dim)', fontSize: '.85rem', padding: '8px 0' }}>No withdrawal requests in this range.</div>
                            ) : (
                                <div className="bar-list">
                                    {data.by_amount.map((b) => (
                                        <div className="bar-row" key={b.label}>
                                            <div className="bar-label">{b.label}</div>
                                            <div className="bar-track">
                                                <div className="bar-fill" style={{ width: `${(b.count / maxAmount) * 100}%`, background: 'linear-gradient(90deg, var(--gold), var(--gold-light))' }} />
                                            </div>
                                            <div className="bar-value">{b.count}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Demand by hour */}
                    <div className="panel">
                        <div className="panel-head"><div className="panel-title">Demand by hour (EAT)</div></div>
                        <div className="panel-body">
                            <div style={{ width: '100%', height: 260 }}>
                                <ResponsiveContainer>
                                    <BarChart data={data.by_hour} margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
                                        <XAxis
                                            dataKey="hour"
                                            tickFormatter={(h: number) => `${pad(h)}`}
                                            tick={{ fontSize: 11, fill: 'var(--text-muted)' }}
                                            interval={1}
                                        />
                                        <YAxis tickFormatter={formatAxisTick} tick={{ fontSize: 11, fill: 'var(--text-muted)' }} allowDecimals={false} width={36} />
                                        <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                                        <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                                            {data.by_hour.map((h) => (
                                                <Cell key={h.hour} fill="var(--gold)" />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>
                </>
            ) : null}
        </>
    );
}
