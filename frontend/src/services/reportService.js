// Temporary client-side adapter. No matching backend endpoint exists yet.
export async function submitEmergencyReport(report) {
  console.info('Mock emergency report submitted', report);
  return { source: 'mock', reference: `REP-${Date.now().toString().slice(-6)}`, message: 'Your emergency report has been recorded.' };
}

