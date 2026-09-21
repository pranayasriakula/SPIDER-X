import { useEffect, useState } from 'react';
import { getPublicAlerts } from '../../services/publicService';

export function AlertsSection() {
  const [alerts, setAlerts] = useState([]);
  useEffect(() => { getPublicAlerts().then(({ alerts: result }) => setAlerts(result)); }, []);

  return (
    <section className="feature-page" aria-labelledby="alerts-title">
      <div className="section-heading"><div><p className="eyebrow">Safety alerts · Mock data</p><h1 id="alerts-title">Alerts and announcements</h1></div><span className="demo-label">Sample public display only</span></div>
      <p className="lead">These are sample announcements for interface testing, not live emergency information. Follow official local sources during an emergency.</p>
      <div className="alert-list">
        {alerts.map((alert) => (
          <article className="alert-card" key={alert.id}>
            <div><span className="alert-level">{alert.level}</span><h2>{alert.title}</h2></div>
            <p>{alert.message}</p>
            <footer><span>{alert.issuedBy}</span><span>Updated {alert.updatedAt}</span></footer>
          </article>
        ))}
      </div>
    </section>
  );
}
