import { apiRequest } from './apiClient';
import { getAccessToken } from './authSession';

// Confirmed integration: GET /api/alerts, with no body or query parameters.
export function getPublicAlerts() {
  return apiRequest({ endpoint: '/api/alerts', method: 'GET', accessToken: getAccessToken() });
}

