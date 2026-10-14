export function PublicProfile({ auth, onOpenAccount }) {
  if (auth.loading) return <p className="loading-message">Loading your profile…</p>;
  if (!auth.profile) return <section className="form-page"><p className="eyebrow">Public profile</p><h1>Your public profile</h1><div className="api-state"><strong>Sign in to view your profile.</strong><button className="text-button" onClick={onOpenAccount} type="button">Sign in or register</button></div></section>;

  const { profile } = auth;
  return <section className="form-page" aria-labelledby="profile-title"><p className="eyebrow">Public profile</p><h1 id="profile-title">Your public profile</h1><p className="lead">Profile information is provided by your authenticated Spider-X account.</p><dl className="profile-details"><div><dt>Name</dt><dd>{profile.name || 'Not provided'}</dd></div><div><dt>Email</dt><dd>{auth.user?.email || 'Not provided'}</dd></div><div><dt>Phone</dt><dd>{profile.phone || 'Not provided'}</dd></div><div><dt>Location</dt><dd>{profile.location || 'Not provided'}</dd></div><div><dt>Role</dt><dd>{profile.role}</dd></div></dl></section>;
}

