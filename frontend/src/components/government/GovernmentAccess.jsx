
import { useCallback, useEffect, useRef, useState } from 'react';
import { getAccessToken } from '../../services/authSession';
import {
  getMyGovernmentApplication,
  getGovernmentApplicationHistory,
  submitGovernmentApplication,
} from '../../services/governmentAccessService';

const initialForm = {
  department: '',
  designation: '',
  official_email: '',
  employee_id: '',
};

const statusLabels = {
  PENDING: 'Pending',
  APPROVED: 'Approved',
  REJECTED: 'Rejected',
  REVOKED: 'Revoked',
};

function formatDate(value) {
  if (!value) return 'Not available';

  const date = new Date(value);

  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString();
}

function getErrorMessage(error) {
  const messages = {
    VALIDATION_ERROR: error.message,
    AUTHENTICATION_REQUIRED: 'Please sign in again to continue.',
    INVALID_TOKEN: 'Your session has expired. Please sign in again.',
    PROFILE_NOT_FOUND: 'Your account profile could not be found.',
    FORBIDDEN: 'Your account is not currently eligible for this action.',
    ACTIVE_APPLICATION_EXISTS:
      'An application is already pending or approved. Your status has been refreshed.',
    INVALID_APPLICATION_STATE:
      'The application state has changed. Refresh the page and try again.',
    DATABASE_ERROR:
      'The service could not save your application. Please try again later.',
    SUPABASE_NOT_CONFIGURED:
      'The application service is temporarily unavailable.',
    NETWORK_ERROR:
      'Cannot reach the service. Check your connection and try again.',
  };

  return (
    messages[error?.code] ||
    error?.message ||
    'Something went wrong. Please try again.'
  );
}

function StatusBadge({ status }) {
  const label = statusLabels[status] || status || 'Unknown';

  return (
    <span
      className={`government-status status-${String(
        status || 'unknown'
      ).toLowerCase()}`}
    >
      {label}
    </span>
  );
}

