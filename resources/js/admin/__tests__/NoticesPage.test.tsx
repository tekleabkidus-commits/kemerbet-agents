import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import NoticesPage from '../pages/NoticesPage';

// Mock api
vi.mock('@/api', () => ({
    default: {
        get: vi.fn(),
        post: vi.fn(),
        put: vi.fn(),
        delete: vi.fn(),
    },
}));

import api from '@/api';

const mockedGet = vi.mocked(api.get);
const mockedPost = vi.mocked(api.post);

// --- Mock data ---

const mockNotices = [
    {
        id: 1,
        title: 'Payout change',
        body: 'Payouts move to Fridays.',
        priority: 'urgent',
        is_active: true,
        starts_at: null,
        ends_at: null,
        send_push: false,
        status: 'active',
        created_at: '2026-08-14T10:00:00+03:00',
    },
    {
        id: 2,
        title: null,
        body: 'Old maintenance window notice.',
        priority: 'info',
        is_active: true,
        starts_at: null,
        ends_at: '2026-08-01T00:00:00+03:00',
        send_push: false,
        status: 'expired',
        created_at: '2026-07-20T10:00:00+03:00',
    },
];

function setupMocks() {
    mockedGet.mockResolvedValue({
        data: {
            data: mockNotices,
            meta: { current_page: 1, last_page: 1, per_page: 100, total: 2 },
        },
    });
}

function renderPage() {
    return render(
        <MemoryRouter>
            <NoticesPage />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('NoticesPage', () => {
    // 1. Renders list of notices from API with badges
    it('renders list of notices from API', async () => {
        setupMocks();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Payout change')).toBeInTheDocument();
        });

        expect(screen.getByText('Payouts move to Fridays.')).toBeInTheDocument();
        expect(screen.getByText('Old maintenance window notice.')).toBeInTheDocument();
        expect(screen.getByText('Urgent')).toBeInTheDocument();
        expect(screen.getByText('Active')).toBeInTheDocument();
        expect(screen.getByText('Expired')).toBeInTheDocument();
    });

    // 2. Creates a notice via the modal
    it('creates a notice', async () => {
        setupMocks();
        mockedPost.mockResolvedValue({ data: { data: { ...mockNotices[0], id: 3 } } });

        const user = userEvent.setup();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Payout change')).toBeInTheDocument();
        });

        await user.click(screen.getByText('+ New Notice'));
        expect(screen.getByText('New Notice')).toBeInTheDocument();

        await user.type(
            screen.getByPlaceholderText('What should agents know?'),
            'System maintenance tonight',
        );
        await user.click(screen.getByText('Send push notification to agents'));
        await user.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(mockedPost).toHaveBeenCalledWith('/api/admin/notices', {
                title: null,
                body: 'System maintenance tonight',
                priority: 'info',
                is_active: true,
                starts_at: null,
                ends_at: null,
                send_push: true,
            });
        });
    });
});
