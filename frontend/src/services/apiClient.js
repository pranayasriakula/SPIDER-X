const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000').replace(/\/$/, '');

export class ApiRequestError extends Error {
  constructor({ method, endpoint, status, code, message }) {
    super(message);
    this.method = method;
    this.endpoint = endpoint;
    this.status = status;
    this.code = code;
  }
}

export async function apiRequest({ endpoint, method = 'GET', accessToken, body, requiresAuth = true }) {
  if (requiresAuth && !accessToken) {
    throw new ApiRequestError({ method, endpoint, status: null, code: 'AUTH_REQUIRED', message: 'Sign in is required to access this protected service.' });
  }

  let response;
  try {
    response = await fetch(`${API_BASE_URL}${endpoint}`, {
  method,
  headers: {
    'Content-Type': 'application/json',
    ...(requiresAuth ? { Authorization: `Bearer ${accessToken}` } : {}),
  },
  ...(body ? { body: JSON.stringify(body) } : {}),
});
  } catch {
    throw new ApiRequestError({ method, endpoint, status: null, code: 'NETWORK_ERROR', message: 'Unable to reach the Spider-X service. Check that it is running and try again.' });
  }

  let payload = null;
  try { payload = await response.json(); } catch { /* The API contract requires JSON. */ }

  if (!response.ok || !payload?.success) {
    throw new ApiRequestError({
      method,
      endpoint,
      status: response.status,
      code: payload?.error?.code || 'REQUEST_FAILED',
      message: payload?.error?.message || 'The service could not complete this request.',
    });
  }

  return payload.data;
}
