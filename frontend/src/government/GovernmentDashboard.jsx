import { useEffect, useState } from 'react';
import { getAlerts, getReports, getResources, getRobots } from './api/client.js';
import ReportsPage from './components/ReportsPage.jsx';
import ResourcesPage from './components/ResourcesPage.jsx';
import RobotsPage from './components/RobotsPage.jsx';
import AlertsPage from './components/AlertsPage.jsx';
import NotificationsPage from './components/NotificationsPage.jsx';
import './styles/government.css';

const navigation = [
  ['overview', 'Overview', '⌂'],
  ['reports', 'Disaster Reports', '▤'],
  ['resources', 'Resources', '▦'],
  ['robots', 'Spider-X', '⚙'],
  ['alerts', 'Alerts', '△'],
  ['actions', 'Actions', '✓'],
  ['notifications', 'Notifications', '◉'],
];
const initialSection = {
  status: 'loading',
  data: [],
  error: '',
};
const hasAuthorityAccess = (account) => ['AUTHORITY', 'ADMIN'].includes(account?.profile?.role);
const formatDateTime = (value) => { const date = value ? new Date(value) : null; return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Not available'; };
const formatLocation = ({ latitude, longitude }) => Number.isFinite(latitude) && Number.isFinite(longitude) ? `${latitude.toFixed(4)}, ${longitude.toFixed(4)}` : 'Location unavailable';

function LoginScreen({ errorMessage, onLogin, submitting }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  return <main className="login-page"><section className="login-intro"><div className="brand"><div className="brand-mark"><span>S</span></div><div><strong>SPIDER-X</strong><small>Emergency Command</small></div></div><div className="intro-copy"><p className="eyebrow">Secure operations portal</p><h1>Coordinate emergency response with confidence.</h1><p>Access is reserved for authorized government emergency-management personnel.</p></div></section><section className="login-panel" aria-labelledby="login-title"><div className="login-card"><p className="eyebrow">Authority sign in</p><h2 id="login-title">Welcome back</h2><p className="login-description">Sign in with your authorized Spider-X account to continue.</p><div className="demo-access-note"><strong>DEVELOPMENT / DEMO ACCESS</strong><span>authority@spiderx.local - demo123</span></div><form onSubmit={(event) => { event.preventDefault(); onLogin({ email, password }); }}><label htmlFor="email">Email address</label><input id="email" type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /><label htmlFor="password">Password</label><input id="password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />{errorMessage && <p className="form-error" role="alert">{errorMessage}</p>}<button className="login-button" type="submit" disabled={submitting}>{submitting ? 'Signing in...' : 'Sign in to command center'}</button></form></div></section></main>;
}

function SectionMessage({ section, emptyMessage }) {
  if (section.status === 'loading') return <p className="section-message">Loading live data...</p>;
  if (section.status === 'error') return <p className="section-message error">{section.error}</p>;
  return section.data.length ? null : <p className="section-message">{emptyMessage}</p>;
}

function KpiCard({ label, value, section, description }) {
  const display = section.status === 'loading' ? '—' : section.status === 'error' ? 'Unavailable' : value;
  return <article className="kpi-card"><p>{label}</p><strong className={section.status === 'error' ? 'unavailable' : ''}>{display}</strong><span>{section.status === 'error' ? section.error : description}</span></article>;
}

function OverviewPage() {
  const [sections, setSections] = useState({ reports: initialSection, resources: initialSection, robots: initialSection, alerts: initialSection });
  useEffect(() => {
    let active = true;
    const load = async (name, apiFunction) => {
      try {
        const data = await apiFunction();
        if (!Array.isArray(data)) throw new Error('The backend returned an unexpected data format.');
        if (active) setSections((current) => ({ ...current, [name]: { status: 'ready', data, error: '' } }));
      } catch (error) {
        if (active) setSections((current) => ({ ...current, [name]: { status: 'error', data: [], error: error.message || 'This data is currently unavailable.' } }));
      }
    };
    load('reports', getReports); load('resources', getResources); load('robots', getRobots); load('alerts', getAlerts);
    return () => { active = false; };
  }, []);

  const { reports, resources, robots, alerts } = sections;
  return <>
    <section className="welcome-panel"><div><p className="eyebrow">Live operations overview</p><h2>Coordinate response with clarity.</h2><p>Monitor real reports, response resources, Spider-X operations, and official alerts from the command center.</p></div></section>
    <section className="kpi-grid" aria-label="Operational summary"><KpiCard label="Pending Reports" value={reports.data.filter((report) => report.status === 'PENDING').length} section={reports} description="Reports awaiting action" /><KpiCard label="Active Alerts" value={alerts.data.filter((alert) => alert.status === 'ACTIVE').length} section={alerts} description="Alerts marked active" /><KpiCard label="Available Resources" value={resources.data.filter((resource) => String(resource.status).toUpperCase() === 'AVAILABLE').length} section={resources} description="Resources marked available" /><KpiCard label="Robots on Mission" value={robots.data.filter((robot) => robot.status === 'MISSION').length} section={robots} description="Spider-X units in mission" /></section>
    <section className="overview-section"><div className="section-heading"><div><p className="eyebrow">Incoming intelligence</p><h2>Recent disaster reports</h2></div><span>Latest records</span></div><SectionMessage section={reports} emptyMessage="No disaster reports have been submitted." />{reports.status === 'ready' && reports.data.length > 0 && <div className="data-table-wrap"><table><thead><tr><th>Disaster type</th><th>Severity</th><th>Location</th><th>Status</th><th>Created</th></tr></thead><tbody>{reports.data.slice(0, 5).map((report) => <tr key={report.report_id}><td>{report.disaster_type}</td><td><span className="tag">{report.severity}</span></td><td>{formatLocation(report)}</td><td><span className="tag status">{report.status}</span></td><td>{formatDateTime(report.created_at)}</td></tr>)}</tbody></table></div>}</section>
    <section className="overview-two-column"><section className="overview-section"><div className="section-heading"><div><p className="eyebrow">Field systems</p><h2>Spider-X status</h2></div></div><SectionMessage section={robots} emptyMessage="No Spider-X robots are registered." />{robots.status === 'ready' && robots.data.length > 0 && <div className="robot-list">{robots.data.map((robot) => <article className="robot-row" key={robot.robot_id}><div className="module-icon">●</div><div><h3>{robot.name}</h3><p>{formatLocation(robot)} - Updated {formatDateTime(robot.updated_at)}</p></div><span className="tag status">{robot.status}</span></article>)}</div>}</section><section className="overview-section"><div className="section-heading"><div><p className="eyebrow">Emergency communications</p><h2>Alerts</h2></div></div><SectionMessage section={alerts} emptyMessage="No alerts are currently available." />{alerts.status === 'ready' && alerts.data.length > 0 && <div className="alert-list">{alerts.data.map((alert) => <article className="alert-row" key={alert.alert_id}><div><h3>{alert.title}</h3><p>{alert.disaster_type} - {alert.severity} - {formatDateTime(alert.created_at)}</p></div><span className="tag status">{alert.status}</span></article>)}</div>}</section></section>
  </>;
}

function GovernmentDashboard({ account, onLogout }) {
  const [activeSection, setActiveSection] = useState('overview');

  if (!hasAuthorityAccess(account)) {
    return (
      <div className="government-app">
        <main className="session-loading">
          <p>Access denied. An authority account is required.</p>
        </main>
      </div>
    );
  }

  const accountName = account?.profile?.name || account?.user?.email;
  const pageTitle = navigation.find(([id]) => id === activeSection)?.[1];

  return (
    <div className="government-app">
      <div className="dashboard-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark"><span>S</span></div>
            <div>
              <strong>SPIDER-X</strong>
              <small>Emergency Command</small>
            </div>
          </div>

          <nav aria-label="Dashboard navigation">
            <p className="nav-label">Command center</p>
            {navigation.map(([id, label, icon]) => (
              <button
                className={`nav-item ${activeSection === id ? 'active' : ''}`}
                key={id}
                type="button"
                onClick={() => setActiveSection(id)}
              >
                <span>{icon}</span>
                <span>{label}</span>
              </button>
            ))}
          </nav>

          <div className="sidebar-footer">
            <span>◆</span>
            <span>Authority workspace</span>
          </div>
        </aside>

        <main className="main-content">
          <header className="topbar">
            <div>
              <p className="eyebrow">Spider-X emergency management</p>
              <h1>Government Authority</h1>
            </div>

            <div className="topbar-actions">
              <div className="account-summary">
                {accountName && <strong>{accountName}</strong>}
                <span>{account?.profile?.role}</span>
              </div>

              <button
                className="logout-button"
                type="button"
                onClick={onLogout}
              >
                Sign out
              </button>
            </div>
          </header>

          {activeSection === 'overview' ? (
            <OverviewPage />
          ) : activeSection === 'reports' ? (
            <ReportsPage />
          ) : activeSection === 'resources' ? (
            <ResourcesPage />
          ) : activeSection === 'robots' ? (
            <RobotsPage />
          ) : activeSection === 'alerts' ? (
            <AlertsPage />
          ) : activeSection === 'notifications' ? (
            <NotificationsPage />
          ) : (
            <section className="placeholder-page">
              <p className="eyebrow">Government Authority</p>
              <h2>{pageTitle}</h2>
              <p>This section is ready for its dedicated dashboard workflow.</p>
            </section>
          )}
        </main>
      </div>
    </div>
  );
}

export default GovernmentDashboard;


