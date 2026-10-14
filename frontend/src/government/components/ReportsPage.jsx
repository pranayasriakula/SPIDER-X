import { useEffect, useMemo, useState } from 'react';
import { createAction, getActions, getReport, getReports, updateReport } from '../api/client.js';

const REPORT_STATUSES = ['PENDING', 'VERIFIED', 'REJECTED', 'RESOLVED'];
const emptyAction = { action_type: '', description: '', status: '', assigned_resource: '', report_id: '' };

const displayDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date.toLocaleString() : 'Not available';
};

const coordinates = (report) => (
  Number.isFinite(report?.latitude) && Number.isFinite(report?.longitude)
    ? `${report.latitude.toFixed(4)}, ${report.longitude.toFixed(4)}`
    : 'Location unavailable'
);

function ReportsPage() {
  const [reports, setReports] = useState([]);
  const [reportsState, setReportsState] = useState('loading');
  const [reportsError, setReportsError] = useState('');
  const [filters, setFilters] = useState({ status: '', severity: '', disasterType: '' });
  const [selectedReport, setSelectedReport] = useState(null);
  const [detailsState, setDetailsState] = useState('idle');
  const [detailsError, setDetailsError] = useState('');
  const [statusValue, setStatusValue] = useState('');
  const [statusState, setStatusState] = useState('idle');
  const [statusMessage, setStatusMessage] = useState('');
  const [actions, setActions] = useState([]);
  const [actionsState, setActionsState] = useState('idle');
  const [actionsError, setActionsError] = useState('');
  const [actionForm, setActionForm] = useState(emptyAction);
  const [actionState, setActionState] = useState('idle');
  const [actionMessage, setActionMessage] = useState('');

  const refreshReports = async () => {
    setReportsState('loading');
    setReportsError('');
    try {
      const data = await getReports();
      if (!Array.isArray(data)) throw new Error('The backend returned an unexpected reports format.');
      setReports(data);
      setReportsState('ready');
      return data;
    } catch (error) {
      setReports([]);
      setReportsError(error.message || 'Unable to load disaster reports.');
      setReportsState('error');
      return [];
    }
  };

  useEffect(() => { refreshReports(); }, []);

  const filterOptions = useMemo(() => ({
    statuses: [...new Set(reports.map((report) => report.status).filter(Boolean))],
    severities: [...new Set(reports.map((report) => report.severity).filter(Boolean))],
    disasterTypes: [...new Set(reports.map((report) => report.disaster_type).filter(Boolean))],
  }), [reports]);

  const filteredReports = reports.filter((report) => (
    (!filters.status || report.status === filters.status)
    && (!filters.severity || report.severity === filters.severity)
    && (!filters.disasterType || report.disaster_type === filters.disasterType)
  ));

  const refreshActions = async (reportId) => {
    setActionsState('loading');
    setActionsError('');
    try {
      const data = await getActions();
      if (!Array.isArray(data)) throw new Error('The backend returned an unexpected actions format.');
      setActions(data.filter((action) => action.report_id === reportId));
      setActionsState('ready');
    } catch (error) {
      setActions([]);
      setActionsError(error.message || 'Unable to load associated actions.');
      setActionsState('error');
    }
  };

  const openReport = async (reportId) => {
    setSelectedReport(null);
    setDetailsState('loading');
    setDetailsError('');
    setStatusMessage('');
    setActionMessage('');
    setActions([]);
    try {
      const report = await getReport(reportId);
      setSelectedReport(report);
      setStatusValue(report.status || 'PENDING');
      setActionForm({ ...emptyAction, report_id: report.report_id });
      setDetailsState('ready');
      refreshActions(report.report_id);
    } catch (error) {
      setDetailsError(error.message || 'Unable to load report details.');
      setDetailsState('error');
    }
  };

  const saveStatus = async () => {
    if (!selectedReport) return;
    setStatusState('saving');
    setStatusMessage('');
    try {
      const updated = await updateReport(selectedReport.report_id, { status: statusValue });
      setSelectedReport(updated);
      setReports((current) => current.map((report) => report.report_id === updated.report_id ? updated : report));
      setStatusMessage('Report status updated.');
      setStatusState('success');
      const [freshReport] = await Promise.all([getReport(updated.report_id), refreshReports()]);
      setSelectedReport(freshReport);
      setStatusValue(freshReport.status);
    } catch (error) {
      setStatusMessage(error.message || 'Unable to update report status.');
      setStatusState('error');
    }
  };

  const submitAction = async (event) => {
    event.preventDefault();
    setActionState('saving');
    setActionMessage('');
    try {
      const payload = {
        action_type: actionForm.action_type,
        description: actionForm.description,
        status: actionForm.status,
        ...(actionForm.assigned_resource ? { assigned_resource: actionForm.assigned_resource } : {}),
        ...(actionForm.report_id ? { report_id: actionForm.report_id } : {}),
      };
      await createAction(payload);
      setActionMessage('Response action created.');
      setActionState('success');
      setActionForm({ ...emptyAction, report_id: selectedReport?.report_id || '' });
      if (selectedReport) refreshActions(selectedReport.report_id);
    } catch (error) {
      setActionMessage(error.message || 'Unable to create the response action.');
      setActionState('error');
    }
  };

  return <section className="reports-page">
    <div className="page-heading"><div><p className="eyebrow">Government response</p><h2>Disaster Reports</h2><p>Review incoming incidents, update verification status, and coordinate response actions.</p></div></div>
    <section className="reports-workspace">
      <div className="reports-list-panel">
        <div className="filter-row" aria-label="Report filters">
          <label>Status<select value={filters.status} onChange={(event) => setFilters((current) => ({ ...current, status: event.target.value }))}><option value="">All statuses</option>{filterOptions.statuses.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Severity<select value={filters.severity} onChange={(event) => setFilters((current) => ({ ...current, severity: event.target.value }))}><option value="">All severities</option>{filterOptions.severities.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
          <label>Disaster type<select value={filters.disasterType} onChange={(event) => setFilters((current) => ({ ...current, disasterType: event.target.value }))}><option value="">All types</option>{filterOptions.disasterTypes.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        </div>
        {reportsState === 'loading' && <p className="section-message">Loading disaster reports…</p>}
        {reportsState === 'error' && <p className="section-message error">{reportsError}</p>}
        {reportsState === 'ready' && reports.length === 0 && <p className="section-message">No disaster reports have been submitted.</p>}
        {reportsState === 'ready' && reports.length > 0 && filteredReports.length === 0 && <p className="section-message">No reports match the selected filters.</p>}
        {reportsState === 'ready' && filteredReports.length > 0 && <div className="data-table-wrap"><table><thead><tr><th>Disaster type</th><th>Severity</th><th>Description</th><th>Coordinates</th><th>Status</th><th>Created</th><th>Action</th></tr></thead><tbody>{filteredReports.map((report) => <tr key={report.report_id}><td>{report.disaster_type}</td><td><span className="tag">{report.severity}</span></td><td className="report-description">{report.description}</td><td>{coordinates(report)}</td><td><span className="tag status">{report.status}</span></td><td>{displayDate(report.created_at)}</td><td><button className="table-action" type="button" onClick={() => openReport(report.report_id)}>View details</button></td></tr>)}</tbody></table></div>}
      </div>
      <aside className="report-detail-panel" aria-live="polite">
        {detailsState === 'idle' && <p className="section-message">Select a report to review its details and response actions.</p>}
        {detailsState === 'loading' && <p className="section-message">Loading report details…</p>}
        {detailsState === 'error' && <p className="section-message error">{detailsError}</p>}
        {detailsState === 'ready' && selectedReport && <>
          <div className="detail-heading"><p className="eyebrow">Report details</p><h2>{selectedReport.disaster_type}</h2><span className="tag status">{selectedReport.status}</span></div>
          <dl className="detail-list"><div><dt>Report ID</dt><dd>{selectedReport.report_id}</dd></div><div><dt>Severity</dt><dd>{selectedReport.severity}</dd></div><div><dt>Description</dt><dd>{selectedReport.description}</dd></div><div><dt>Latitude</dt><dd>{selectedReport.latitude}</dd></div><div><dt>Longitude</dt><dd>{selectedReport.longitude}</dd></div><div><dt>Created</dt><dd>{displayDate(selectedReport.created_at)}</dd></div><div><dt>Updated</dt><dd>{displayDate(selectedReport.updated_at)}</dd></div><div><dt>Submitted by</dt><dd>{selectedReport.user_id}</dd></div></dl>
          <div className="status-editor"><h3>Update report status</h3><label htmlFor="report-status">Status</label><select id="report-status" value={statusValue} onChange={(event) => setStatusValue(event.target.value)}>{REPORT_STATUSES.map((status) => <option key={status} value={status}>{status}</option>)}</select><button className="primary-action" type="button" onClick={saveStatus} disabled={statusState === 'saving'}>{statusState === 'saving' ? 'Updating…' : 'Save status'}</button>{statusMessage && <p className={`inline-message ${statusState === 'error' ? 'error' : ''}`}>{statusMessage}</p>}</div>
          <div className="report-actions"><h3>Response actions</h3>{actionsState === 'loading' && <p className="section-message">Loading associated actions…</p>}{actionsState === 'error' && <p className="section-message error">{actionsError}</p>}{actionsState === 'ready' && actions.length === 0 && <p className="section-message">No response actions are associated with this report.</p>}{actionsState === 'ready' && actions.map((action) => <article className="associated-action" key={action.action_id}><strong>{action.action_type}</strong><span className="tag status">{action.status}</span><p>{action.description}</p>{action.assigned_resource && <small>Assigned resource: {action.assigned_resource}</small>}</article>)}</div>
          <form className="action-form" onSubmit={submitAction}><h3>Create Response Action</h3><label htmlFor="action-type">Action type</label><input id="action-type" value={actionForm.action_type} onChange={(event) => setActionForm((current) => ({ ...current, action_type: event.target.value }))} required /><label htmlFor="action-description">Description</label><textarea id="action-description" value={actionForm.description} onChange={(event) => setActionForm((current) => ({ ...current, description: event.target.value }))} required /><label htmlFor="action-status">Action status</label><input id="action-status" value={actionForm.status} onChange={(event) => setActionForm((current) => ({ ...current, status: event.target.value }))} required /><label htmlFor="assigned-resource">Assigned resource</label><input id="assigned-resource" value={actionForm.assigned_resource} onChange={(event) => setActionForm((current) => ({ ...current, assigned_resource: event.target.value }))} /><label htmlFor="associated-report">Associated report</label><select id="associated-report" value={actionForm.report_id} onChange={(event) => setActionForm((current) => ({ ...current, report_id: event.target.value }))}><option value="">No associated report</option>{reports.map((report) => <option key={report.report_id} value={report.report_id}>{report.disaster_type} — {report.report_id}</option>)}</select><button className="primary-action" type="submit" disabled={actionState === 'saving'}>{actionState === 'saving' ? 'Creating…' : 'Create response action'}</button>{actionMessage && <p className={`inline-message ${actionState === 'error' ? 'error' : ''}`}>{actionMessage}</p>}</form>
        </>}
      </aside>
    </section>
  </section>;
}

export default ReportsPage;
