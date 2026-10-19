
import { apiRequest } from './apiClient';

export function submitGovernmentApplication(details, accessToken) {
  return apiRequest({
    endpoint: '/api/government/applications',
    method: 'POST',
    body: details,
    accessToken,
  });
}

export function getMyGovernmentApplication(accessToken) {
  return apiRequest({
    endpoint: '/api/government/applications/me',
    accessToken,
  });
}

export function getGovernmentApplicationHistory(accessToken) {
  return apiRequest({
    endpoint: '/api/government/applications/me/history',
    accessToken,
  });
}
