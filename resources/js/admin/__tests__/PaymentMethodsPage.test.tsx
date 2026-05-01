import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import PaymentMethodsPage from '../pages/PaymentMethodsPage';

// Mock CSS
vi.mock('../../../../css/dashboard.css', () => ({}));

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
const mockedPut = vi.mocked(api.put);
const mockedDelete = vi.mocked(api.delete);

// --- Mock data ---

const mockMethods = [
    { id: 1, slug: 'telebirr', display_name: 'TeleBirr', display_order: 10, is_active: true, icon_url: null, agents_count: 26 },
    { id: 2, slug: 'mpesa', display_name: 'M-Pesa', display_order: 20, is_active: true, icon_url: null, agents_count: 5 },
    { id: 3, slug: 'wegagen', display_name: 'Wegagen Bank', display_order: 80, is_active: false, icon_url: null, agents_count: 0 },
];

function setupMocks() {
    mockedGet.mockResolvedValue({ data: { data: mockMethods } });
}

function renderPage() {
    return render(
        <MemoryRouter>
            <PaymentMethodsPage />
        </MemoryRouter>,
    );
}

beforeEach(() => {
    vi.clearAllMocks();
});

describe('PaymentMethodsPage', () => {
    // 1. Renders list of methods from API
    it('renders list of methods from API', async () => {
        setupMocks();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('TeleBirr')).toBeInTheDocument();
        });

        expect(screen.getByText('M-Pesa')).toBeInTheDocument();
        expect(screen.getByText('Wegagen Bank')).toBeInTheDocument();
        expect(screen.getByText('telebirr')).toBeInTheDocument();
        expect(screen.getByText('26 agents')).toBeInTheDocument();
    });

    // 2. Opens Add modal when button clicked
    it('opens Add modal when button clicked', async () => {
        setupMocks();
        const user = userEvent.setup();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('TeleBirr')).toBeInTheDocument();
        });

        await user.click(screen.getByText('+ Add Method'));

        expect(screen.getByText('Add Payment Method')).toBeInTheDocument();
        expect(screen.getByPlaceholderText('e.g., Hibret Bank')).toBeInTheDocument();
    });

    // 3. Shows error when delete fails with 422 (linked agents)
    it('shows error when delete fails with 422', async () => {
        // Use a method with 0 agents so delete button is enabled
        mockedGet.mockResolvedValue({
            data: { data: [{ ...mockMethods[2] }] },
        });
        mockedDelete.mockRejectedValue({
            response: { data: { message: 'Cannot delete payment method: it is linked to 3 agent(s). Deactivate it instead.' } },
        });

        const user = userEvent.setup();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('Wegagen Bank')).toBeInTheDocument();
        });

        // Click delete button (× icon)
        const deleteBtn = screen.getByTitle('Delete');
        await user.click(deleteBtn);

        // Confirm modal should appear
        await waitFor(() => {
            expect(screen.getByText(/Are you sure you want to delete/)).toBeInTheDocument();
        });

        // Click confirm
        await user.click(screen.getByText('Delete', { selector: 'button.btn.btn-danger' }));

        // Error should appear
        await waitFor(() => {
            expect(screen.getByText(/Cannot delete payment method/)).toBeInTheDocument();
        });
    });

    // 4. Toggle flips is_active and calls API
    it('toggle calls API to deactivate', async () => {
        setupMocks();
        mockedPut.mockResolvedValue({ data: { data: { ...mockMethods[0], is_active: false } } });

        const user = userEvent.setup();

        renderPage();

        await waitFor(() => {
            expect(screen.getByText('TeleBirr')).toBeInTheDocument();
        });

        // Click the deactivate button (⏸) on TeleBirr row
        const deactivateBtn = screen.getAllByTitle('Deactivate')[0];
        await user.click(deactivateBtn);

        await waitFor(() => {
            expect(mockedPut).toHaveBeenCalledWith(
                '/api/admin/payment-methods/1',
                { is_active: false },
            );
        });
    });
});
