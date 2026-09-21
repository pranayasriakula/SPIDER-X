import { useState } from 'react';
import { ApiRequestError } from '../../services/apiClient';
import { submitEmergencyReport } from '../../services/reportService';
import { FormNotice } from './FormNotice';

const initialForm = { latitude: '', longitude: '', disasterType: '', description: '', severity: '' };

export function EmergencyReportForm({ isAuthenticated, onOpenAccount }) {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationError, setLocationError] = useState('');

  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  function useCurrentLocation() {
    setLocationError('');
    navigator.geolocation.getCurrentPosition(
      ({ coords }) => setForm((current) => ({ ...current, latitude: String(coords.latitude), longitude: String(coords.longitude) })),
      () => setLocationError('Your location could not be obtained. Please enter coordinates manually.'),
    );
  }
  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setLoading(true);
    try {
      const report = await submitEmergencyReport(form);
      setResult({ reference: report.report_id, message: 'Your emergency report has been submitted.' });
      setForm(initialForm);
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError : new ApiRequestError({ method: 'POST', endpoint: '/api/reports', status: null, code: 'UNKNOWN_ERROR', message: 'Unable to submit the report.' }));
    } finally { setLoading(false); }
  }

  return (
    <section className="form-page" aria-labelledby="report-title">
      <p className="eyebrow">Emergency report</p><h1 id="report-title">Report a disaster situation</h1>
      <p className="lead">Use this form to share non-immediate emergency information. For immediate danger, contact local emergency services first.</p>
      {!isAuthenticated && <div className="api-state"><strong>Sign in is required before submitting a report.</strong><button className="text-button" onClick={onOpenAccount} type="button">Sign in or register</button></div>}
      <form className="public-form" onSubmit={handleSubmit}>
        <fieldset><legend>Incident coordinates</legend><p className="field-help">Enter numeric coordinates, or allow your browser to fill them from your current location. Coordinates are sent to the report API.</p><div className="two-column-fields"><label>Latitude<input name="latitude" value={form.latitude} onChange={updateField} type="number" step="any" min="-90" max="90" required /></label><label>Longitude<input name="longitude" value={form.longitude} onChange={updateField} type="number" step="any" min="-180" max="180" required /></label></div>{'geolocation' in navigator && <button className="text-button" onClick={useCurrentLocation} type="button">Use my current location</button>}{locationError && <span className="field-error" role="alert">{locationError}</span>}</fieldset>
        <label>Disaster type<select name="disasterType" value={form.disasterType} onChange={updateField} required><option value="">Choose a type</option><option value="FLOOD">Flood</option><option value="EARTHQUAKE">Earthquake</option><option value="FIRE">Fire</option><option value="LANDSLIDE">Landslide</option><option value="CYCLONE">Cyclone</option><option value="TSUNAMI">Tsunami</option><option value="DROUGHT">Drought</option><option value="INDUSTRIAL">Industrial</option><option value="OTHER">Other</option></select></label>
        <fieldset><legend>Severity</legend><div className="choice-row">{['LOW', 'MEDIUM', 'HIGH', 'CRITICAL'].map((severity) => <label className="choice" key={severity}><input type="radio" name="severity" value={severity} checked={form.severity === severity} onChange={updateField} required /> {severity}</label>)}</div></fieldset>
        <label>What is happening?<textarea name="description" value={form.description} onChange={updateField} placeholder="Describe the situation, risks, and people affected." rows="5" required /></label>
        <button className="button primary" disabled={!isAuthenticated || loading} type="submit">{loading ? 'Submitting…' : 'Submit emergency report'}</button>
      </form>
      <FormNotice result={result} />
      {error && <div className="api-state error" role="alert"><strong>Unable to submit report.</strong><span>{error.method} {error.endpoint} · {error.status ? `HTTP ${error.status}` : 'No HTTP response'} · {error.code}</span><span>{error.message}</span></div>}
    </section>
  );
}

