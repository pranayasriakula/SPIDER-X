import { mockProfile, publicAlerts, submittedItems } from '../data/mockPublicData';

// Temporary mock adapter. The backend currently has no public data endpoints.
export async function getSubmittedItems() { return { source: 'mock', items: submittedItems }; }
export async function getPublicAlerts() { return { source: 'mock', alerts: publicAlerts }; }
export async function getPublicProfile() { return { source: 'mock', profile: mockProfile }; }
export async function savePublicProfile(profile) {
  console.info('Mock public profile saved', profile);
  return { source: 'mock', profile };
}
