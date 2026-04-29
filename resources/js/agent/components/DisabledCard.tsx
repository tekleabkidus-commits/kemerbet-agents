interface Props {
  displayNumber: number;
  telegramUsername: string;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

export default function DisabledCard({ displayNumber, telegramUsername }: Props) {
  return (
    <div className="loading-state">
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>⊘</div>
      <div>Account disabled</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: 8 }}>
        Agent #{pad(displayNumber)} (@{telegramUsername}) — your account has been disabled. Please
        contact admin.
      </div>
    </div>
  );
}
