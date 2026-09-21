import { apiRequest } from './apiClient';
import { getAccessToken } from './authSession';

export function submitEmergencyReport(report) {
  return apiRequest({
    endpoint: '/api/reports',
    method: 'POST',
    accessToken: getAccessToken(),
    body: {
      disaster_type: report.disasterType,
      severity: report.severity,
      description: report.description,
      latitude: Number(report.latitude),
      longitude: Number(report.longitude),
    },
  });
}

export function getMyReports() {
  return apiRequest({ endpoint: '/api/reports/my', accessToken: getAccessToken() });
}