export function GovernmentAccess({
  auth,
  onAuthRefresh,
  onOpenAccount,
}) {
  const [application, setApplication] = useState(null);
  const [history, setHistory] = useState([]);
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const applicationStatusRef = useRef(null);

  const role = auth.profile?.role;
  const accessToken = getAccessToken();

  const loadApplications = useCallback(
    async ({ refreshRole = false } = {}) => {
      if (!accessToken) {
        applicationStatusRef.current = null;
        setApplication(null);
        setHistory([]);
        setLoading(false);
        return;
      }

      setError('');

      try {
        const [current, records] = await Promise.all([
          getMyGovernmentApplication(accessToken),
          getGovernmentApplicationHistory(accessToken),
        ]);

        const nextApplication = current ?? null;
        const nextHistory = Array.isArray(records) ? records : [];

        const nextStatus = nextApplication?.status ?? null;
        const statusChanged =
          applicationStatusRef.current !== nextStatus;

        applicationStatusRef.current = nextStatus;

        setApplication(nextApplication);
        setHistory(nextHistory);

        if (refreshRole || statusChanged) {
          await onAuthRefresh?.();
        }
      } catch (requestError) {
        setError(getErrorMessage(requestError));

        if (
          requestError.status === 403 ||
          requestError.code === 'FORBIDDEN' ||
          requestError.code === 'PROFILE_NOT_FOUND'
        ) {
          try {
            await onAuthRefresh?.();
          } catch {
            // Keep the original application error visible.
          }
        }
      } finally {
        setLoading(false);
      }
    },
    [accessToken, onAuthRefresh]
  );

  useEffect(() => {
    loadApplications({ refreshRole: true });
  }, [loadApplications]);

  useEffect(() => {
    function handleWindowFocus() {
      loadApplications({ refreshRole: true });
    }

    window.addEventListener('focus', handleWindowFocus);

    return () => {
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [loadApplications]);

  const canApply =
    role === 'PUBLIC' &&
    (!application ||
      application.status === 'REJECTED' ||
      application.status === 'REVOKED');

  function handleChange(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setNotice('');

    if (submitting) return;

    if (!accessToken) {
      setError('Please sign in before submitting an application.');
      return;
    }

    if (role !== 'PUBLIC') {
      setError(
        'Only public accounts can submit a government access application.'
      );
      return;
    }

    const details = {
      department: form.department.trim(),
      designation: form.designation.trim(),
      official_email: form.official_email.trim().toLowerCase(),
      employee_id: form.employee_id.trim(),
    };

    const validEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(
      details.official_email
    );

    const containsNullCharacter = Object.values(details).some(
      (value) => value.includes('\u0000')
    );

    if (
      !details.department ||
      details.department.length > 200 ||
      !details.designation ||
      details.designation.length > 200 ||
      !details.official_email ||
      details.official_email.length > 254 ||
      !validEmail ||
      !details.employee_id ||
      details.employee_id.length > 100 ||
      containsNullCharacter
    ) {
      setError(
        'Check all four fields. Department and designation must be 1–200 characters, email must be valid and at most 254 characters, and employee ID must be 1–100 characters.'
      );
      return;
    }

    setSubmitting(true);

    try {
      await submitGovernmentApplication(details, accessToken);

      setForm({ ...initialForm });
      setNotice('Your application was submitted successfully.');

      await loadApplications({ refreshRole: true });
    } catch (submitError) {
      setError(getErrorMessage(submitError));

      if (
        submitError.status === 409 ||
        submitError.code === 'ACTIVE_APPLICATION_EXISTS' ||
        submitError.status === 403
      ) {
        await loadApplications({ refreshRole: true });
      }
    } finally {
      setSubmitting(false);
    }
  }

  if (auth.loading || loading) {
    return (
      <p className="loading-message">
        Loading government access information...
      </p>
    );
  }

  if (!auth.profile) {
    return (
      <section className="form-page">
        <p className="eyebrow">RAKSHAK ACCOUNT</p>
        <h1>Government Access</h1>

        <div className="api-state">
          <strong>Sign in to continue.</strong>
          <p>
            You must have an account to view or submit an application.
          </p>

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

  return (
    <section
      className="form-page"
      aria-labelledby="government-access-title"
    >
      <p className="eyebrow">RAKSHAK ACCOUNT</p>
      <h1 id="government-access-title">Government Access</h1>

      <p className="lead">
        Apply for government authority access and track your application here.
      </p>

      {error && (
        <div className="api-state" role="alert">
          <strong>Unable to complete the request</strong>
          <p>{error}</p>
        </div>
      )}

      {notice && (
        <div className="api-state" role="status">
          <strong>{notice}</strong>
        </div>
      )}

      <div className="profile-details">
        <article className="profile-detail-card">
          <span className="profile-detail-label">
            Current account role
          </span>
          <strong className="profile-detail-value">
            {role || 'Unknown'}
          </strong>
        </article>

        <article className="profile-detail-card">
          <span className="profile-detail-label">
            Latest application status
          </span>
          <strong className="profile-detail-value">
            {application ? (
              <StatusBadge status={application.status} />
            ) : (
              'No application'
            )}
          </strong>
        </article>
      </div>

      {application && (
        <div className="api-state">
          <h2>Latest application</h2>
          <p>
            <strong>Department:</strong> {application.department}
          </p>
          <p>
            <strong>Designation:</strong> {application.designation}
          </p>
          <p>
            <strong>Official email:</strong>{' '}
            {application.official_email}
          </p>
          <p>
            <strong>Employee ID:</strong> {application.employee_id}
          </p>
          <p>
            <strong>Submitted:</strong>{' '}
            {formatDate(application.created_at)}
          </p>
          <p>
            <strong>Last updated:</strong>{' '}
            {formatDate(application.updated_at)}
          </p>

          {application.reviewed_at && (
            <p>
              <strong>Reviewed:</strong>{' '}
              {formatDate(application.reviewed_at)}
            </p>
          )}

          {application.rejection_reason && (
            <p>
              <strong>Decision reason:</strong>{' '}
              {application.rejection_reason}
            </p>
          )}
        </div>
      )}

      {canApply && (
        <form className="application-form" onSubmit={handleSubmit}>
          <h2>
            {application
              ? 'Submit a new application'
              : 'Apply for government access'}
          </h2>

          <p className="field-help">
            Enter the details associated with your government position.
          </p>

          <label className="form-field">
            <span>Department</span>
            <input
              name="department"
              value={form.department}
              onChange={handleChange}
              maxLength={200}
              required
              autoComplete="organization"
              placeholder="e.g. Disaster Management"
            />
          </label>

          <label className="form-field">
            <span>Designation</span>
            <input
              name="designation"
              value={form.designation}
              onChange={handleChange}
              maxLength={200}
              required
              placeholder="e.g. District Officer"
            />
          </label>

          <label className="form-field">
            <span>Official email</span>
            <input
              name="official_email"
              type="email"
              value={form.official_email}
              onChange={handleChange}
              maxLength={254}
              required
              autoComplete="email"
              placeholder="officer@example.gov"
            />
          </label>

          <label className="form-field">
            <span>Employee ID</span>
            <input
              name="employee_id"
              value={form.employee_id}
              onChange={handleChange}
              maxLength={100}
              required
              placeholder="Enter your employee ID"
            />
          </label>

          <button
            className="primary-button"
            type="submit"
            disabled={submitting}
          >
            {submitting ? 'Submitting...' : 'Submit application'}
          </button>
        </form>
      )}

      {role !== 'PUBLIC' && (
        <div className="api-state">
          <p>
            Your current role does not permit a new application. Your
            application history remains available below.
          </p>
        </div>
      )}

      <section
        className="government-history"
        aria-labelledby="government-history-title"
      >
        <h2 id="government-history-title">Application history</h2>

        {history.length === 0 ? (
          <p className="field-help">
            No previous applications found.
          </p>
        ) : (
          <div className="government-history-list">
            {history.map((record, index) => (
              <article
                className="profile-detail-card government-history-card"
                key={
                  record.application_id ??
                  `${record.created_at}-${record.department}-${index}`
                }
              >
                <div className="government-history-heading">
                  <strong>{record.department}</strong>
                  <StatusBadge status={record.status} />
                </div>

                <p>{record.designation}</p>

                <p className="field-help">
                  Submitted: {formatDate(record.created_at)}
                </p>

                {record.reviewed_at && (
                  <p className="field-help">
                    Reviewed: {formatDate(record.reviewed_at)}
                  </p>
                )}

                {record.rejection_reason && (
                  <p>
                    <strong>Decision reason:</strong>{' '}
                    {record.rejection_reason}
                  </p>
                )}
              </article>
            ))}
          </div>
        )}
      </section>

      <button
        className="text-button"
        type="button"
        onClick={() => loadApplications({ refreshRole: true })}
      >
        Refresh application status
      </button>
    </section>
  );
}
