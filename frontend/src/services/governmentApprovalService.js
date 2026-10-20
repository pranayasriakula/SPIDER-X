import { apiRequest } from './apiClient';
import { getAccessToken } from './authSession';

const base = '/api/admin/government-applications';
const request = (endpoint, options = {}) => apiRequest({ endpoint, accessToken: getAccessToken(), ...options });

export function listApplications({ status = '', limit = 20, offset = 0 } = {}) {
  const query = new URLSearchParams({ limit: String(limit), offset: String(offset) });
  if (status) query.set('status', status);
  return request(`${base}?${query}`);
}
export const getApplication = (id) => request(`${base}/${encodeURIComponent(id)}`);
export const getApplicationAudit = (id) => request(`${base}/${encodeURIComponent(id)}/audit`);
export function decideApplication(id, action, reason) {
  if (!['approve', 'reject', 'revoke'].includes(action)) throw new Error('Invalid approval action');
  return request(`${base}/${encodeURIComponent(id)}/${action}`, {
    method: 'POST',
    ...(action === 'approve' ? {} : { body: { reason: reason.trim() } }),
  });
}
