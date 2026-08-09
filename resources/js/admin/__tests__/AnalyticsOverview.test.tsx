import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Routes, Route, useLocation } from 'react-router-dom';
import OverviewPage from '../pages/analytics/OverviewPage';

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

vi.mock('@/api', () => ({
    default: {
        get: vi.fn(),
    },
}));

import api from '@/api';

const mockedGet = vi.mocked(api.get);

const mockFunnel = {
    current: { total_visits: 500, unique_visitors: 400, deposit_clicks: 120, unique_clickers: 90, visit_to_click_rate: 0.225 },
    previous: { total_visits: 400, unique_visitors: 300, deposit_clicks: 100, unique_clickers: 80, visit_to_click_rate: 0.2667 },
    change: { total_visits: 25, unique_visitors: 33.3, deposit_clicks: 20, unique_clickers: 12.5, visit_to_click_rate: -15.6 },
};

const mockRecords = {
    best_visit_day: { date: '2026-05-09', count: 240 },
    best_visit_hour: { hour: '2026-05-09 21:00:00', count: 40 },
    best_click_day: { date: '2026-05-09', count: 33 },
    best_click_hour: { hour: '2026-05-09 22:00:00', count: 9 },
};

function setupMocks() {
    mockedGet.mockImplementation((url: string) => {
        if (url.startsWith('/api/admin/stats/funnel')) return Promise.resolve({ data: { data: mockFunnel } });
        if (url.startsWith('/api/admin/stats/timeline')) return Promise.resolve({ data: { data: [] } });
        if (url.startsWith('/api/admin/stats/records')) return Promise.resolve({ data: { data: mockRecords } });
        if (url.startsWith('/api/admin/agents')) {
            return Promise.resolve({ data: { data: [{ id: 7, display_number: 7, telegram_username: 'seven' }], meta: {} } });
        }
        return Promise.reject(new Error(`unexpected url: ${url}`));
    });
}

function LocationProbe() {
    const location = useLocation();
    return <div data-testid="search">{location.search}</div>;
}

function renderPage(initialEntry = '/admin/analytics/overview') {
    return render(
        <MemoryRouter initialEntries={[initialEntry]}>
            <Routes>
                <Route path="/admin/analytics/overview" element={<><OverviewPage /><LocationProbe /></>} />
            </Routes>
        </MemoryRouter>,
    );
}

beforeEach(() => {
    mockedGet.mockReset();
    setupMocks();
});

describe('Analytics Overview page', () => {
    it('renders funnel stat cards with change arrows and records', async () => {
        renderPage();

        await waitFor(() => expect(screen.getByText('Total Visits')).toBeInTheDocument());
        expect(screen.getAllByText('500').length).toBeGreaterThan(0);
        expect(screen.getByText('↑ 25%')).toBeInTheDocument();
        expect(screen.getByText('Conversion Funnel')).toBeInTheDocument();
        expect(screen.getByText('All-Time Records')).toBeInTheDocument();
        expect(screen.getByText('240')).toBeInTheDocument();
    });
});

describe('Analytics filter bar', () => {
    it('writes range selection into URL search params and refetches', async () => {
        const user = userEvent.setup();
        renderPage();

        await waitFor(() => expect(screen.getByLabelText('Date range')).toBeInTheDocument());
        await user.selectOptions(screen.getByLabelText('Date range'), '30d');

        await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('range=30d'));
        expect(mockedGet.mock.calls.some(([url]) => String(url).includes('range=30d'))).toBe(true);
    });

    it('writes the hour filter into URL search params', async () => {
        const user = userEvent.setup();
        renderPage();

        await waitFor(() => expect(screen.getByLabelText('Hour from')).toBeInTheDocument());
        await user.selectOptions(screen.getByLabelText('Hour from'), '22');

        await waitFor(() => expect(screen.getByTestId('search')).toHaveTextContent('hour_from=22'));
        expect(mockedGet.mock.calls.some(([url]) => String(url).includes('hour_from=22'))).toBe(true);
    });

    it('restores filter state from the URL on load', async () => {
        renderPage('/admin/analytics/overview?range=30d&hour_from=22&hour_to=4');

        await waitFor(() => expect(screen.getByLabelText('Date range')).toHaveValue('30d'));
        expect(screen.getByLabelText('Hour from')).toHaveValue('22');
        expect(mockedGet.mock.calls.some(([url]) => String(url).includes('hour_from=22&hour_to=4'))).toBe(true);
    });
});
