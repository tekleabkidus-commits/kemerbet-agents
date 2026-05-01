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
        post: vi.fn(),
    },
}));

import api from '@/api';

const mockedGet = vi.mocked(api.get);
const mockedPatch = vi.mocked(api.patch);
const mockedPost = vi.mocked(api.post);

const mockSettings = {
    prefill_message: 'Hi Kemerbet agent, I want to deposit',
    agent_hide_after_hours: 12,
    public_refresh_interval_seconds: 60,
    show_offline_agents: true,
    warn_on_offline_click: true,
    shuffle_live_agents: true,
};

function setupMocks() {
    mockedGet.mockResolvedValue({
        data: {
            data: {
                settings: { ...mockSettings },
                embed_base_url: 'http://localhost:8001',
            },
        },
    });
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
            data: {
                data: {
                    settings: { ...mockSettings, prefill_message: 'New message' },
                    embed_base_url: 'http://localhost:8001',
                },
            },
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

    // 6. Renders embed snippet with embed_base_url from API
    it('renders embed snippet with base URL from API response', async () => {
        setupMocks();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Install Embed')).toBeInTheDocument();
        });

        expect(screen.getByText(/kemerbet-agents/)).toBeInTheDocument();
        expect(screen.getByText(/localhost:8001\/embed\/embed\.js/)).toBeInTheDocument();
    });

    // 7. Security tab renders password form
    it('security tab renders password change form', async () => {
        setupMocks();

        const user = userEvent.setup();
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Settings')).toBeInTheDocument();
        });

        const securityTab = screen.getByText('Security');
        await user.click(securityTab);

        await waitFor(() => {
            expect(screen.getByText('Change Password')).toBeInTheDocument();
        });

        expect(screen.getByLabelText('Current Password')).toBeInTheDocument();
        expect(screen.getByLabelText('New Password')).toBeInTheDocument();
        expect(screen.getByLabelText('Confirm New Password')).toBeInTheDocument();
        expect(screen.getByText('Update Password')).toBeInTheDocument();
    });

    // 8. Security tab shows server errors on 422
    it('security tab shows error when password change fails', async () => {
        setupMocks();
        mockedPost.mockRejectedValue({
            response: {
                data: {
                    errors: { current_password: ['Current password is incorrect.'] },
                },
            },
        });

        const user = userEvent.setup();
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Settings')).toBeInTheDocument();
        });

        await user.click(screen.getByText('Security'));

        await waitFor(() => {
            expect(screen.getByText('Change Password')).toBeInTheDocument();
        });

        await user.type(screen.getByLabelText('Current Password'), 'wrong');
        await user.type(screen.getByLabelText('New Password'), 'newpass123');
        await user.type(screen.getByLabelText('Confirm New Password'), 'newpass123');
        await user.click(screen.getByText('Update Password'));

        await waitFor(() => {
            expect(screen.getByText('Current password is incorrect.')).toBeInTheDocument();
        });
    });

    // 9. Copy button attempts clipboard write and shows feedback
    it('shows copied feedback when copy button clicked', async () => {
        setupMocks();

        // Provide clipboard API for jsdom
        Object.defineProperty(navigator, 'clipboard', {
            value: { writeText: vi.fn().mockResolvedValue(undefined) },
            writable: true,
            configurable: true,
        });

        const user = userEvent.setup();
        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Install Embed')).toBeInTheDocument();
        });

        const copyBtn = screen.getByText(/Copy snippet/);
        await user.click(copyBtn);

        // The button should show "Copied!" feedback
        await waitFor(() => {
            expect(screen.getByText(/Copied/)).toBeInTheDocument();
        });
    });
});
