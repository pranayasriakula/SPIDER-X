import { useEffect, useMemo, useState } from 'react';
import { createAlert, getAlerts, updateAlert } from '../api/client.js';
const ALERT_STATUSES = ['ACTIVE', 'ACKNOWLEDGED', 'RESOLVED', 'CANCELLED'];
const displayDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Not available';
};
const coordinates = (alert) => Number.isFinite(alert?.latitude) && Number.isFinite(alert?.longitude) ? `${alert.latitude.toFixed(4)}, ${alert.longitude.toFixed(4)}` : 'Location unavailable';

function AlertsPage() {
  const [alerts, setAlerts] = useState([]);
  const [alertState, setAlertState] = useState('loading');
  const [alertError, setAlertError] = useState('');
  const [filters, setFilters] = useState({ disasterType: '', severity: '', status: '' });
  const [selectedAlert, setSelectedAlert] = useState(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValue, setCreateValue] = useState({
    disaster_type: '',
    severity: '',
    title: '',
    message: '',
    latitude: '',
    longitude: '',
    status: 'ACTIVE',
});
const [createState, setCreateState] = useState('idle');
const [createMessage, setCreateMessage] = useState('');
const [updateState, setUpdateState] = useState('idle');
const [updateMessage, setUpdateMessage] = useState('');
const handleCreateAlert = async (event) => {
  event.preventDefault();

  setCreateState('loading');
  setCreateMessage('');

  try {
    const payload = {
      ...createValue,
      latitude: Number(createValue.latitude),
      longitude: Number(createValue.longitude),
    };

    const createdAlert = await createAlert(payload);

    setAlerts((current) => [createdAlert, ...current]);
    setSelectedAlert(createdAlert);

    setCreateValue({
      disaster_type: '',
      severity: '',
      title: '',
      message: '',
      latitude: '',
      longitude: '',
      status: 'ACTIVE',
    });

    setCreateState('success');
    setCreateMessage('Alert created successfully.');
    setShowCreateForm(false);
  } catch (error) {
    setCreateState('error');
    setCreateMessage(error.message || 'Unable to create alert.');
  }
};

const handleUpdateStatus = async (status) => {
  if (!selectedAlert) return;

  setUpdateState('loading');
  setUpdateMessage('');

  try {
    const updatedAlert = await updateAlert(selectedAlert.alert_id, { status });

    setAlerts((current) =>
      current.map((alert) =>
        alert.alert_id === updatedAlert.alert_id ? updatedAlert : alert
      )
    );

    setSelectedAlert(updatedAlert);
    setUpdateState('success');
    setUpdateMessage(`Alert status updated to ${status}.`);
  } catch (error) {
    setUpdateState('error');
    setUpdateMessage(error.message || 'Unable to update alert status.');
  }
};

  useEffect(() => {
    const loadAlerts = async () => {
      setAlertState('loading'); setAlertError('');
      try {
        const data = await getAlerts();
        if (!Array.isArray(data)) throw new Error('The backend returned an unexpected alerts format.');
        setAlerts(data); setAlertState('ready');
      } catch (error) {
        setAlerts([]); setAlertError(error.message || 'Unable to load alerts.'); setAlertState('error');
      }
    };
    loadAlerts();
  }, []);

  const options = useMemo(() => ({
    disasterTypes: [...new Set(alerts.map((alert) => alert.disaster_type).filter(Boolean))],
    severities: [...new Set(alerts.map((alert) => alert.severity).filter(Boolean))],
  }), [alerts]);
  const filteredAlerts = alerts.filter((alert) => (
    (!filters.disasterType || alert.disaster_type === filters.disasterType)
    && (!filters.severity || alert.severity === filters.severity)
    && (!filters.status || alert.status === filters.status)
  ));

  return <section className="alerts-page">
    <div className="page-heading"><div><button
  type="button"
  className="primary-button"
  onClick={() => {
    setShowCreateForm((current) => !current);
    setCreateMessage('');
  }}
>
  {showCreateForm ? 'Cancel' : 'Create Alert'}
</button><p className="eyebrow">Emergency communications</p><h2>Alerts</h2><p>Review official alerts returned by the Spider-X backend.</p></div></div>
    {showCreateForm && (
  <form className="alert-create-form" onSubmit={handleCreateAlert}>
    <h3>Create Official Alert</h3>

    <label>
      Disaster Type
      <select
        required
        value={createValue.disaster_type}
        onChange={(event) =>
          setCreateValue((current) => ({
            ...current,
            disaster_type: event.target.value,
          }))
        }
      >
        <option value="">Select disaster type</option>
        <option value="FLOOD">Flood</option>
        <option value="EARTHQUAKE">Earthquake</option>
        <option value="FIRE">Fire</option>
        <option value="LANDSLIDE">Landslide</option>
        <option value="CYCLONE">Cyclone</option>
        <option value="TSUNAMI">Tsunami</option>
        <option value="DROUGHT">Drought</option>
        <option value="INDUSTRIAL">Industrial</option>
        <option value="OTHER">Other</option>
      </select>
    </label>

    <label>
      Severity
      <select
        required
        value={createValue.severity}
        onChange={(event) =>
          setCreateValue((current) => ({
            ...current,
            severity: event.target.value,
          }))
        }
      >
        <option value="">Select severity</option>
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>
    </label>

    <label>
      Title
      <input
        required
        type="text"
        value={createValue.title}
        onChange={(event) =>
          setCreateValue((current) => ({
            ...current,
            title: event.target.value,
          }))
        }
      />
    </label>

    <label>
      Message
      <textarea
        required
        value={createValue.message}
        onChange={(event) =>
          setCreateValue((current) => ({
            ...current,
            message: event.target.value,
          }))
        }
      />
    </label>

    <label>
      Latitude
      <input
        required
        type="number"
        step="any"
        value={createValue.latitude}
        onChange={(event) =>
          setCreateValue((current) => ({
            ...current,
            latitude: event.target.value,
          }))
        }
      />
    </label>

    <label>
      Longitude
      <input
        required
        type="number"
        step="any"
        value={createValue.longitude}
        onChange={(event) =>
          setCreateValue((current) => ({
            ...current,
            longitude: event.target.value,
          }))
        }
      />
    </label>

    <button
      type="submit"
      className="primary-button"
      disabled={createState === 'loading'}
    >
      {createState === 'loading' ? 'Creating...' : 'Publish Alert'}
    </button>

    {createMessage && (
      <p className={createState === 'error' ? 'section-message error' : 'section-message'}>
        {createMessage}
      </p>
    )}
  </form>
)}<section className="alerts-workspace">
      <section className="alerts-list-panel">
        <div className="filter-row alerts-filter-row" aria-label="Alert filters"><label>Disaster type<select value={filters.disasterType} onChange={(event) => setFilters((current) => ({ ...current, disasterType: event.target.value }))}><option value="">All disaster types</option>{options.disasterTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Severity<select value={filters.severity} onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))}><option value="">All severities</option>{options.severities.map((value) => <option key={value} value={value}>{value}</option>)}</select></label><label>Status<select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{ALERT_STATUSES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label></div>
        {alertState === 'loading' && <p className="section-message">Loading alerts…</p>}
        {alertState === 'error' && <p className="section-message error">{alertError}</p>}
        {alertState === 'ready' && alerts.length === 0 && <p className="section-message">No alerts are currently available.</p>}
        {alertState === 'ready' && alerts.length > 0 && filteredAlerts.length === 0 && <p className="section-message">No alerts match the selected filters.</p>}
        {alertState === 'ready' && filteredAlerts.length > 0 && <div className="alert-card-list">{filteredAlerts.map((alert) => <button className={`alert-card ${selectedAlert?.alert_id === alert.alert_id ? 'selected' : ''}`} key={alert.alert_id} type="button" onClick={() => setSelectedAlert(alert)}><div className="alert-card-top"><span className={`alert-status ${alert.status.toLowerCase()}`}>{alert.status}</span><span>{displayDate(alert.created_at)}</span></div><strong>{alert.title}</strong><p>{alert.disaster_type} · {alert.severity}</p><span className="alert-card-message">{alert.message}</span></button>)}</div>}
      </section>
      <aside className="alert-detail-panel" aria-live="polite">{!selectedAlert && <p className="section-message">Select an alert to review its full details.</p>}{selectedAlert && <><div className="detail-heading"><p className="eyebrow">Alert details</p><h2>{selectedAlert.title}</h2><span className={`alert-status ${selectedAlert.status.toLowerCase()}`}>{selectedAlert.status}</span></div><dl className="detail-list"><div><dt>Alert ID</dt><dd>{selectedAlert.alert_id}</dd></div><div><dt>Disaster type</dt><dd>{selectedAlert.disaster_type}</dd></div><div><dt>Severity</dt><dd>{selectedAlert.severity}</dd></div><div><dt>Message</dt><dd>{selectedAlert.message}</dd></div><div><dt>Latitude</dt><dd>{selectedAlert.latitude}</dd></div><div><dt>Longitude</dt><dd>{selectedAlert.longitude}</dd></div><div><dt>Coordinates</dt><dd>{coordinates(selectedAlert)}</dd></div><div><dt>Created</dt><dd>{displayDate(selectedAlert.created_at)}</dd></div><div><dt>Updated</dt><dd>{displayDate(selectedAlert.updated_at)}</dd></div></dl><div className="alert-status-actions">
  <h3>Update Alert Status</h3>

  <select
    value={selectedAlert.status}
    disabled={updateState === 'loading'}
    onChange={(event) => handleUpdateStatus(event.target.value)}
  >
    {ALERT_STATUSES.map((status) => (
      <option key={status} value={status}>
        {status}
      </option>
    ))}
  </select>

  {updateState === 'loading' && (
    <p className="section-message">Updating alert status...</p>
  )}

  {updateMessage && updateState !== 'loading' && (
    <p
      className={
        updateState === 'error'
          ? 'section-message error'
          : 'section-message'
      }
    >
      {updateMessage}
    </p>
  )}
</div></>}</aside>
    </section>
  </section>;
}

export default AlertsPage;
