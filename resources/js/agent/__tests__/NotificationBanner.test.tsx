import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import NotificationBanner from '../components/NotificationBanner';
import type { NoticeItem } from '../types';

const twoNotices: NoticeItem[] = [
  {
    id: 1,
    title: 'Payout change',
    body: 'Payouts move to Fridays starting next week.',
    priority: 'urgent',
    created_at: '2026-08-14T10:00:00+03:00',
  },
  {
    id: 2,
    title: null,
    body: 'New TeleBirr limits are in effect.',
    priority: 'info',
    created_at: '2026-08-14T09:00:00+03:00',
  },
];

describe('NotificationBanner', () => {
  // 1. Fallback state without notices is unchanged
  it('renders the notifications-enabled fallback when there are no notices', () => {
    render(
      <NotificationBanner permission="granted" onPermissionChange={() => {}} notices={[]} />,
    );

    expect(screen.getByText('Notifications enabled')).toBeInTheDocument();
    expect(screen.getByText("You'll get reminders before your time ends")).toBeInTheDocument();
  });

  // 2. Renders nothing when permission is denied
  it('renders nothing when permission is denied', () => {
    const { container } = render(
      <NotificationBanner permission="denied" onPermissionChange={() => {}} notices={twoNotices} />,
    );

    expect(container).toBeEmptyDOMElement();
  });

  // 3. Renders the notice board with two notices and slides on chevron click
  it('renders and slides with 2 notices', async () => {
    const user = userEvent.setup();
    const { container } = render(
      <NotificationBanner permission="granted" onPermissionChange={() => {}} notices={twoNotices} />,
    );

    // Both slides in the DOM; fallback content replaced
    expect(screen.getByText('Payout change')).toBeInTheDocument();
    expect(screen.getByText('New TeleBirr limits are in effect.')).toBeInTheDocument();
    expect(screen.queryByText('Notifications enabled')).not.toBeInTheDocument();

    // Dots and chevrons for multiple notices
    expect(screen.getByLabelText('Notice 1')).toBeInTheDocument();
    expect(screen.getByLabelText('Notice 2')).toBeInTheDocument();

    const track = container.querySelector('.notice-track') as HTMLElement;
    expect(track.style.transform).toBe('translateX(-0%)');

    await user.click(screen.getByLabelText('Next notice'));
    expect(track.style.transform).toBe('translateX(-100%)');

    await user.click(screen.getByLabelText('Previous notice'));
    expect(track.style.transform).toBe('translateX(-0%)');
  });

  // 4. Single notice hides dots and chevrons
  it('hides navigation for a single notice', () => {
    render(
      <NotificationBanner
        permission="granted"
        onPermissionChange={() => {}}
        notices={[twoNotices[0]]}
      />,
    );

    expect(screen.getByText('Payout change')).toBeInTheDocument();
    expect(screen.queryByLabelText('Next notice')).not.toBeInTheDocument();
    expect(screen.queryByLabelText('Notice 1')).not.toBeInTheDocument();
  });

  // 5. Urgent notices get the urgent styling class
  it('marks urgent notices with the urgent class', () => {
    const { container } = render(
      <NotificationBanner permission="granted" onPermissionChange={() => {}} notices={twoNotices} />,
    );

    const slides = container.querySelectorAll('.notice-slide');
    expect(slides[0].classList.contains('urgent')).toBe(true);
    expect(slides[1].classList.contains('urgent')).toBe(false);
  });
});
