import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import ActivityPage from '../pages/ActivityPage';

// Mock CSS
vi.mock('../../../../css/dashboard.css', () => ({}));

// Mock api
vi.mock('@/api', () => ({
    default: {
        get: vi.fn(),
    },
}));

import api from '@/api';

const mockedGet = vi.mocked(api.get);

// --- Mock data ---

const todayIso = new Date().toISOString().slice(0, 10);
const yesterdayIso = new Date(Date.now() - 86400000).toISOString().slice(0, 10);

const mockEvents = [
    {
        id: 1, agent_id: 7, event_type: 'went_online', duration_minutes: 60, ip_address: '196.188.1.1',
        created_at: `${todayIso}T14:47:00.000000Z`,
        agent: { id: 7, display_number: 7, telegram_username: 'DOITFAST21', status: 'active', deleted_at: null },
        admin_id: null, admin: null,
    },
    {
        id: 2, agent_id: 3, event_type: 'went_offline', duration_minutes: null, ip_address: null,
        created_at: `${todayIso}T14:35:00.000000Z`,
        agent: { id: 3, display_number: 3, telegram_username: 'yehoneagent', status: 'active', deleted_at: null },
        admin_id: null, admin: null,
    },
    {
        id: 3, agent_id: 22, event_type: 'extended', duration_minutes: 30, ip_address: null,
        created_at: `${yesterdayIso}T21:15:00.000000Z`,
        agent: { id: 22, display_number: 22, telegram_username: 'obina_t', status: 'active', deleted_at: null },
        admin_id: null, admin: null,
    },
    {
        id: 4, agent_id: 8, event_type: 'token_regenerated', duration_minutes: null, ip_address: null,
        created_at: `${yesterdayIso}T20:43:00.000000Z`,
        agent: { id: 8, display_number: 8, telegram_username: 'Aandu22', status: 'active', deleted_at: null },
        admin_id: 1, admin: { id: 1, name: 'Kidus T.', email: 'kidus@kemerbet.com' },
    },
];

function setupMocks(events = mockEvents) {
    mockedGet.mockResolvedValue({
        data: {
            data: events,
            meta: { current_page: 1, last_page: 1, per_page: 50, total: events.length },
        },
    });
}

function renderPage() {
    return render(
        <MemoryRouter>
            <ActivityPage />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('ActivityPage', () => {
    // 1. Renders timeline with events grouped by day
    it('renders timeline with events grouped by day', async () => {
        setupMocks();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText(/Activity Log/)).toBeInTheDocument();
        });

        // Should have day group headers — at least "Today" and "Yesterday"
        expect(screen.getByText(/Today/)).toBeInTheDocument();
        expect(screen.getByText(/Yesterday/)).toBeInTheDocument();

        // Event descriptions visible
        expect(screen.getByText(/Agent 7.*went online/)).toBeInTheDocument();
        expect(screen.getByText(/Agent 3.*went offline/)).toBeInTheDocument();
        expect(screen.getByText(/Agent 22.*extended session/)).toBeInTheDocument();
    });

    // 2. Renders empty state when no events
    it('renders empty state when no events', async () => {
        setupMocks([]);

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('No activity yet')).toBeInTheDocument();
        });

        expect(screen.getByText(/Events will appear here/)).toBeInTheDocument();
    });

    // 3. Filter change triggers new API call with filter param
    it('filter change triggers new API call', async () => {
        setupMocks();
        const user = userEvent.setup();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText(/Activity Log/)).toBeInTheDocument();
        });

        // Change event type filter
        const filterSelect = screen.getByDisplayValue('All event types');
        await user.selectOptions(filterSelect, 'went_online');

        await waitFor(() => {
            const onlineCall = mockedGet.mock.calls.find(
                (c) => c[0].includes('event_type') && c[0].includes('went_online'),
            );
            expect(onlineCall).toBeDefined();
        });
    });
});
