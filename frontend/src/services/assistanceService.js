// Temporary client-side adapter. No matching backend endpoint exists yet.
export async function submitAssistanceRequest(request) {
  console.info('Mock assistance request submitted', request);
  return { source: 'mock', reference: `HELP-${Date.now().toString().slice(-6)}`, message: 'Your assistance request has been recorded.' };
}
