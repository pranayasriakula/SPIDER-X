export function AppHeader({ profile, onLogout, onOpenAccount }) {
  return (
    <header className="app-header">
      <div className="page-container header-content">
        <a className="brand" href="#overview" aria-label="SPIDER-X public dashboard home">
          <span className="brand-mark" aria-hidden="true">S</span>
          <span>
            <strong>SPIDER-X</strong>
            <small>Public safety dashboard</small>
          </span>
        </a>
        <div className="header-actions"><p className="emergency-number">For immediate danger, call local emergency services.</p>{profile ? <button className="header-button" onClick={onLogout} type="button">Sign out</button> : <button className="header-button" onClick={onOpenAccount} type="button">Sign in</button>}</div>
      </div>
    </header>
  );
}
