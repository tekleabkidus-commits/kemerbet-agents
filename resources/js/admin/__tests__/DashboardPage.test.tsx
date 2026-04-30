import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import DashboardPage from '../pages/DashboardPage';

// Mock the CSS import (jsdom can't process CSS files)
vi.mock('../../../../css/dashboard.css', () => ({}));

// Mock the api module
vi.mock('@/api', () => ({
    default: {
        get: vi.fn(),
    },
}));

import api from '@/api';

const mockedGet = vi.mocked(api.get);

// --- Test data factories ---

function makeAgentsResponse(agents: Array<{
    id: number;
    display_number: number;
    telegram_username: string;
    computed_status: 'live' | 'offline';
    live_until: string | null;
    seconds_remaining: number | null;
}>) {
    return {
        data: {
            data: agents.map((a) => ({
                status: 'active',
                clicks_today: 0,
                ...a,
            })),
            meta: { current_page: 1, last_page: 1, per_page: 100, total: agents.length },
        },
    };
}

function makeOverviewResponse(overrides: Partial<{
    total_visits: number;
    unique_visitors: number;
    deposit_clicks: number;
    chat_clicks: number;
    total_minutes_live: number;
    total_sessions: number;
    ctr: number;
}> = {}) {
    return {
        data: {
            range: { from: '2026-04-30', to: '2026-04-30' },
            data: {
                total_visits: 100,
                unique_visitors: 50,
                deposit_clicks: 10,
                chat_clicks: 0,
                total_minutes_live: 120,
                total_sessions: 5,
                ctr: 10.0,
                ...overrides,
            },
        },
    };
}

function makeActivityResponse() {
    return {
        data: {
            data: [
                {
                    id: 1,
                    agent_id: 7,
                    agent: { id: 7, display_number: 7, telegram_username: 'DOITFAST21' },
                    event_type: 'went_online',
                    duration_minutes: 60,
                    created_at: new Date().toISOString(),
                },
            ],
            meta: { current_page: 1, last_page: 1, per_page: 20, total: 1 },
        },
    };
}

function makeLeaderboardResponse() {
    return {
        data: {
            range: { from: '2026-04-30', to: '2026-04-30' },
            data: [
                { agent_id: 3, display_number: 3, telegram_username: 'yehoneagent', deposit_clicks: 31, minutes_live: 252 },
            ],
        },
    };
}

function setupSuccessfulMocks(overrides?: { overview?: Partial<Parameters<typeof makeOverviewResponse>[0]>; agents?: Parameters<typeof makeAgentsResponse>[0] }) {
    const agents = overrides?.agents ?? [
        { id: 7, display_number: 7, telegram_username: 'DOITFAST21', computed_status: 'live' as const, live_until: new Date(Date.now() + 3600000).toISOString(), seconds_remaining: 3600 },
        { id: 1, display_number: 1, telegram_username: 'BIRHAN', computed_status: 'offline' as const, live_until: null, seconds_remaining: null },
    ];

    mockedGet.mockImplementation((url: string) => {
        if (url.includes('/api/admin/agents')) return Promise.resolve(makeAgentsResponse(agents));
        if (url.includes('/api/admin/stats/overview')) return Promise.resolve(makeOverviewResponse(overrides?.overview));
        if (url.includes('/api/admin/activity')) return Promise.resolve(makeActivityResponse());
        if (url.includes('/api/admin/stats/leaderboard')) return Promise.resolve(makeLeaderboardResponse());
        return Promise.reject(new Error(`Unmocked URL: ${url}`));
    });
}

function renderDashboard() {
    return render(
        <MemoryRouter>
            <DashboardPage />
        </MemoryRouter>,
    );
}

// --- Tests ---

beforeEach(() => {
    vi.clearAllMocks();
});

describe('DashboardPage', () => {
    // 1. Renders loading state on initial mount
    it('shows loading state before data arrives', () => {
        // Mock with never-resolving promises
        mockedGet.mockReturnValue(new Promise(() => {}));

        renderDashboard();

        expect(screen.getByText('Loading dashboard...')).toBeInTheDocument();
    });

    // 2. Renders all 4 sections after data loads
    it('renders all sections after successful load', async () => {
        setupSuccessfulMocks();

        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText('Dashboard')).toBeInTheDocument();
        });

        expect(screen.getByText('Currently Live')).toBeInTheDocument();
        expect(screen.getByText('Recent Activity')).toBeInTheDocument();
        expect(screen.getByText('Top Performers Today')).toBeInTheDocument();
        expect(screen.getByText('Live Agents')).toBeInTheDocument();
        expect(screen.getByText('Visitors Today')).toBeInTheDocument();
        expect(screen.getByText('Deposit Clicks')).toBeInTheDocument();
        expect(screen.getByText('Click-Through Rate')).toBeInTheDocument();
    });

    // 3. Shows error state when API call fails
    it('shows error state when API fails', async () => {
        mockedGet.mockRejectedValue(new Error('Network error'));

        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText('Failed to load dashboard')).toBeInTheDocument();
        });

        expect(screen.getByText('Retry')).toBeInTheDocument();
    });

    // 4. Shows empty state when zero live agents
    it('shows empty state when no agents are live', async () => {
        setupSuccessfulMocks({
            agents: [
                { id: 1, display_number: 1, telegram_username: 'OFFLINE1', computed_status: 'offline', live_until: null, seconds_remaining: null },
                { id: 2, display_number: 2, telegram_username: 'OFFLINE2', computed_status: 'offline', live_until: null, seconds_remaining: null },
            ],
        });

        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText('No agents currently live')).toBeInTheDocument();
        });

        expect(screen.getByText("When agents go online they'll appear here.")).toBeInTheDocument();
    });

    // 5. CTR formats correctly with one decimal place
    it('formats CTR with one decimal place', async () => {
        setupSuccessfulMocks({ overview: { ctr: 14.567 } });

        renderDashboard();

        await waitFor(() => {
            expect(screen.getByText('14.6%')).toBeInTheDocument();
        });
    });
});
