import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../pages/SettingsPage';

// Mock CSS
vi.mock('../../../../css/dashboard.css', () => ({}));

// Mock api
vi.mock('@/api', () => ({
    default: {
        get: vi.fn(),
        patch: vi.fn(),
    },
}));

import api from '@/api';

const mockedGet = vi.mocked(api.get);
const mockedPatch = vi.mocked(api.patch);

const mockSettings = {
    prefill_message: 'Hi Kemerbet agent, I want to deposit',
    agent_hide_after_hours: 12,
    public_refresh_interval_seconds: 60,
    show_offline_agents: true,
    warn_on_offline_click: true,
    shuffle_live_agents: true,
};

function setupMocks() {
    mockedGet.mockResolvedValue({ data: { data: { ...mockSettings } } });
}

function renderPage() {
    return render(
        <MemoryRouter>
            <SettingsPage />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('SettingsPage', () => {
    // 1. Renders all 6 settings from API
    it('renders all 6 settings from API', async () => {
        setupMocks();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Telegram Pre-filled Message')).toBeInTheDocument();
        });

        expect(screen.getByText('Agent Behavior')).toBeInTheDocument();
        expect(screen.getByText('Show offline agents on public page')).toBeInTheDocument();
        expect(screen.getByText('Warn players before clicking offline agents')).toBeInTheDocument();
        expect(screen.getByText('Shuffle live agents on each refresh')).toBeInTheDocument();
        expect(screen.getByDisplayValue('Hi Kemerbet agent, I want to deposit')).toBeInTheDocument();
    });

    // 2. Save button is disabled when no changes
    it('save button is disabled when no changes', async () => {
        setupMocks();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Telegram Pre-filled Message')).toBeInTheDocument();
        });

        const saveButtons = screen.getAllByText('Save');
        saveButtons.forEach((btn) => {
            expect(btn).toBeDisabled();
        });
    });

    // 3. Save calls API with only changed fields
    it('save calls API with only changed fields', async () => {
        setupMocks();
        mockedPatch.mockResolvedValue({
            data: { data: { ...mockSettings, prefill_message: 'New message' } },
        });

        const user = userEvent.setup();

        renderPage();

        await waitFor(() => {
            expect(screen.getByDisplayValue('Hi Kemerbet agent, I want to deposit')).toBeInTheDocument();
        });

        const textarea = screen.getByDisplayValue('Hi Kemerbet agent, I want to deposit');
        await user.clear(textarea);
        await user.type(textarea, 'New message');

        const saveBtn = screen.getAllByText('Save')[0];
        expect(saveBtn).not.toBeDisabled();
        await user.click(saveBtn);

        await waitFor(() => {
            expect(mockedPatch).toHaveBeenCalledWith('/api/admin/settings', {
                prefill_message: 'New message',
            });
        });
    });

    // 4. Shows error when save fails
    it('shows error when save fails with validation error', async () => {
        setupMocks();
        mockedPatch.mockRejectedValue({
            response: { data: { message: 'The prefill message must not be greater than 200 characters.' } },
        });

        const user = userEvent.setup();

        renderPage();

        await waitFor(() => {
            expect(screen.getByDisplayValue('Hi Kemerbet agent, I want to deposit')).toBeInTheDocument();
        });

        const textarea = screen.getByDisplayValue('Hi Kemerbet agent, I want to deposit');
        await user.clear(textarea);
        await user.type(textarea, 'Changed');

        const saveBtn = screen.getAllByText('Save')[0];
        await user.click(saveBtn);

        await waitFor(() => {
            expect(screen.getByText(/must not be greater than 200 characters/)).toBeInTheDocument();
        });
    });

    // 5. Shows preview banners for non-functional sections
    it('shows preview banners for non-functional sections', async () => {
        setupMocks();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Telegram Pre-filled Message')).toBeInTheDocument();
        });

        expect(screen.getByText(/not yet functional/i)).toBeInTheDocument();
        expect(screen.getByText(/not yet wired up/i)).toBeInTheDocument();
    });
});
