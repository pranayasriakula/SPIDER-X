import { useEffect, useState } from 'react';
import { getPublicProfile, savePublicProfile } from '../../services/publicService';

export function PublicProfile() {
  const [profile, setProfile] = useState(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => { getPublicProfile().then(({ profile: result }) => setProfile(result)); }, []);
  if (!profile) return <p className="loading-message">Loading sample profile…</p>;

  function updateField(event) { setProfile((current) => ({ ...current, [event.target.name]: event.target.value })); setSaved(false); }
  async function handleSubmit(event) { event.preventDefault(); await savePublicProfile(profile); setSaved(true); }

  return (
    <section className="form-page" aria-labelledby="profile-title">
      <p className="eyebrow">Public profile · Local mock data</p><h1 id="profile-title">Your public profile</h1>
      <p className="lead">Keep basic contact and location details ready for future reports. Changes below are not sent to or stored by a government system.</p>
      <form className="public-form" onSubmit={handleSubmit}>
        <label>Display name<input name="name" value={profile.name} onChange={updateField} required /></label>
        <label>Phone number<input name="phone" value={profile.phone} onChange={updateField} inputMode="tel" required /></label>
        <label>Usual area or ward<input name="area" value={profile.area} onChange={updateField} required /></label>
        <label>Emergency contact (optional)<input name="emergencyContact" value={profile.emergencyContact} onChange={updateField} /></label>
        <button className="button primary" type="submit">Save profile locally</button>
      </form>
      {saved && <div className="form-notice" role="status"><strong>Sample profile updated.</strong><span>The change exists only in this running browser session.</span></div>}
    </section>
  );
}
