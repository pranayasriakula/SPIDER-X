
export function WelcomePage({ onSelectPortal }) {
  return (
    <main
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'linear-gradient(135deg, #071a2f, #123b58)',
        color: '#ffffff',
        fontFamily: 'Arial, sans-serif',
      }}
    >
      <div style={{ width: '100%', maxWidth: '850px', textAlign: 'center' }}>
        <p style={{ letterSpacing: '4px', color: '#80d9ed' }}>
          DISASTER RESPONSE PLATFORM
        </p>

        <h1 style={{ fontSize: 'clamp(36px, 6vw, 64px)', marginBottom: '12px' }}>
          SPIDER-X
        </h1>

        <p style={{ color: '#c8d8e5', marginBottom: '40px' }}>
          Connecting citizens and response authorities during emergencies.
        </p>

        <h2 style={{ marginBottom: '24px' }}>Choose Your Portal</h2>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
            gap: '20px',
          }}
        >
          <button
            type="button"
            onClick={() => onSelectPortal('public')}
            style={portalStyle}
          >
            <span style={{ fontSize: '36px' }}>👥</span>
            <strong style={{ fontSize: '23px' }}>Public Portal</strong>
            <span>Report emergencies, request help, and track updates.</span>
            <span style={{ color: '#80d9ed' }}>Login / Register →</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectPortal('government')}
            style={portalStyle}
          >
            <span style={{ fontSize: '36px' }}>🏛️</span>
            <strong style={{ fontSize: '23px' }}>Government Portal</strong>
            <span>Manage incidents, resources, alerts, and rescue operations.</span>
            <span style={{ color: '#80d9ed' }}>Authorized Login →</span>
          </button>
        </div>

        <p style={{ marginTop: '36px', color: '#a9bdcc', fontSize: '13px' }}>
          Secure access • Coordinated response • Safer communities
        </p>
      </div>
    </main>
  );
}

const portalStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  gap: '16px',
  padding: '36px 24px',
  background: 'rgba(255, 255, 255, 0.08)',
  color: '#ffffff',
  border: '1px solid rgba(255, 255, 255, 0.25)',
  borderRadius: '16px',
  cursor: 'pointer',
  textAlign: 'center',
  font: 'inherit',
};
