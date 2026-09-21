import { useEffect, useState } from 'react';
import { ApiRequestError } from '../../services/apiClient';
import { getMyReports } from '../../services/reportService';

function formatDate(timestamp) { return timestamp ? new Date(timestamp).toLocaleString() : 'Not provided'; }
function statusClass(status) { return status.toLowerCase(); }

export function RequestTracker({ isAuthenticated, onOpenAccount }) {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(isAuthenticated);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!isAuthenticated) { setReports([]); setLoading(false); return; }
    let active = true;
    setLoading(true); setError(null);
    getMyReports().then((items) => { if (active) setReports(items); }).catch((requestError) => { if (active) setError(requestError instanceof ApiRequestError ? requestError : new ApiRequestError({ method: 'GET', endpoint: '/api/reports/my', status: null, code: 'UNKNOWN_ERROR', message: 'Unable to load reports.' })); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [isAuthenticated]);

  return <section className="feature-page" aria-labelledby="tracking-title"><div className="section-heading"><div><p className="eyebrow">My emergency reports</p><h1 id="tracking-title">Track submitted reports</h1></div><span className="demo-label">Signed-in reports only</span></div><p className="lead">Report statuses are provided by the Spider-X service. Government assistance requests remain frontend-only.</p>{!isAuthenticated && <div className="api-state"><strong>Sign in to view your reports.</strong><button className="text-button" onClick={onOpenAccount} type="button">Sign in or register</button></div>}{loading && <p className="api-state">Loading your reports…</p>}{error && <div className="api-state error" role="alert"><strong>Unable to load reports.</strong><span>{error.method} {error.endpoint} · {error.status ? `HTTP ${error.status}` : 'No HTTP response'} · {error.code}</span><span>{error.message}</span></div>}{!loading && !error && isAuthenticated && reports.length === 0 && <p className="api-state">You have not submitted any emergency reports.</p>}{!loading && !error && reports.length > 0 && <div className="tracker-list">{reports.map((report) => <article className="tracker-card" key={report.report_id}><div className="tracker-topline"><span className="item-type">{report.disaster_type}</span><span className={`request-status ${statusClass(report.status)}`}>{report.status}</span></div><h2>Emergency report</h2><p>{report.description}</p><footer><span>{report.report_id}</span><span>Submitted {formatDate(report.created_at)}</span></footer></article>)}</div>}</section>;
}

