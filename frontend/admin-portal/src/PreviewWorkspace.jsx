import { useMemo, useState } from 'react';

const STATUSES = ['PENDING', 'APPROVED', 'REJECTED', 'REVOKED'];

const initialApplications = [
  {
    application_id: 'PREVIEW-APP-1001',
    user_id: 'sample-user-01',
    official_email: 'ananya.rao@example.test',
    department: 'State Disaster Response',
    designation: 'District Emergency Officer',
    employee_id: 'DEMO-001',
    status: 'PENDING',
    created_at: '2026-10-22T08:30:00Z',
    reviewed_by: null,
    reviewed_at: null,
    rejection_reason: '',
  },
  {
    application_id: 'PREVIEW-APP-1002',
    user_id: 'sample-user-02',
    official_email: 'kiran.kumar@example.test',
    department: 'Emergency Management',
    designation: 'Response Coordinator',
    employee_id: 'DEMO-002',
    status: 'APPROVED',
    created_at: '2026-10-19T06:15:00Z',
    reviewed_by: 'Sample Administrator',
    reviewed_at: '2026-10-20T09:00:00Z',
    rejection_reason: '',
  },
  {
    application_id: 'PREVIEW-APP-1003',
    user_id: 'sample-user-03',
    official_email: 'meera.nair@example.test',
    department: 'Municipal Administration',
    designation: 'Relief Officer',
    employee_id: 'DEMO-003',
    status: 'REJECTED',
    created_at: '2026-10-17T04:00:00Z',
    reviewed_by: 'Sample Administrator',
    reviewed_at: '2026-10-18T05:00:00Z',
    rejection_reason: 'Sample rejection reason for UI testing.',
  },
  {
    application_id: 'PREVIEW-APP-1004',
    user_id: 'sample-user-04',
    official_email: 'arjun.dev@example.test',
    department: 'Public Safety',
    designation: 'Operations Officer',
    employee_id: 'DEMO-004',
    status: 'REVOKED',
    created_at: '2026-10-12T07:00:00Z',
    reviewed_by: 'Sample Administrator',
    reviewed_at: '2026-10-15T08:00:00Z',
    rejection_reason: 'Sample revocation reason for UI testing.',
  },
];

const initialAudit = {
  'PREVIEW-APP-1002': [
    {
      audit_id: 'audit-demo-1',
      action: 'APPROVED',
      created_at: '2026-10-20T09:00:00Z',
      admin_id: 'Sample Administrator',
      reason: '',
    },
  ],
  'PREVIEW-APP-1003': [
    {
      audit_id: 'audit-demo-2',
      action: 'REJECTED',
      created_at: '2026-10-18T05:00:00Z',
      admin_id: 'Sample Administrator',
      reason: 'Sample rejection reason for UI testing.',
    },
  ],
  'PREVIEW-APP-1004': [
    {
      audit_id: 'audit-demo-3',
      action: 'REVOKED',
      created_at: '2026-10-15T08:00:00Z',
      admin_id: 'Sample Administrator',
      reason: 'Sample revocation reason for UI testing.',
    },
  ],
};

const formatDate = (value) => {
  if (!value) return '—';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime()) ? '—' : parsed.toLocaleString();
};

function StatusPill({ status }) {
  return (
    <span className={`status-pill ${String(status || '').toLowerCase()}`}>
      {status}
    </span>
  );
}

