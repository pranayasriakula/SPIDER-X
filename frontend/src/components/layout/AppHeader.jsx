export function AppHeader() {
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
        <p className="emergency-number">For immediate danger, call local emergency services.</p>
      </div>
    </header>
  );
}

