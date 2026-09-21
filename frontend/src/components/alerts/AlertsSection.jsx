import { useEffect, useMemo, useState } from 'react';
import { ApiRequestError } from '../../services/apiClient';
import { getPublicAlerts } from '../../services/alertsService';

function formatDate(timestamp) {
  if (!timestamp) return 'Not provided';
  const date = new Date(timestamp);
  return Number.isNaN(date.getTime()) ? timestamp : date.toLocaleString();
}

function AlertError({ error }) {
  const status = error.status ? `HTTP ${error.status}` : 'No HTTP response';
  return <div className="api-state error" role="alert"><strong>Unable to load alerts.</strong><span>{error.method} {error.endpoint} · {status} · {error.code}</span><span>{error.message}</span></div>;
}

export function AlertsSection() {
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({ severity: '', disasterType: '', status: '' });

  useEffect(() => {
    let active = true;
    getPublicAlerts()
      .then((result) => { if (active) setAlerts(result); })
      .catch((requestError) => {
        if (active) setError(requestError instanceof ApiRequestError ? requestError : new ApiRequestError({ method: 'GET', endpoint: '/api/alerts', status: null, code: 'UNKNOWN_ERROR', message: 'Unable to load alerts.' }));
      })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  const filterOptions = useMemo(() => ({
    severities: [...new Set(alerts.map((alert) => alert.severity).filter(Boolean))],
    disasterTypes: [...new Set(alerts.map((alert) => alert.disaster_type).filter(Boolean))],
    statuses: [...new Set(alerts.map((alert) => alert.status).filter(Boolean))],
  }), [alerts]);
  const filteredAlerts = alerts.filter((alert) => (
    (!filters.severity || alert.severity === filters.severity)
    && (!filters.disasterType || alert.disaster_type === filters.disasterType)
    && (!filters.status || alert.status === filters.status)
  ));

  function updateFilter(event) { setFilters((current) => ({ ...current, [event.target.name]: event.target.value })); }

  return (
    <section className="feature-page" aria-labelledby="alerts-title">
      <div className="section-heading"><div><p className="eyebrow">Safety alerts · Live API</p><h1 id="alerts-title">Alerts and announcements</h1></div><span className="demo-label">Sign-in required</span></div>
      <p className="lead">Alerts are requested from the Spider-X service after sign-in. Follow official local sources during an emergency.</p>
      {loading && <p className="api-state">Loading alerts…</p>}
      {error && <AlertError error={error} />}
      {!loading && !error && alerts.length === 0 && <p className="api-state">There are no active alerts to display.</p>}
      {!loading && !error && alerts.length > 0 && <>
        <div className="alert-filters" aria-label="Alert filters">
          <label>Severity<select name="severity" onChange={updateFilter} value={filters.severity}><option value="">All severities</option>{filterOptions.severities.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Disaster type<select name="disasterType" onChange={updateFilter} value={filters.disasterType}><option value="">All disaster types</option>{filterOptions.disasterTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Status<select name="status" onChange={updateFilter} value={filters.status}><option value="">All statuses</option>{filterOptions.statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        {filteredAlerts.length === 0 && <p className="api-state">No alerts match the selected filters.</p>}
        {filteredAlerts.length > 0 && <div className="alert-list">
          {filteredAlerts.map((alert) => <article className="alert-card" key={alert.alert_id}><div><span className="alert-level">{alert.severity}</span><h2>{alert.title}</h2></div><p>{alert.message}</p><footer><span>{alert.disaster_type} · {alert.status}</span><span>Updated {formatDate(alert.updated_at)}</span></footer></article>)}
        </div>}
      </>}
    </section>
  );
}