export default function PreviewWorkspace() {
  const [applications, setApplications] = useState(initialApplications);
  const [auditById, setAuditById] = useState(initialAudit);
  const [view, setView] = useState('OVERVIEW');
  const [filter, setFilter] = useState('PENDING');
  const [selectedId, setSelectedId] = useState('PREVIEW-APP-1001');
  const [reason, setReason] = useState('');
  const [notice, setNotice] = useState('');

  const selected = applications.find(
    (application) => application.application_id === selectedId,
  );

  const filtered = useMemo(
    () => applications.filter(
      (application) => !filter || application.status === filter,
    ),
    [applications, filter],
  );

  function decide(action) {
    if (!selected) return;

    if (action !== 'APPROVED' && !reason.trim()) {
      setNotice('Enter a sample reason before rejecting or revoking access.');
      return;
    }

    const now = new Date().toISOString();
    const decisionReason = action === 'APPROVED' ? '' : reason.trim();

    setApplications((current) => current.map((application) =>
      application.application_id === selectedId
        ? {
            ...application,
            status: action,
            reviewed_by: 'Preview Administrator',
            reviewed_at: now,
            rejection_reason: decisionReason,
          }
        : application,
    ));

    setAuditById((current) => ({
      ...current,
      [selectedId]: [
        {
          audit_id: `preview-${Date.now()}`,
          action,
          created_at: now,
          admin_id: 'Preview Administrator',
          reason: decisionReason,
        },
        ...(current[selectedId] || []),
      ],
    }));

    setNotice(
      `Preview only: application marked ${action}. No backend request was sent.`,
    );
    setReason('');
  }

  function resetPreview() {
    setApplications(initialApplications);
    setAuditById(initialAudit);
    setFilter('PENDING');
    setSelectedId('PREVIEW-APP-1001');
    setReason('');
    setNotice('Sample data has been reset.');
    setView('OVERVIEW');
  }

  return (
    <div className="admin-shell">
      <aside className="admin-sidebar">
        <div className="brand-lockup">
          <span className="brand-mark">R</span>
          <div>
            <strong>RAKSHAK</strong>
            <small>ADMIN PORTAL</small>
          </div>
        </div>

        <div className="sidebar-label">DEVELOPMENT WORKSPACE</div>

        <button
          className={`side-link ${view === 'OVERVIEW' ? 'active' : ''}`}
          onClick={() => setView('OVERVIEW')}
        >
          ▦ <span>Overview</span>
        </button>

        <button
          className={`side-link ${view === 'APPLICATIONS' ? 'active' : ''}`}
          onClick={() => setView('APPLICATIONS')}
        >
          ▤ <span>Government applications</span>
        </button>

        <div className="sidebar-note">Sample data only · No live decisions</div>
      </aside>

      <main className="admin-main">
        <div className="alert-message notice" role="status">
          DEVELOPMENT PREVIEW — SAMPLE DATA ONLY. Decisions are simulated in
          memory and are never sent to the backend.
        </div>

        <header className="admin-topbar">
          <div className="topbar-title">
            <span className="eyebrow">RAKSHAK / ACCESS GOVERNANCE</span>
            <h1>{view === 'OVERVIEW' ? 'Admin overview' : 'Government applications'}</h1>
            <p>Preview application review, statuses and decision history.</p>
          </div>
          <button className="button secondary" onClick={resetPreview}>
            Reset preview
          </button>
        </header>

        {notice && <p className="alert-message notice" role="status">{notice}</p>}

        {view === 'OVERVIEW' && (
          <>
            <section className="welcome-strip">
              <div>
                <span className="eyebrow">ACCESS GOVERNANCE</span>
                <h2>Review with confidence.</h2>
                <p>Explore the proposed application review workflow using fictional records.</p>
              </div>
              <button
                className="button primary"
                onClick={() => {
                  setFilter('PENDING');
                  setView('APPLICATIONS');
                }}
              >
                Review pending applications →
              </button>
            </section>

            <section className="summary-grid">
              {STATUSES.map((status) => (
                <article className="summary-card" key={status}>
                  <span>{status.charAt(0) + status.slice(1).toLowerCase()} applications</span>
                  <strong>
                    {applications.filter((application) => application.status === status).length}
                  </strong>
                  <small>Current sample records</small>
                </article>
              ))}
            </section>

            <section className="content-card overview-actions">
              <div>
                <span className="eyebrow">REVIEW WORKFLOW</span>
                <h2>Government access applications</h2>
                <p>Inspect applicant details, simulate a decision and view audit history.</p>
              </div>
              <button className="button primary" onClick={() => setView('APPLICATIONS')}>
                Open applications
              </button>
            </section>
          </>
        )}

        {view === 'APPLICATIONS' && (
          <section className="content-card">
            <div className="list-heading">
              <div>
                <span className="eyebrow">APPLICATION REGISTER</span>
                <h2>Government access applications</h2>
                <p>All records shown here are fictional preview data.</p>
              </div>
            </div>

            <div className="filter-toolbar">
              <label htmlFor="preview-filter">Application status</label>
              <select
                id="preview-filter"
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
              >
                <option value="">All statuses</option>
                {STATUSES.map((status) => (
                  <option key={status} value={status}>{status}</option>
                ))}
              </select>
            </div>

            {filtered.length === 0 ? (
              <div className="empty-state">
                <span>✓</span>
                <h3>No sample applications</h3>
                <p>Choose another status to see the example records.</p>
              </div>
            ) : (
              <div className="applications-table-wrap">
                <table className="applications-table">
                  <thead>
                    <tr>
                      <th>Official email</th>
                      <th>Department</th>
                      <th>Status</th>
                      <th>Submitted</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((application) => (
                      <tr
                        key={application.application_id}
                        className={selectedId === application.application_id ? 'selected-row' : ''}
                      >
                        <td>
                          <strong>{application.official_email}</strong>
                          <small>{application.designation}</small>
                        </td>
                        <td>{application.department}</td>
                        <td><StatusPill status={application.status} /></td>
                        <td>{formatDate(application.created_at)}</td>
                        <td>
                          <button
                            className="button table-button"
                            onClick={() => {
                              setSelectedId(application.application_id);
                              setReason('');
                              setNotice('');
                            }}
                          >
                            Review
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {selected && (
              <section className="detail-card">
                <div className="detail-title">
                  <div>
                    <span className="eyebrow">APPLICATION REVIEW · SAMPLE</span>
                    <h2>Applicant details</h2>
                    <p>Reference: {selected.application_id}</p>
                  </div>
                  <StatusPill status={selected.status} />
                </div>

                <dl className="detail-grid">
                  {[
                    ['Official email', selected.official_email],
                    ['Applicant ID', selected.user_id],
                    ['Department', selected.department],
                    ['Designation', selected.designation],
                    ['Employee ID', selected.employee_id],
                    ['Submitted', formatDate(selected.created_at)],
                    ['Reviewed by', selected.reviewed_by],
                    ['Reviewed at', formatDate(selected.reviewed_at)],
                    ['Decision reason', selected.rejection_reason],
                  ].map(([label, value]) => (
                    <div key={label}>
                      <dt>{label}</dt>
                      <dd>{value || '—'}</dd>
                    </div>
                  ))}
                </dl>

                {['PENDING', 'APPROVED'].includes(selected.status) && (
                  <fieldset className="decision-box">
                    <legend>
                      {selected.status === 'PENDING' ? 'Simulated application decision' : 'Simulated access control'}
                    </legend>
                    <label htmlFor="preview-reason">
                      Reason {selected.status === 'PENDING' ? '(required for rejection)' : '(required for revocation)'}
                    </label>
                    <textarea
                      id="preview-reason"
                      maxLength={2000}
                      value={reason}
                      onChange={(event) => setReason(event.target.value)}
                      placeholder="Type a fictional reason for this UI preview."
                    />
                    <div className="decision-actions">
                      {selected.status === 'PENDING' && (
                        <>
                          <button className="button approve" onClick={() => decide('APPROVED')}>
                            ✓ Simulate approval
                          </button>
                          <button
                            className="button reject"
                            disabled={!reason.trim()}
                            onClick={() => decide('REJECTED')}
                          >
                            Simulate rejection
                          </button>
                        </>
                      )}
                      {selected.status === 'APPROVED' && (
                        <button
                          className="button reject"
                          disabled={!reason.trim()}
                          onClick={() => decide('REVOKED')}
                        >
                          Simulate revocation
                        </button>
                      )}
                    </div>
                  </fieldset>
                )}

                <div className="audit-heading">
                  <h3>Preview audit history</h3>
                  <span>{(auditById[selectedId] || []).length} events</span>
                </div>

                {(auditById[selectedId] || []).length === 0 ? (
                  <p className="feedback">No sample audit events yet.</p>
                ) : (
                  <ol className="audit-list">
                    {auditById[selectedId].map((entry) => (
                      <li key={entry.audit_id}>
                        <div className="audit-marker" />
                        <div>
                          <strong>{entry.action}</strong>
                          <span>{formatDate(entry.created_at)}</span>
                          <p>Administrator: {entry.admin_id}</p>
                          {entry.reason && <p className="audit-reason">{entry.reason}</p>}
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </section>
            )}
          </section>
        )}

        <footer className="admin-footer">
          <span>RAKSHAK · Development Preview</span>
          <span>No real account decisions or backend mutations</span>
        </footer>
      </main>
    </div>
  );
}
