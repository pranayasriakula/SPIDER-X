import { useState } from 'react';
import { FormNotice } from './FormNotice';
import { submitAssistanceRequest } from '../../services/assistanceService';

const initialForm = { contactName: '', contactPhone: '', location: '', helpType: '', householdSize: '', details: '' };

export function AssistanceRequestForm() {
  const [form, setForm] = useState(initialForm);
  const [result, setResult] = useState(null);

  function updateField(event) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setResult(await submitAssistanceRequest(form));
    setForm(initialForm);
  }

  return (
    <section className="form-page" aria-labelledby="assistance-title">
      <p className="eyebrow">Government assistance · Mock workflow</p>
      <h1 id="assistance-title">Request assistance</h1>
      <p className="lead">Tell the response team what support your household needs. Do not include sensitive identity documents in this form.</p>
      <form className="public-form" onSubmit={handleSubmit}>
        <div className="two-column-fields">
          <label>Contact name<input name="contactName" value={form.contactName} onChange={updateField} autoComplete="name" required /></label>
          <label>Phone number<input name="contactPhone" value={form.contactPhone} onChange={updateField} autoComplete="tel" inputMode="tel" required /></label>
        </div>
        <label>Location or nearest landmark<input name="location" value={form.location} onChange={updateField} placeholder="e.g., Ward 5 community centre" required /></label>
        <div className="two-column-fields">
          <label>Type of help<select name="helpType" value={form.helpType} onChange={updateField} required><option value="">Choose help needed</option><option>Food and water</option><option>Medical support</option><option>Temporary shelter</option><option>Evacuation support</option><option>Essential supplies</option></select></label>
          <label>People in household<input name="householdSize" value={form.householdSize} onChange={updateField} inputMode="numeric" type="number" min="1" required /></label>
        </div>
        <label>Help details<textarea name="details" value={form.details} onChange={updateField} placeholder="Include urgent needs, accessibility requirements, or other useful information." rows="5" required /></label>
        <button className="button primary" type="submit">Submit assistance request</button>
      </form>
      <FormNotice result={result} />
    </section>
  );
}

