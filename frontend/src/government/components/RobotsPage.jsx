import { useEffect, useState } from 'react';
import {
  createRobot,
  deployRobot,
  getLatestObservations,
  getRobot,
  getRobotObservations,
  getRobots,
  returnRobot,
  stopRobot,
  updateRobot,
} from '../api/client.js';

const ROBOT_STATUSES = ['ONLINE', 'OFFLINE', 'MISSION', 'ERROR'];
const emptyRobot = { name: '', status: 'OFFLINE', latitude: '', longitude: '' };

const displayDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Not available';
};
const displayCoordinates = (item) => Number.isFinite(item?.latitude) && Number.isFinite(item?.longitude) ? `${item.latitude.toFixed(4)}, ${item.longitude.toFixed(4)}` : 'Location unavailable';
const formValue = (robot) => ({ name: robot?.name || '', status: robot?.status || 'OFFLINE', latitude: robot?.latitude ?? '', longitude: robot?.longitude ?? '' });

const sensorRows = (sensors, prefix = '') => {
  if (!sensors || typeof sensors !== 'object' || Array.isArray(sensors)) return [];
  return Object.entries(sensors).flatMap(([name, value]) => {
    const label = prefix ? `${prefix}.${name}` : name;
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      if ('value' in value || 'unit' in value || 'status' in value) return [{ name: label, value: value.value ?? 'Not available', unit: value.unit ?? '—', status: value.status ?? '—' }];
      return sensorRows(value, label);
    }
    return [{ name: label, value: String(value), unit: '—', status: '—' }];
  });
};

