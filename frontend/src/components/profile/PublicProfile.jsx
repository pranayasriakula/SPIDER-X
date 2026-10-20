export function PublicProfile({ auth, onOpenAccount }) {
  if (auth.loading) {
    return <p className="loading-message">Loading your profile...</p>;
  }

  if (!auth.profile) {
    return (
      <section className="form-page">
        <p className="eyebrow">RAKSHAK ACCOUNT</p>
        <h1>Your public profile</h1>

        <div className="api-state">
          <strong>Sign in to view your profile.</strong>
          <p>Sign in to review your account information.</p>

          <button
            className="text-button"
            onClick={onOpenAccount}
            type="button"
          >
            Sign in or register
          </button>
        </div>
      </section>
    );
  }

  const { profile } = auth;

  const profileFields = [
    { label: 'Full name', value: profile.name },
    { label: 'Email address', value: auth.user?.email },
    { label: 'Phone number', value: profile.phone },
    { label: 'Location', value: profile.location },
    { label: 'Account role', value: profile.role },
  ];

  return (
    <section className="form-page" aria-labelledby="profile-title">
      <p className="eyebrow">RAKSHAK ACCOUNT</p>
      <h1 id="profile-title">Your public profile</h1>

      <p className="lead">
        Review your Rakshak public safety account information below.
      </p>

      <div className="profile-details">
        {profileFields.map((field) => (
          <article className="profile-detail-card" key={field.label}>
            <span className="profile-detail-label">{field.label}</span>
            <strong className="profile-detail-value">
              {field.value || 'Not provided'}
            </strong>
          </article>
        ))}
      </div>

      <p className="field-help">
        To update information that is not shown correctly, contact your
        project support team.
      </p>
    </section>
  );
}