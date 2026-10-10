const DEFAULT_API_BASE_URL = 'http://localhost:5000/api';

const configuredBaseUrl = import.meta.env.VITE_API_BASE_URL || DEFAULT_API_BASE_URL;
export const API_BASE_URL = configuredBaseUrl.replace(/\/$/, '');

let accessToken = null;
const TOKEN_STORAGE_KEY = 'spider-x.access-token';

if (typeof window !== 'undefined') {
  accessToken = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
}

export class ApiClientError extends Error {
  constructor(message, { code = 'API_REQUEST_FAILED', status, cause } = {}) {
    super(message, { cause });
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
  }
}

export const setAccessToken = (token) => {
  accessToken = token || null;

  if (typeof window !== 'undefined') {
    if (accessToken) window.sessionStorage.setItem(TOKEN_STORAGE_KEY, accessToken);
    else window.sessionStorage.removeItem(TOKEN_STORAGE_KEY);
  }
};

export const getAccessToken = () => {
  if (typeof window !== 'undefined') {
    accessToken = window.sessionStorage.getItem(TOKEN_STORAGE_KEY);
  }

  return accessToken;
};

export const clearAccessToken = () => {
  setAccessToken(null);
};

const parseResponseBody = async (response) => {
  const responseText = await response.text();

  if (!responseText) return null;

  try {
    return JSON.parse(responseText);
  } catch {
    throw new ApiClientError('The backend returned an invalid JSON response.', {
      code: 'INVALID_API_RESPONSE',
      status: response.status,
    });
  }
};

/**
 * Sends a request to the Spider-X backend and returns its `data` payload.
 * The token is deliberately held only in this client module; authentication
 * screens can set or clear it through the exported helpers when implemented.
 */
export const request = async (method, endpoint, body) => {
  const headers = { Accept: 'application/json' };

  const token = getAccessToken();
  if (token) headers.Authorization = `Bearer ${token}`;
  if (body !== undefined) headers['Content-Type'] = 'application/json';

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
      method,
      headers,
      ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
    });
  } catch (cause) {
    throw new ApiClientError('Unable to reach the Spider-X backend. Check that it is running and reachable.', {
      code: 'NETWORK_ERROR',
      cause,
    });
  }

  const payload = await parseResponseBody(response);

  if (!response.ok || !payload?.success) {
    throw new ApiClientError(
      payload?.error?.message || `The backend request failed with status ${response.status}.`,
      {
        code: payload?.error?.code || 'API_REQUEST_FAILED',
        status: response.status,
      },
    );
  }

  return payload.data;
};

// Authentication
export const login = (credentials) => request('POST', '/auth/login', credentials);
export const logout = () => request('POST', '/auth/logout');
export const getCurrentUser = () => request('GET', '/auth/me');

// Reports
export const getReports = () => request('GET', '/reports');
export const getReport = (reportId) => request('GET', `/reports/${reportId}`);
export const updateReport = (reportId, updates) => request('PATCH', `/reports/${reportId}`, updates);

// Government actions
export const getActions = () => request('GET', '/actions');
export const getAction = (actionId) => request('GET', `/actions/${actionId}`);
export const createAction = (action) => request('POST', '/actions', action);
export const updateAction = (actionId, updates) => request('PATCH', `/actions/${actionId}`, updates);

// Resources
export const getResources = () => request('GET', '/resources');
export const createResource = (resource) => request('POST', '/resources', resource);
export const updateResource = (resourceId, updates) => request('PATCH', `/resources/${resourceId}`, updates);

// Spider-X robots and observations
export const getRobots = () => request('GET', '/robots');
export const getRobot = (robotId) => request('GET', `/robots/${robotId}`);
export const createRobot = (robot) => request('POST', '/robots', robot);
export const updateRobot = (robotId, updates) => request('PATCH', `/robots/${robotId}`, updates);
export const deployRobot = (robotId) => request('POST', `/robots/${robotId}/deploy`);
export const stopRobot = (robotId) => request('POST', `/robots/${robotId}/stop`);
export const returnRobot = (robotId) => request('POST', `/robots/${robotId}/return`);
export const getRobotObservations = (robotId) => request('GET', `/robots/${robotId}/observations`);
export const getLatestObservations = () => request('GET', '/observations/latest');

// Alerts
export const getAlerts = () => request('GET', '/alerts');
export const createAlert = (alert) => request('POST', '/alerts', alert);
export const updateAlert = (alertId, updates) => request('PATCH', `/alerts/${alertId}`, updates);

// Notifications
export const getNotifications = () => request('GET', '/notifications');
export const markNotificationRead = (notificationId) => request('PATCH', `/notifications/${notificationId}/read`);

// Rescue centres
export const getRescueCenters = () => request('GET', '/rescue-centers');
export const getRescueCenter = (centerId) => request('GET', `/rescue-centers/${centerId}`);
export const createRescueCenter = (center) => request('POST', '/rescue-centers', center);
export const updateRescueCenter = (centerId, updates) => request('PATCH', `/rescue-centers/${centerId}`, updates);