function RobotForm({ title, value, onChange, onSubmit, onClose, busy, message, edit }) {
  return <form className="robot-form" onSubmit={onSubmit}>
    <div className="form-heading"><h3>{title}</h3>{onClose && <button className="close-form" type="button" onClick={onClose}>Close</button>}</div>
    <label htmlFor={`${edit ? 'edit' : 'new'}-robot-name`}>Robot name</label><input id={`${edit ? 'edit' : 'new'}-robot-name`} value={value.name} onChange={(event) => onChange('name', event.target.value)} required />
    <label htmlFor={`${edit ? 'edit' : 'new'}-robot-status`}>Status</label><select id={`${edit ? 'edit' : 'new'}-robot-status`} value={value.status} onChange={(event) => onChange('status', event.target.value)}>{ROBOT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select>
    <label htmlFor={`${edit ? 'edit' : 'new'}-robot-latitude`}>Latitude</label><input id={`${edit ? 'edit' : 'new'}-robot-latitude`} type="number" min="-90" max="90" step="any" value={value.latitude} onChange={(event) => onChange('latitude', event.target.value)} />
    <label htmlFor={`${edit ? 'edit' : 'new'}-robot-longitude`}>Longitude</label><input id={`${edit ? 'edit' : 'new'}-robot-longitude`} type="number" min="-180" max="180" step="any" value={value.longitude} onChange={(event) => onChange('longitude', event.target.value)} />
    <button className="primary-action" type="submit" disabled={busy}>{busy ? 'Saving…' : edit ? 'Save robot' : 'Add robot'}</button>{message && <p className={`inline-message ${message.type === 'error' ? 'error' : ''}`}>{message.text}</p>}
  </form>;
}

function ObservationTable({ observations, title }) {
  return <section className="observations-section"><div className="section-heading"><div><p className="eyebrow">Sensor data</p><h3>{title}</h3></div></div>{observations.status === 'loading' && <p className="section-message">Loading observations…</p>}{observations.status === 'error' && <p className="section-message error">{observations.error}</p>}{observations.status === 'ready' && observations.data.length === 0 && <p className="section-message">No observations are available.</p>}{observations.status === 'ready' && observations.data.length > 0 && <div className="observation-list">{observations.data.map((observation) => <article className="observation-card" key={observation.observation_id}><div className="observation-meta"><strong>{displayDate(observation.timestamp)}</strong><span>{displayCoordinates(observation)}</span></div>{sensorRows(observation.sensors).length > 0 ? <div className="sensor-table">{sensorRows(observation.sensors).map((sensor) => <div className="sensor-row" key={`${observation.observation_id}-${sensor.name}`}><span>{sensor.name}</span><strong>{sensor.value}</strong><small>{sensor.unit}</small><em>{sensor.status}</em></div>)}</div> : <p className="section-message">This observation has no displayable sensor values.</p>}</article>)}</div>}</section>;
}

function RobotsPage() {
  const [robots, setRobots] = useState([]);
  const [robotsState, setRobotsState] = useState('loading');
  const [robotsError, setRobotsError] = useState('');
  const [selectedRobot, setSelectedRobot] = useState(null);
  const [detailsState, setDetailsState] = useState('idle');
  const [detailsError, setDetailsError] = useState('');
  const [robotObservations, setRobotObservations] = useState({ status: 'idle', data: [], error: '' });
  const [latestObservations, setLatestObservations] = useState({ status: 'loading', data: [], error: '' });
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createValue, setCreateValue] = useState(emptyRobot);
  const [createState, setCreateState] = useState('idle');
  const [createMessage, setCreateMessage] = useState(null);
  const [editValue, setEditValue] = useState(emptyRobot);
  const [editState, setEditState] = useState('idle');
  const [editMessage, setEditMessage] = useState(null);
  const [controlState, setControlState] = useState('idle');
  const [controlMessage, setControlMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const refreshRobots = async () => {
    setRobotsState('loading'); setRobotsError('');
    try {
      const data = await getRobots();
      if (!Array.isArray(data)) throw new Error('The backend returned an unexpected robots format.');
      setRobots(data); setRobotsState('ready'); return data;
    } catch (error) {
      setRobots([]); setRobotsState('error'); setRobotsError(error.message || 'Unable to load Spider-X robots.'); return [];
    }
  };

  const loadLatestObservations = async () => {
    setLatestObservations({ status: 'loading', data: [], error: '' });
    try {
      const data = await getLatestObservations();
      if (!Array.isArray(data)) throw new Error('The backend returned an unexpected observations format.');
      setLatestObservations({ status: 'ready', data, error: '' });
    } catch (error) { setLatestObservations({ status: 'error', data: [], error: error.message || 'Unable to load latest observations.' }); }
  };

  useEffect(() => { refreshRobots(); loadLatestObservations(); }, []);

  const selectRobot = async (robotId) => {
    setSelectedRobot(null); setDetailsState('loading'); setDetailsError(''); setRobotObservations({ status: 'loading', data: [], error: '' }); setControlMessage(''); setEditMessage(null);
    try {
      const robot = await getRobot(robotId);
      setSelectedRobot(robot); setEditValue(formValue(robot)); setDetailsState('ready');
    } catch (error) { setDetailsState('error'); setDetailsError(error.message || 'Unable to load robot details.'); }
    try {
      const data = await getRobotObservations(robotId);
      if (!Array.isArray(data)) throw new Error('The backend returned an unexpected observations format.');
      setRobotObservations({ status: 'ready', data, error: '' });
    } catch (error) { setRobotObservations({ status: 'error', data: [], error: error.message || 'Unable to load robot observations.' }); }
  };

  const validate = (value) => {
    for (const [field, low, high] of [['latitude', -90, 90], ['longitude', -180, 180]]) {
      if (value[field] !== '' && (!Number.isFinite(Number(value[field])) || Number(value[field]) < low || Number(value[field]) > high)) return `${field[0].toUpperCase()}${field.slice(1)} must be between ${low} and ${high}.`;
    }
    return '';
  };
  const createPayload = (value) => ({ name: value.name, status: value.status, ...(value.latitude !== '' ? { latitude: Number(value.latitude) } : {}), ...(value.longitude !== '' ? { longitude: Number(value.longitude) } : {}) });

  const submitCreate = async (event) => {
    event.preventDefault(); setCreateMessage(null); setSuccessMessage('');
    const validation = validate(createValue); if (validation) { setCreateMessage({ type: 'error', text: validation }); return; }
    setCreateState('saving');
    try { await createRobot(createPayload(createValue)); setCreateValue(emptyRobot); setShowCreateForm(false); setCreateState('idle'); setSuccessMessage('Robot created successfully.'); await refreshRobots(); } catch (error) { setCreateState('idle'); setCreateMessage({ type: 'error', text: error.message || 'Unable to create the robot.' }); }
  };

  const submitEdit = async (event) => {
    event.preventDefault(); if (!selectedRobot) return;
    setEditMessage(null); setSuccessMessage('');
    const validation = validate(editValue); if (validation) { setEditMessage({ type: 'error', text: validation }); return; }
    const original = formValue(selectedRobot); const updates = {};
    if (['latitude', 'longitude'].some((field) => editValue[field] === '' && original[field] !== '')) {
      setEditMessage({ type: 'error', text: 'Coordinates cannot be cleared because the current backend accepts numeric coordinate updates only.' }); return;
    }
    ['name', 'status'].forEach((field) => { if (editValue[field] !== original[field]) updates[field] = editValue[field]; });
    ['latitude', 'longitude'].forEach((field) => { if (String(editValue[field]) !== String(original[field])) updates[field] = Number(editValue[field]); });
    if (!Object.keys(updates).length) { setEditMessage({ type: 'error', text: 'Change at least one field before saving.' }); return; }
    setEditState('saving');
    try { const updated = await updateRobot(selectedRobot.robot_id, updates); setSelectedRobot(updated); setEditValue(formValue(updated)); setRobots((current) => current.map((robot) => robot.robot_id === updated.robot_id ? updated : robot)); setEditState('idle'); setSuccessMessage('Robot updated successfully.'); await refreshRobots(); } catch (error) { setEditState('idle'); setEditMessage({ type: 'error', text: error.message || 'Unable to update the robot.' }); }
  };

  const runControl = async (action, call) => {
    if (!selectedRobot) return;
    setControlState(action); setControlMessage(''); setSuccessMessage('');
    try { const updated = await call(selectedRobot.robot_id); setSelectedRobot(updated); setEditValue(formValue(updated)); setRobots((current) => current.map((robot) => robot.robot_id === updated.robot_id ? updated : robot)); setControlMessage(`Robot ${action} command completed.`); await refreshRobots(); } catch (error) { setControlMessage(error.message || `Unable to ${action} the robot.`); } finally { setControlState('idle'); }
  };

  return <section className="robots-page">
    <div className="page-heading resources-heading"><div><p className="eyebrow">Field systems</p><h2>Spider-X</h2><p>Monitor registered robots, inspect sensor observations, and manage mission controls.</p></div><button className="primary-action" type="button" onClick={() => { setShowCreateForm((current) => !current); setCreateMessage(null); setSuccessMessage(''); }}>{showCreateForm ? 'Close add robot' : 'Add robot'}</button></div>
    {successMessage && <p className="page-success">{successMessage}</p>}
    {showCreateForm && <RobotForm title="Add Spider-X Robot" value={createValue} onChange={(field, value) => setCreateValue((current) => ({ ...current, [field]: value }))} onSubmit={submitCreate} onClose={() => setShowCreateForm(false)} busy={createState === 'saving'} message={createMessage} />}
    <section className="robot-workspace"><section className="robot-list-panel"><h3>Robot overview</h3>{robotsState === 'loading' && <p className="section-message">Loading robots…</p>}{robotsState === 'error' && <p className="section-message error">{robotsError}</p>}{robotsState === 'ready' && robots.length === 0 && <p className="section-message">No Spider-X robots are registered.</p>}{robotsState === 'ready' && robots.length > 0 && <div className="robot-select-list">{robots.map((robot) => <button className={`robot-select-row ${selectedRobot?.robot_id === robot.robot_id ? 'selected' : ''}`} key={robot.robot_id} type="button" onClick={() => selectRobot(robot.robot_id)}><div><strong>{robot.name}</strong><span>{displayCoordinates(robot)}</span><small>Updated {displayDate(robot.updated_at)}</small></div><span className="tag status">{robot.status}</span></button>)}</div>}</section>
      <section className="robot-detail-panel">{detailsState === 'idle' && <p className="section-message">Select a robot to inspect its current details and observations.</p>}{detailsState === 'loading' && <p className="section-message">Loading robot details…</p>}{detailsState === 'error' && <p className="section-message error">{detailsError}</p>}{detailsState === 'ready' && selectedRobot && <><div className="detail-heading"><p className="eyebrow">Selected robot</p><h2>{selectedRobot.name}</h2><span className="tag status">{selectedRobot.status}</span></div><dl className="detail-list"><div><dt>Robot ID</dt><dd>{selectedRobot.robot_id}</dd></div><div><dt>Latitude</dt><dd>{selectedRobot.latitude ?? 'Not available'}</dd></div><div><dt>Longitude</dt><dd>{selectedRobot.longitude ?? 'Not available'}</dd></div><div><dt>Updated</dt><dd>{displayDate(selectedRobot.updated_at)}</dd></div></dl><div className="robot-controls"><h3>Mission controls</h3><div><button className="primary-action" type="button" disabled={controlState !== 'idle'} onClick={() => runControl('deploy', deployRobot)}>Deploy</button><button className="secondary-action" type="button" disabled={controlState !== 'idle'} onClick={() => runControl('stop', stopRobot)}>Stop</button><button className="secondary-action" type="button" disabled={controlState !== 'idle'} onClick={() => runControl('return', returnRobot)}>Return</button></div>{controlMessage && <p className={`inline-message ${controlMessage.startsWith('Unable') ? 'error' : ''}`}>{controlMessage}</p>}</div><RobotForm title="Update Robot" value={editValue} onChange={(field, value) => setEditValue((current) => ({ ...current, [field]: value }))} onSubmit={submitEdit} busy={editState === 'saving'} message={editMessage} edit /><ObservationTable observations={robotObservations} title="Recent robot observations" /></>}</section></section>
    <ObservationTable observations={latestObservations} title="Latest observations across Spider-X" />
  </section>;
}

export default RobotsPage;
