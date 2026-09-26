import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import SettingsPage from '../pages/SettingsPage';

vi.mock('../../../../css/dashboard.css', () => ({}));

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

// A complete settings payload, as the API returns it after SettingSeeder.
const fullSettings = {
    prefill_message: 'Hi agent, I want to deposit',
    deposit_quick_amounts: [200, 500],
    deposit_message: 'Deposit {amount} {player_id}',
    player_id_storage_key: '',
    player_id_dom_selector: '',
    onboarding_video_url: '',
    agent_hide_after_hours: 12,
    public_refresh_interval_seconds: 60,
    show_offline_agents: true,
    warn_on_offline_click: true,
    shuffle_live_agents: true,
    withdrawals_enabled: false,
    withdrawal_min: 200,
    withdrawal_max_default: 10000,
    withdrawal_quick_amounts: [200, 500],
    withdrawal_redirect_path: '/sport/popup/withdrawal',
    withdrawal_howto_video_url: '',
    deposit_howto_video_url: '',
    withdrawal_no_match_behavior: 'closest',
    withdrawal_bank_options: ['TeleBirr'],
    withdrawal_require_payout_details: true,
    withdrawal_message_with_amount: 'x',
    withdrawal_message_no_amount: 'y',
    recents_enabled: true,
    recents_count: 5,
    pair_mode_enabled: false,
    pair_size: 2,
    pair_reset_enabled: false,
    pair_reset_hours: 72,
};

function setup(overrides: Record<string, unknown> = {}) {
    const settings = { ...fullSettings, ...overrides };
    mockedGet.mockResolvedValue({ data: { data: { settings, embed_base_url: 'http://localhost:8001' } } });
    mockedPatch.mockImplementation(async (_url: string, body?: unknown) => ({
        data: { data: { settings: { ...settings, ...(body as object) }, embed_base_url: 'http://localhost:8001' } },
    }));
    return render(
        <MemoryRouter>
            <SettingsPage />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('Player Agent Pairing panel', () => {
    it('shows the pair rule switch and the agents-per-player choice', async () => {
        setup();
        await waitFor(() => expect(screen.getByText('Player Agent Pairing')).toBeInTheDocument());
        expect(screen.getByText('Pair rule — each player only sees their own agents')).toBeInTheDocument();
        expect(screen.getByDisplayValue('2 agents (recommended)')).toBeInTheDocument();
    });

    it('saves only the pair fields when the admin turns it on and picks 3', async () => {
        const user = userEvent.setup();
        setup({ player_id_storage_key: 'player.id' });
        await waitFor(() => expect(screen.getByText('Player Agent Pairing')).toBeInTheDocument());

        const title = screen.getByText('Pair rule — each player only sees their own agents');
        const row = title.parentElement!.parentElement!;
        await user.click(row.querySelector('button')!);
        await user.selectOptions(screen.getByDisplayValue('2 agents (recommended)'), '3');

        const panel = title.closest('.panel')!;
        await user.click(panel.querySelector('.panel-foot .btn-primary')!);

        await waitFor(() => expect(mockedPatch).toHaveBeenCalled());
        expect(mockedPatch).toHaveBeenCalledWith('/api/admin/settings', { pair_mode_enabled: true, pair_size: 3 });
    });

    it('saves the reset switch and the reset hours', async () => {
        const user = userEvent.setup();
        setup({ player_id_storage_key: 'player.id' });
        await waitFor(() => expect(screen.getByText('Reset pairs automatically')).toBeInTheDocument());

        const title = screen.getByText('Reset pairs automatically');
        await user.click(title.parentElement!.parentElement!.querySelector('button')!);
        const hours = screen.getByLabelText(/Reset every/) as HTMLInputElement;
        expect(hours.value).toBe('72');
        await user.clear(hours);
        await user.type(hours, '36');

        const panel = title.closest('.panel')!;
        await user.click(panel.querySelector('.panel-foot .btn-primary')!);

        await waitFor(() => expect(mockedPatch).toHaveBeenCalled());
        expect(mockedPatch).toHaveBeenCalledWith('/api/admin/settings', { pair_reset_enabled: true, pair_reset_hours: 36 });
    });

    it('warns when the pair rule is on but Player-ID auto-detect is not configured', async () => {
        setup({ pair_mode_enabled: true });
        await waitFor(() => expect(screen.getByText('Player Agent Pairing')).toBeInTheDocument());
        expect(screen.getByText(/Player-ID auto-detect isn.t configured/)).toBeInTheDocument();
    });

    it('does not warn when auto-detect is configured', async () => {
        setup({ pair_mode_enabled: true, player_id_storage_key: 'player.id' });
        await waitFor(() => expect(screen.getByText('Player Agent Pairing')).toBeInTheDocument());
        expect(screen.queryByText(/Player-ID auto-detect isn.t configured/)).toBeNull();
    });
});
