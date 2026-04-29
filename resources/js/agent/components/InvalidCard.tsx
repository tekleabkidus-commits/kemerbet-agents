export default function InvalidCard() {
  return (
    <div className="loading-state">
      <div style={{ fontSize: '2rem', marginBottom: 12 }}>⚠</div>
      <div>Link not valid</div>
      <div style={{ color: 'var(--text-muted)', fontSize: '.85rem', marginTop: 8 }}>
        This link doesn't exist or has been revoked. Please contact admin for a new link.
      </div>
    </div>
  );
}
