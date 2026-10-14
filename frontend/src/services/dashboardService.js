import { dashboardSummary, disasterSituations } from '../data/mockDashboardData';

// Deliberately mock-only: no public dashboard API endpoints are defined by the backend yet.
export async function getDashboardOverview() {
  return { source: 'mock', summary: dashboardSummary, situations: disasterSituations };
}

