import { useEffect, useRef, useState } from 'react';
import { listApplications, getApplication, getApplicationAudit, decideApplication } from '../../services/governmentApprovalService';
import './adminApprovals.css';

const statuses = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'];
const pageSize = 20;
const message = (error) => error.status === 401 || error.code === 'AUTH_REQUIRED'
  ? 'Your session has expired. Sign out and sign in again.'
  : error.status === 403 ? 'Access denied. An ADMIN account is required.' : error.message || 'Unable to load approval data.';
const date = (value) => value ? new Date(value).toLocaleString() : '—';

export default function AdminApprovals({ role }) {
  if (role !== 'ADMIN') return <section className="admin-approvals" role="alert">Access denied. An ADMIN account is required.</section>;
  return <ApprovalWorkspace />;
}

function ApprovalWorkspace() {
  const [status, setStatus] = useState('PENDING');
  const [offset, setOffset] = useState(0);
  const [rows, setRows] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [audit, setAudit] = useState([]);
  const [listLoading, setListLoading] = useState(true);
  const [detailLoading, setDetailLoading] = useState(false);
  const [listError, setListError] = useState('');
  const [detailError, setDetailError] = useState('');
  const [notice, setNotice] = useState('');
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const submitting = useRef(false);

  useEffect(() => {
    let active = true;
    setListLoading(true); setListError(''); setRows([]);
    listApplications({ status, limit: pageSize, offset }).then((data) => {
      if (!Array.isArray(data)) throw new Error('Unexpected application list response.');
      if (active) setRows(data);
    }).catch((error) => { if (active) setListError(message(error)); })
      .finally(() => { if (active) setListLoading(false); });
    return () => { active = false; };
  }, [status, offset, refresh]);

  useEffect(() => {
    let active = true;
    setDetail(null); setAudit([]); setDetailError(''); setReason('');
    if (!selected) { setDetailLoading(false); return; }
    setDetailLoading(true);
    Promise.all([getApplication(selected), getApplicationAudit(selected)]).then(([application, history]) => {
      if (!application || !Array.isArray(history)) throw new Error('Unexpected application detail response.');
      if (active) { setDetail(application); setAudit(history); }
    }).catch((error) => { if (active) setDetailError(message(error)); })
      .finally(() => { if (active) setDetailLoading(false); });
    return () => { active = false; };
  }, [selected, refresh]);

  async function decide(action) {
    if (submitting.current || !detail) return;
    if (action !== 'approve' && (!reason.trim() || reason.trim().length > 2000)) {
      setNotice('Enter a reason of 1–2000 characters.'); return;
    }
    submitting.current = true; setBusy(true); setNotice('');
    try {
      await decideApplication(detail.application_id, action, reason);
      setNotice('Decision saved. Application data refreshed.');
      setRefresh((value) => value + 1);
    } catch (error) {
      if (error.status === 409) {
        setNotice('This application changed or is no longer eligible. Review the refreshed status before trying again.');
        setRefresh((value) => value + 1);
      } else setNotice(message(error));
    } finally { submitting.current = false; setBusy(false); }
  }

  return <section className="admin-approvals" aria-labelledby="approval-title">
    <h2 id="approval-title">Government approvals</h2>
    <p>Review official identity and employment claims before granting Government access.</p>
    <div className="approval-toolbar">
      <label>Status <select value={status} disabled={busy} onChange={(event) => { setStatus(event.target.value); setOffset(0); setSelected(null); setNotice(''); }}>
        <option value="">All statuses</option>{statuses.map((value) => <option key={value}>{value}</option>)}
      </select></label>
      <button disabled={busy || listLoading || detailLoading} onClick={() => setRefresh((value) => value + 1)}>Refresh</button>
    </div>
    {notice && <p role="status">{notice}</p>}
    {listLoading ? <p role="status">Loading applications…</p> : listError ? <p role="alert">{listError}</p> : rows.length === 0 ? <p>No applications on this page.</p> :
      <div className="approval-table"><table><thead><tr><th>Official email</th><th>Department</th><th>Status</th><th>Submitted</th><th>Details</th></tr></thead>
        <tbody>{rows.map((row) => <tr key={row.application_id}><td>{row.official_email}</td><td>{row.department}</td><td>{row.status}</td><td>{date(row.created_at)}</td><td><button disabled={busy} aria-pressed={selected === row.application_id} onClick={() => { setSelected(row.application_id); setNotice(''); }}>Review<span className="approval-sr-only"> {row.official_email}</span></button></td></tr>)}</tbody>
      </table></div>}
    <nav className="approval-toolbar" aria-label="Applications pagination">
      <button disabled={busy || listLoading || offset === 0} onClick={() => setOffset((value) => Math.max(0, value - pageSize))}>Previous</button>
      <span>Page {offset / pageSize + 1}</span>
      <button disabled={busy || listLoading || Boolean(listError) || rows.length < pageSize} onClick={() => setOffset((value) => value + pageSize)}>Next</button>
    </nav>
    {!selected && <p>Select an application to review its details and decision history.</p>}
    {detailLoading && <p role="status">Loading application and audit history…</p>}
    {detailError && <p role="alert">{detailError} Use Refresh to retry.</p>}
    {detail && !detailLoading && <article className="approval-detail" aria-labelledby="application-title">
      <h3 id="application-title">Application details</h3>
      <dl>{[
        ['Application ID', detail.application_id], ['Applicant ID', detail.user_id], ['Official email', detail.official_email],
        ['Department', detail.department], ['Designation', detail.designation], ['Employee ID', detail.employee_id],
        ['Status', detail.status], ['Submitted', date(detail.created_at)], ['Reviewed by', detail.reviewed_by],
        ['Reviewed at', date(detail.reviewed_at)], ['Latest rejection / revocation reason', detail.rejection_reason],
      ].map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || '—'}</dd></div>)}</dl>
      {['PENDING', 'APPROVED'].includes(detail.status) && <fieldset disabled={busy}>
        <legend>Decision</legend>
        <label>Reason (required for rejection or revocation)<textarea value={reason} maxLength={2000} onChange={(event) => setReason(event.target.value)} /></label>
        <div className="approval-toolbar">
          {detail.status === 'PENDING' && <><button disabled={busy} onClick={() => decide('approve')}>Approve</button><button disabled={busy || !reason.trim()} onClick={() => decide('reject')}>Reject</button></>}
          {detail.status === 'APPROVED' && <button disabled={busy || !reason.trim()} onClick={() => decide('revoke')}>Revoke access</button>}
          {busy && <span role="status">Saving decision…</span>}
        </div>
      </fieldset>}
      <h3>Approval audit history</h3>
      {audit.length === 0 ? <p>No decisions recorded.</p> : <ol>{audit.map((entry, index) => <li key={entry.audit_id || index}><strong>{entry.action}</strong> — {date(entry.created_at)}<p>Admin: {entry.admin_id || '—'}</p>{entry.reason && <p>{entry.reason}</p>}</li>)}</ol>}
    </article>}
  </section>;
}
