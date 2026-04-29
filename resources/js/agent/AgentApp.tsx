/**
 * Agent secret page — root component.
 *
 * Task 4 stub: renders the loading state from the locked mockup.
 * Task 5 expands this into the full state machine
 * (loading → invalid → disabled → offline → live).
 */
export default function AgentApp({ token }: { token: string }) {
  return (
    <div className="wrap">
      <div className="topbar">
        <div className="brand">
          <span className="brand-dot"></span>
          Kemerbet · Agent Portal
        </div>
      </div>
      <div className="loading-state">
        <div className="spinner"></div>
        <div>Loading…</div>
      </div>
    </div>
  );
}
