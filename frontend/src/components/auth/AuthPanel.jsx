import { useState } from 'react';
import { ApiRequestError } from '../../services/apiClient';
import { registerAccount, loginAccount } from '../../services/authService';

function errorDetails(error) {
  const status = error.status ? `HTTP ${error.status}` : 'No HTTP response';
  return `${error.method} ${error.endpoint} · ${status} · ${error.code}`;
}

export function AuthPanel({ onAuthenticated }) {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ email: '', password: '', name: '', phone: '', location: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState(null);

  function updateField(event) { setForm((current) => ({ ...current, [event.target.name]: event.target.value })); }
  function switchMode(nextMode) { setMode(nextMode); setError(null); setMessage(''); }

  async function handleSubmit(event) {
    event.preventDefault();
    setError(null);
    setMessage('');
    setLoading(true);
    try {
      if (mode === 'register') {
        const data = await registerAccount({
          email: form.email,
          password: form.password,
          ...(form.name ? { name: form.name } : {}),
          ...(form.phone ? { phone: form.phone } : {}),
          ...(form.location ? { location: form.location } : {}),
        });
        if (data.session?.access_token) {
          await onAuthenticated(data.session.access_token);
        } else {
          setMessage('Registration was successful. Please sign in to continue.');
          setMode('login');
        }
      } else {
        const data = await loginAccount({ email: form.email, password: form.password });
        await onAuthenticated(data.session.access_token);
      }
    } catch (requestError) {
      setError(requestError instanceof ApiRequestError ? requestError : new ApiRequestError({ method: 'POST', endpoint: mode === 'login' ? '/api/auth/login' : '/api/auth/register', status: null, code: 'UNKNOWN_ERROR', message: 'Unable to complete authentication.' }));
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="form-page" aria-labelledby="auth-title">
      <p className="eyebrow">Public account</p><h1 id="auth-title">{mode === 'login' ? 'Sign in' : 'Create an account'}</h1>
      <p className="lead">Use your public account to submit and track your own emergency reports.</p>
      <div className="auth-tabs"><button className={mode === 'login' ? 'nav-link active' : 'nav-link'} onClick={() => switchMode('login')} type="button">Sign in</button><button className={mode === 'register' ? 'nav-link active' : 'nav-link'} onClick={() => switchMode('register')} type="button">Register</button></div>
      <form className="public-form" onSubmit={handleSubmit}>
        {mode === 'register' && <><label>Name (optional)<input name="name" value={form.name} onChange={updateField} autoComplete="name" /></label><label>Phone (optional)<input name="phone" value={form.phone} onChange={updateField} autoComplete="tel" /></label><label>Location (optional)<input name="location" value={form.location} onChange={updateField} /></label></>}
        <label>Email<input name="email" value={form.email} onChange={updateField} autoComplete="email" type="email" required /></label>
        <label>Password<input name="password" value={form.password} onChange={updateField} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type="password" required /></label>
        <button className="button primary" disabled={loading} type="submit">{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Register'}</button>
      </form>
      {message && <div className="form-notice" role="status"><strong>{message}</strong></div>}
      {error && <div className="api-state error" role="alert"><strong>Authentication failed.</strong><span>{errorDetails(error)}</span><span>{error.message}</span></div>}
    </section>
  );
}

