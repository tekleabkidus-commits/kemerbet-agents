import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AnalyticsPage from '../pages/AnalyticsPage';

// Mock CSS imports (jsdom can't process CSS files)
vi.mock('../../../../css/analytics.css', () => ({}));
vi.mock('../../../../css/dashboard.css', () => ({}));

// Mock Recharts — ResponsiveContainer needs parent dimensions which jsdom doesn't provide
vi.mock('recharts', async () => {
    const actual = await vi.importActual('recharts');
    return {
        ...(actual as object),
        ResponsiveContainer: ({ children }: { children: React.ReactNode }) => (
            <div style={{ width: 800, height: 300 }}>{children}</div>
        ),
    };
});

// Mock the api module
vi.mock('@/api', () => ({
    default: {
        get: vi.fn(),
    },
}));

import api from '@/api';

const mockedGet = vi.mocked(api.get);

// --- Mock data ---

const mockOverview = {
    total_visits: 1000,
    unique_visitors: 800,
    deposit_clicks: 100,
    chat_clicks: 5,
    total_minutes_live: 5000,
    total_sessions: 50,
    ctr: 14.567,
};

const mockPrevOverview = {
    total_visits: 900,
    unique_visitors: 700,
    deposit_clicks: 90,
    chat_clicks: 3,
    total_minutes_live: 4500,
    total_sessions: 45,
    ctr: 10.0,
};

const mockTimeline = [
    { date: '2026-04-24', total_visits: 100, unique_visitors: 80, deposit_clicks: 10, chat_clicks: 0 },
    { date: '2026-04-25', total_visits: 150, unique_visitors: 120, deposit_clicks: 15, chat_clicks: 1 },
];

const mockHeatmap = [
    { day: 4, hour: 14, count: 5 },
    { day: 1, hour: 20, count: 12 },
];

const mockPaymentMethods = [
    { slug: 'telebirr', display_name: 'TeleBirr', agent_count: 20, click_count: 50 },
    { slug: 'cbe_birr', display_name: 'CBE Birr', agent_count: 10, click_count: 30 },
];

const mockLeaderboard = [
    {
        agent_id: 3, display_number: 3, telegram_username: 'yehoneagent',
        deposit_clicks: 50, minutes_live: 120, times_went_online: 5,
        click_rate: 0.42, last_seen_at: null, is_live: false,
    },
];

// --- Helpers ---

function setupSuccessfulMocks(overrides?: {
    overview?: typeof mockOverview;
    leaderboard?: typeof mockLeaderboard;
}) {
    mockedGet.mockImplementation((url: string) => {
        if (url.includes('/stats/overview') && url.includes('custom')) {
            return Promise.resolve({ data: { range: {}, data: mockPrevOverview } });
        }
        if (url.includes('/stats/overview')) {
            return Promise.resolve({ data: { range: {}, data: overrides?.overview ?? mockOverview } });
        }
        if (url.includes('/stats/timeline')) {
            return Promise.resolve({ data: { range: {}, data: mockTimeline } });
        }
        if (url.includes('/stats/heatmap')) {
            return Promise.resolve({ data: { range: {}, data: mockHeatmap } });
        }
        if (url.includes('/stats/payment-methods')) {
            return Promise.resolve({ data: { range: {}, data: mockPaymentMethods } });
        }
        if (url.includes('/stats/leaderboard')) {
            return Promise.resolve({ data: { range: {}, data: overrides?.leaderboard ?? mockLeaderboard } });
        }
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
}

function renderAnalytics() {
    return render(
        <MemoryRouter>
            <AnalyticsPage />
        </MemoryRouter>,
    );
}

// --- Tests ---

beforeEach(() => {
    vi.clearAllMocks();
});

describe('AnalyticsPage', () => {
    // 1. Loading state on mount
    it('shows loading state before data arrives', () => {
        mockedGet.mockReturnValue(new Promise(() => {}));

        renderAnalytics();

        expect(screen.getByText('Loading analytics...')).toBeInTheDocument();
    });

    // 2. All 5 sections render after data loads
    it('renders all sections after successful load', async () => {
        setupSuccessfulMocks();

        renderAnalytics();

        await waitFor(() => {
            expect(screen.getByText('Analytics')).toBeInTheDocument();
        });

        // Stat card labels
        expect(screen.getByText('Total Visitors')).toBeInTheDocument();
        expect(screen.getByText('Unique Visitors')).toBeInTheDocument();
        expect(screen.getByText('Deposit Clicks')).toBeInTheDocument();
        expect(screen.getByText('Click-Through Rate')).toBeInTheDocument();

        // Panel titles
        expect(screen.getByText('Traffic & Clicks Over Time')).toBeInTheDocument();
        expect(screen.getByText('When players deposit')).toBeInTheDocument();
        expect(screen.getByText('Payment Methods')).toBeInTheDocument();
        expect(screen.getByText('Agent Leaderboard')).toBeInTheDocument();
    });

    // 3. Error state on API failure
    it('shows error state when API fails', async () => {
        mockedGet.mockRejectedValue(new Error('Network error'));

        renderAnalytics();

        await waitFor(() => {
            expect(screen.getByText('Failed to load analytics')).toBeInTheDocument();
        });

        expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    // 4. Date range change triggers refetch with new range
    it('refetches with new range when date select changes', async () => {
        setupSuccessfulMocks();
        const user = userEvent.setup();

        renderAnalytics();

        await waitFor(() => {
            expect(screen.getByText('Analytics')).toBeInTheDocument();
        });

        const rangeSelect = screen.getByDisplayValue('Last 7 days');
        await user.selectOptions(rangeSelect, '30d');

        await waitFor(() => {
            const overview30d = mockedGet.mock.calls.find(
                (c) => c[0].includes('/stats/overview') && c[0].includes('range=30d') && !c[0].includes('range=custom'),
            );
            expect(overview30d).toBeDefined();
        });
    });

    // 5. Sort dropdown triggers leaderboard refetch
    it('refetches leaderboard when sort changes', async () => {
        setupSuccessfulMocks();
        const user = userEvent.setup();

        renderAnalytics();

        await waitFor(() => {
            expect(screen.getByText('Agent Leaderboard')).toBeInTheDocument();
        });

        const sortSelect = screen.getByDisplayValue('Sort by: Click Count');
        await user.selectOptions(sortSelect, 'minutes_live');

        await waitFor(() => {
            const leaderboardCall = mockedGet.mock.calls.find(
                (c) => c[0].includes('/stats/leaderboard') && c[0].includes('sort=minutes_live'),
            );
            expect(leaderboardCall).toBeDefined();
        });
    });

    // 6. Empty leaderboard shows empty state
    it('shows empty state when leaderboard is empty', async () => {
        setupSuccessfulMocks({ leaderboard: [] });

        renderAnalytics();

        await waitFor(() => {
            expect(screen.getByText('No agent data for selected range')).toBeInTheDocument();
        });
    });

    // 7. CTR formats with one decimal place
    it('formats CTR with one decimal place', async () => {
        setupSuccessfulMocks({ overview: { ...mockOverview, ctr: 14.567 } });

        renderAnalytics();

        await waitFor(() => {
            expect(screen.getByText('14.6%')).toBeInTheDocument();
        });
    });
});
