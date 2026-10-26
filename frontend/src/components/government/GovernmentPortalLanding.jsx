import './GovernmentPortalLanding.css';
export function GovernmentPortalLanding({ onSignIn, onApply, onBack }) {
  return (
    <main className="gov-landing">
      <header className="gov-landing-header">
        <div className="gov-landing-brand">
          <span className="gov-landing-mark">R</span>
          <div>
            <strong>RAKSHAK</strong>
            <small>DISASTER RESPONSE PLATFORM</small>
          </div>
        </div>
        <span className="gov-landing-label">GOVERNMENT PORTAL</span>
      </header>

      <section className="gov-landing-hero">
        <p className="gov-landing-eyebrow">GOVERNMENT EMERGENCY MANAGEMENT</p>
        <h1>Prepared to respond.<br />Ready to protect.</h1>
        <p className="gov-landing-description">
          Access emergency response operations or apply for authorised
          government access through the existing verification process.
        </p>
      </section>

      <section className="gov-landing-options" aria-label="Government Portal options">
        <article className="gov-landing-card">
          <span className="gov-landing-card-icon" aria-hidden="true">↗</span>
          <p className="gov-landing-card-kicker">EXISTING AUTHORISED USERS</p>
          <h2>Government Sign In</h2>
          <p>
            Sign in with your existing approved Government Authority or
            Administrator account to access emergency response operations.
          </p>
          <button className="gov-landing-button primary" type="button" onClick={onSignIn}>
            Government Sign In <span aria-hidden="true">→</span>
          </button>
        </article>

        <article className="gov-landing-card application">
          <span className="gov-landing-card-icon" aria-hidden="true">＋</span>
          <p className="gov-landing-card-kicker">NEW GOVERNMENT APPLICANTS</p>
          <h2>Apply for Government Access</h2>
          <p>
            Sign in or create a public account, submit your official details,
            and track your application while it awaits review.
          </p>
          <button className="gov-landing-button secondary" type="button" onClick={onApply}>
            Apply for Government Access <span aria-hidden="true">→</span>
          </button>
        </article>
      </section>

      <p className="gov-landing-security">
        <span aria-hidden="true">●</span>
        Submitting an application does not grant Government access.
        Access remains restricted until the backend records Admin approval.
      </p>

      <button className="gov-landing-back" type="button" onClick={onBack}>
        ← Back to portal selection
      </button>

      <footer className="gov-landing-footer">
        RAKSHAK · Coordinated response · Accountable access
      </footer>
    </main>
  );
}
