import { dashboardSummary, disasterSituations, safetyActions } from '../../data/mockDashboardData';
import { SituationCard } from './SituationCard';

export function DashboardOverview({ onNavigate }) {
  return (
    <>
      <section className="hero" aria-labelledby="dashboard-title">
        <div>
          <p className="eyebrow">Community status · Demo data</p>
          <h1 id="dashboard-title">Stay informed. Get help quickly.</h1>
          <p className="hero-copy">View current disaster situations, share an emergency report, and track requests for assistance.</p>
        </div>
        <div className="hero-actions">
          <button className="button primary" onClick={() => onNavigate('report')} type="button">Report an emergency</button>
          <button className="button secondary" onClick={() => onNavigate('assistance')} type="button">Request assistance</button>
        </div>
      </section>

      <section aria-labelledby="summary-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">At a glance</p>
            <h2 id="summary-title">Current community status</h2>
          </div>
          <span className="demo-label">Mock data — backend connection pending</span>
        </div>
        <div className="summary-grid">
          {dashboardSummary.map((item) => (
            <article className="summary-card" key={item.label}>
              <span className="summary-icon" aria-hidden="true">{item.icon}</span>
              <strong>{item.value}</strong>
              <span>{item.label}</span>
              <small>{item.detail}</small>
            </article>
          ))}
        </div>
      </section>

      <section className="content-section" aria-labelledby="situations-title">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Situation updates</p>
            <h2 id="situations-title">Disaster situations near you</h2>
          </div>
          <button className="text-button" onClick={() => onNavigate('alerts')} type="button">View all alerts</button>
        </div>
        <div className="situation-grid">
          {disasterSituations.map((situation) => <SituationCard key={situation.id} situation={situation} />)}
        </div>
      </section>

      <section className="safety-panel" aria-labelledby="safety-title">
        <div>
          <p className="eyebrow">Preparedness</p>
          <h2 id="safety-title">What you can do now</h2>
        </div>
        <ul>
          {safetyActions.map((action) => <li key={action}>{action}</li>)}
        </ul>
      </section>
    </>
  );
}

