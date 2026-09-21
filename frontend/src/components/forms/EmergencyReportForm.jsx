import { useState } from 'react';
import { FormNotice } from './FormNotice';
import { submitEmergencyReport } from '../../services/reportService';

const initialForm = { location: '', disasterType: '', description: '', severity: '' };

export function EmergencyReportForm() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setResult(await submitEmergencyReport(form));
    setForm(initialForm);
  }

  return (
    <section className="form-page" aria-labelledby="report-title">
      <p className="eyebrow">Emergency report · Mock workflow</p>
      <h1 id="report-title">Report a disaster situation</h1>
      <p className="lead">Use this form to share non-immediate emergency information. For immediate danger, contact local emergency services first.</p>
      <form className="public-form" onSubmit={handleSubmit}>
        <label>
          Location or nearest landmark
          <input name="location" value={form.location} onChange={updateField} placeholder="e.g., Main Road near City Hospital" required />
        </label>
        <label>
          Disaster type
          <select name="disasterType" value={form.disasterType} onChange={updateField} required>
            <option value="">Choose a type</option>
            <option>Flooding</option><option>Fire</option><option>Earthquake damage</option><option>Storm damage</option><option>Landslide</option><option>Other</option>
          </select>
        </label>
        <fieldset>
          <legend>Severity</legend>
          <div className="choice-row">
            {['Low', 'Moderate', 'High', 'Critical'].map((severity) => (
              <label className="choice" key={severity}><input type="radio" name="severity" value={severity} checked={form.severity === severity} onChange={updateField} required /> {severity}</label>
            ))}
          </div>
        </fieldset>
        <label>
          What is happening?
          <textarea name="description" value={form.description} onChange={updateField} placeholder="Describe the situation, risks, and people affected." rows="5" required />
        </label>
        <button className="button primary" type="submit">Submit emergency report</button>
      </form>
      <FormNotice result={result} />
    </section>
  );
}

