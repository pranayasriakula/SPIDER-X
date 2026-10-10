import { ApiRequestError, apiRequest } from './apiClient';

export function registerAccount(details) {
  return apiRequest({ endpoint: '/api/auth/register', method: 'POST', body: details, requiresAuth: false });
}

export async function loginAccount(credentials) {
  const data = await apiRequest({ endpoint: '/api/auth/login', method: 'POST', body: credentials, requiresAuth: false });
  if (!data?.session?.access_token) {
    throw new ApiRequestError({ method: 'POST', endpoint: '/api/auth/login', status: null, code: 'SESSION_MISSING', message: 'The login response did not include an access token.' });
  }
  return data;
}

export async function getCurrentUser(accessToken) {
  const data = await apiRequest({
    endpoint: '/api/auth/me',
    accessToken,
  });

  if (!data?.user || !data?.profile?.role) {
    throw new ApiRequestError({
      method: 'GET',
      endpoint: '/api/auth/me',
      status: null,
      code: 'INVALID_PROFILE',
      message: 'Unable to verify your account profile.',
    });
  }

  return data;
}

export function logoutAccount(accessToken) {
  return apiRequest({ endpoint: '/api/auth/logout', method: 'POST', accessToken });
}
