import { useEffect, useState } from 'react';
import { getCurrentUser, loginAccount, logoutAccount } from '../../src/services/authService.js';
import { clearAccessToken, getAccessToken, storeAccessToken } from '../../src/services/authSession.js';
import { listApplications, getApplication, getApplicationAudit, decideApplication } from '../../src/services/governmentApprovalService.js';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'];
const PAGE_SIZE = 20;

function errorMessage(error) {
  if (error?.status === 401 || error?.code === 'AUTH_REQUIRED') return 'Your session has expired. Please sign in again.';
  if (error?.status === 403) return 'Access denied. An ADMIN account is required.';
  if (error?.status === 409) return 'This application has changed. Refresh the list and review its current status.';
  return error?.message || 'The request could not be completed. Please try again.';
}

function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? '—' : date.toLocaleString();
}

function SummaryCard({ label, value, description }) {
  return (
    <article className="summary-card">
      <span>{label}</span>
      <strong>{value ?? '—'}</strong>
      <small>{description}</small>
    </article>
  );
}

export default function AdminApp() {
  const [checkingSession, setCheckingSession] = useState(true);
  const [admin, setAdmin] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginBusy, setLoginBusy] = useState(false);
  const [authError, setAuthError] = useState('');

  const [view, setView] = useState('OVERVIEW');
  const [statusFilter, setStatusFilter] = useState('PENDING');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  const [counts, setCounts] = useState({});
  const [countsLoading, setCountsLoading] = useState(false);
  const [countsError, setCountsError] = useState('');

  const [selectedId, setSelectedId] = useState(null);
  const [detail, setDetail] = useState(null);
  const [audit, setAudit] = useState([]);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');
  const [reason, setReason] = useState('');
  const [decisionBusy, setDecisionBusy] = useState(false);
  const [notice, setNotice] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);

  useEffect(() => {
    let active = true;
    const token = getAccessToken();

    if (!token) {
      setCheckingSession(false);
      return () => { active = false; };
    }

    getCurrentUser(token)
      .then(({ user, profile }) => {
        if (!active) return;
        if (profile?.role !== 'ADMIN') {
          clearAccessToken();
          setAuthError('This account does not have Admin Portal access.');
          return;
        }
        setAdmin({ user, profile });
      })
      .catch((error) => {
        if (!active) return;
        clearAccessToken();
        setAuthError(errorMessage(error));
      })
      .finally(() => {
        if (active) setCheckingSession(false);
      });

    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!admin) return;
    let active = true;
    setCountsLoading(true);
    setCountsError('');

    Promise.all(
      STATUSES.map(async (status) => {
        const data = await listApplications({ status, limit: 100, offset: 0 });
        if (!Array.isArray(data)) throw new Error('Unexpected application list response.');
        return [status, data.length];
      }),
    )
      .then((entries) => {
        if (active) setCounts(Object.fromEntries(entries));
      })
      .catch((error) => {
        if (active) setCountsError(errorMessage(error));
      })
      .finally(() => {
        if (active) setCountsLoading(false);
      });

    return () => { active = false; };
  }, [admin, refreshVersion]);

  useEffect(() => {
    if (!admin || view !== 'APPLICATIONS') return;
    let active = true;
    setListLoading(true);
    setListError('');
    setRows([]);

    listApplications({
      status: statusFilter,
      limit: PAGE_SIZE,
      offset,
    })
      .then((data) => {
        if (!Array.isArray(data)) throw new Error('Unexpected application list response.');
        if (active) setRows(data);
      })
      .catch((error) => {
        if (active) setListError(errorMessage(error));
      })
      .finally(() => {
        if (active) setListLoading(false);
      });

    return () => { active = false; };
  }, [admin, view, statusFilter, offset, refreshVersion]);

  useEffect(() => {
    if (!admin || !selectedId) {
      setDetail(null);
      setAudit([]);
      return;
    }

    let active = true;
    setDetailLoading(true);
    setDetailError('');
    setDetail(null);
    setAudit([]);

    Promise.all([
      getApplication(selectedId),
      getApplicationAudit(selectedId),
    ])
      .then(([application, history]) => {
        if (!application || !Array.isArray(history)) {
          throw new Error('Unexpected application detail response.');
        }
        if (active) {
          setDetail(application);
          setAudit(history);
        }
      })
      .catch((error) => {
        if (active) setDetailError(errorMessage(error));
      })
      .finally(() => {
        if (active) setDetailLoading(false);
      });

    return () => { active = false; };
  }, [admin, selectedId, refreshVersion]);

  async function handleLogin(event) {
    event.preventDefault();
    setLoginBusy(true);
    setAuthError('');

    try {
      const result = await loginAccount({
        email: email.trim(),
        password,
      });
      const token = result?.session?.access_token;

      if (!token) throw new Error('The login response did not include an access token.');

      storeAccessToken(token);
      const { user, profile } = await getCurrentUser(token);

      if (profile?.role !== 'ADMIN') {
        clearAccessToken();
        setAuthError('This account does not have Admin Portal access.');
        return;
      }

      setAdmin({ user, profile });
      setPassword('');
    } catch (error) {
      clearAccessToken();
      setAuthError(errorMessage(error));
    } finally {
      setLoginBusy(false);
    }
  }

  async function handleLogout() {
    const token = getAccessToken();
    try {
      if (token) await logoutAccount(token);
    } catch {
      // Always clear the local session, including when the server is unreachable.
    } finally {
      clearAccessToken();
      setAdmin(null);
      setSelectedId(null);
      setRows([]);
      setCounts({});
      setView('OVERVIEW');
      setAuthError('');
    }
  }

  async function handleDecision(action) {
    if (!detail || decisionBusy) return;

    if (action !== 'approve' && !reason.trim()) {
      setNotice('Enter a reason before rejecting or revoking access.');
      return;
    }

    const actionLabel = {
      approve: 'approve this application',
      reject: 'reject this application',
      revoke: 'revoke this government access',
    }[action];

    if (!window.confirm(`Are you sure you want to ${actionLabel}?`)) return;

    setDecisionBusy(true);
    setNotice('');

    try {
      await decideApplication(detail.application_id, action, reason);
      setNotice(`Application ${action === 'revoke' ? 'access revoked' : action === 'approve' ? 'approved' : 'rejected'} successfully.`);
      setReason('');
      setRefreshVersion((value) => value + 1);
    } catch (error) {
      setNotice(errorMessage(error));
      if (error?.status === 409) setRefreshVersion((value) => value + 1);
    } finally {
      setDecisionBusy(false);
    }
  }

  function openApplications(status = 'PENDING') {
    setStatusFilter(status);
    setOffset(0);
    setSelectedId(null);
    setNotice('');
    setView('APPLICATIONS');
  }

  if (checkingSession) {
    return <main className="admin-loading"><div className="brand-mark">R</div><p>Verifying administrator access…</p></main>;
  }

  if (!admin) {
    return (
      <main className="admin-login-page">
        <section className="login-decoration">
          <div className="brand-lockup"><span className="brand-mark">R</span><div><strong>RAKSHAK</strong><small>ADMINISTRATION</small></div></div>
          <p className="login-kicker">SECURE ACCESS CONTROL</p>
          <h1>Every approval.<br />Accountable by design.</h1>
          <p className="login-copy">Manage government access applications, review verification details and maintain a traceable decision history.</p>
          <div className="login-security-note"><span>●</span> Administrator access is verified by the backend.</div>
        </section>
        <section className="login-form-side">
          <form className="login-card" onSubmit={handleLogin}>
            <span className="eyebrow">ADMIN PORTAL</span>
            <h2>Welcome back</h2>
            <p>Sign in with your authorised administrator account.</p>
            <label htmlFor="admin-email">Email address</label>
            <input id="admin-email" type="email" autoComplete="username" value={email} onChange={(event) => setEmail(event.target.value)} required />
            <label htmlFor="admin-password">Password</label>
            <input id="admin-password" type="password" autoComplete="current-password" value={password} onChange={(event) => setPassword(event.target.value)} required />
            {authError && <p className="alert-message error" role="alert">{authError}</p>}
            <button className="button primary full-width" type="submit" disabled={loginBusy}>{loginBusy ? 'Verifying access…' : 'Sign in securely'}</button>
            <p className="login-footnote">Only accounts with the backend-confirmed ADMIN role can enter this portal.</p>
          </form>
        </section>
      </main>
    );
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand-lockup"><span className="brand-mark">R</span><div><strong>RAKSHAK</strong><small>ADMIN PORTAL</small></div></div>
        <div className="sidebar-label">WORKSPACE</div>
        <button className={`side-link ${view === 'OVERVIEW' ? 'active' : ''}`} onClick={() => setView('OVERVIEW')}>▦ <span>Overview</span></button>
        <button className={`side-link ${view === 'APPLICATIONS' ? 'active' : ''}`} onClick={() => openApplications('PENDING')}>▤ <span>Government applications</span></button>
        <div className="sidebar-note"><span className="online-dot" /> Secure administration</div>
      </aside>

      <main className="admin-main">
        <header className="admin-topbar">
          <div className="topbar-title"><span className="eyebrow">RAKSHAK / ACCESS GOVERNANCE</span><h1>{view === 'OVERVIEW' ? 'Admin overview' : 'Government applications'}</h1><p>Review access requests and manage application decisions.</p></div>
          <div className="admin-user"><div className="user-avatar">{(admin.profile?.name || admin.user?.email || 'A').charAt(0).toUpperCase()}</div><div><strong>{admin.profile?.name || admin.user?.email}</strong><span>ADMINISTRATOR</span></div><button className="button subtle" onClick={handleLogout}>Sign out</button></div>
        </header>

        {notice && <div className="alert-message notice" role="status">{notice}</div>}

        {view === 'OVERVIEW' && (
          <>
            <section className="welcome-strip"><div><span className="eyebrow">ACCESS GOVERNANCE</span><h2>Review with confidence.</h2><p>Keep government access decisions consistent, verified and traceable.</p></div><button className="button primary" onClick={() => openApplications('PENDING')}>Review pending applications <span>→</span></button></section>
            {countsError && <div className="alert-message error" role="alert">{countsError}</div>}
            <section className="summary-grid">
              {STATUSES.map((status) => <SummaryCard key={status} label={status.charAt(0) + status.slice(1).toLowerCase()} value={countsLoading ? '…' : counts[status]} description="Records retrieved (up to 100)" />)}
            </section>
            <p className="data-note">Summary counts reflect the first 100 records per status because the current API does not return total-count metadata.</p>
            <section className="content-card overview-actions"><div><span className="eyebrow">REVIEW WORKFLOW</span><h2>Government access applications</h2><p>Inspect the applicant’s official details, record a decision and review the audit history.</p></div><button className="button primary" onClick={() => openApplications('PENDING')}>Open applications</button></section>
          </>
        )}

        {view === 'APPLICATIONS' && (
          <section className="content-card">
            <div className="list-heading"><div><span className="eyebrow">APPLICATION REGISTER</span><h2>Government access applications</h2><p>Choose a status to review the application register.</p></div><button className="button secondary" disabled={listLoading || decisionBusy} onClick={() => setRefreshVersion((value) => value + 1)}>↻ Refresh</button></div>
            <div className="filter-toolbar"><label htmlFor="status-filter">Application status</label><select id="status-filter" value={statusFilter} disabled={decisionBusy} onChange={(event) => { setStatusFilter(event.target.value); setOffset(0); setSelectedId(null); setNotice(''); }}><option value="">All statuses</option>{STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select></div>
            {listLoading ? <p className="feedback" role="status">Loading applications…</p> : listError ? <p className="feedback error" role="alert">{listError}</p> : rows.length === 0 ? <div className="empty-state"><span>✓</span><h3>No applications found</h3><p>No applications match this status on the current page.</p></div> : (
              <div className="applications-table-wrap"><table className="applications-table"><thead><tr><th>Applicant / official email</th><th>Department</th><th>Status</th><th>Submitted</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.application_id} className={selectedId === row.application_id ? 'selected-row' : ''}><td><strong>{row.official_email || '—'}</strong><small>{row.designation || 'Government applicant'}</small></td><td>{row.department || '—'}</td><td><span className={`status-pill ${String(row.status || '').toLowerCase()}`}>{row.status}</span></td><td>{formatDate(row.created_at)}</td><td><button className="button table-button" onClick={() => { setSelectedId(row.application_id); setReason(''); setNotice(''); }}>Review</button></td></tr>)}</tbody></table></div>
            )}
            <div className="pagination"><button className="button secondary" disabled={listLoading || offset === 0} onClick={() => setOffset((value) => Math.max(0, value - PAGE_SIZE))}>← Previous</button><span>Page {offset / PAGE_SIZE + 1}</span><button className="button secondary" disabled={listLoading || Boolean(listError) || rows.length < PAGE_SIZE} onClick={() => setOffset((value) => value + PAGE_SIZE)}>Next →</button></div>
          </section>
        )}

        {view === 'APPLICATIONS' && selectedId && (
          <section className="content-card detail-card">
            {detailLoading ? <p className="feedback" role="status">Loading application details and audit history…</p> : detailError ? <p className="feedback error" role="alert">{detailError}</p> : detail && (
              <>
                <div className="detail-title"><div><span className="eyebrow">APPLICATION REVIEW</span><h2>Applicant details</h2><p>Reference: {detail.application_id}</p></div><span className={`status-pill ${String(detail.status || '').toLowerCase()}`}>{detail.status}</span></div>
                <dl className="detail-grid">{[['Official email', detail.official_email], ['Applicant ID', detail.user_id], ['Department', detail.department], ['Designation', detail.designation], ['Employee ID', detail.employee_id], ['Submitted', formatDate(detail.created_at)], ['Reviewed by', detail.reviewed_by], ['Reviewed at', formatDate(detail.reviewed_at)], ['Decision reason', detail.rejection_reason]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
                {['PENDING', 'APPROVED'].includes(detail.status) && (
                  <fieldset className="decision-box" disabled={decisionBusy}>
                    <legend>{detail.status === 'PENDING' ? 'Application decision' : 'Government access control'}</legend>
                    <label htmlFor="decision-reason">Reason <span>{detail.status === 'PENDING' ? '(required for rejection)' : '(required for revocation)'}</span></label>
                    <textarea id="decision-reason" maxLength={2000} value={reason} onChange={(event) => setReason(event.target.value)} placeholder="Add a concise reason when rejecting or revoking access." />
                    <div className="decision-actions">
                      {detail.status === 'PENDING' && <><button className="button approve" disabled={decisionBusy} onClick={() => handleDecision('approve')}>✓ Approve application</button><button className="button reject" disabled={decisionBusy || !reason.trim()} onClick={() => handleDecision('reject')}>Reject application</button></>}
                      {detail.status === 'APPROVED' && <button className="button reject" disabled={decisionBusy || !reason.trim()} onClick={() => handleDecision('revoke')}>Revoke government access</button>}
                      {decisionBusy && <span role="status">Saving decision…</span>}
                    </div>
                  </fieldset>
                )}
                <div className="audit-heading"><h3>Decision audit history</h3><span>{audit.length} event{audit.length === 1 ? '' : 's'}</span></div>
                {audit.length === 0 ? <p className="feedback">No audit events are available for this application.</p> : <ol className="audit-list">{audit.map((entry, index) => <li key={entry.audit_id || index}><div className="audit-marker" /><div><strong>{entry.action || 'Application event'}</strong><span>{formatDate(entry.created_at)}</span><p>Administrator: {entry.admin_id || '—'}</p>{entry.reason && <p className="audit-reason">{entry.reason}</p>}</div></li>)}</ol>}
              </>
            )}
          </section>
        )}
        <footer className="admin-footer"><span>RAKSHAK · Access Governance</span><span>Decisions are validated by the backend</span></footer>
      </main>
    </div>
  );
}
