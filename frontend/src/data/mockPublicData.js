// Temporary sample data for the public UI. It is intentionally independent from the backend alerts module.
export const submittedItems = [
  { id: 'REP-184210', type: 'Emergency report', subject: 'Waterlogged road near Central Market', createdAt: 'Today, 9:15 AM', status: 'Under review', detail: 'Your report has been sent to the response team.' },
  { id: 'HELP-183924', type: 'Assistance request', subject: 'Food and water support', createdAt: 'Yesterday, 4:40 PM', status: 'Assigned', detail: 'A local response unit has been assigned.' },
  { id: 'REP-183802', type: 'Emergency report', subject: 'Damaged streetlight on Riverside Road', createdAt: 'Sep 18, 10:10 AM', status: 'Resolved', detail: 'The relevant authority marked this item as resolved.' },
];

export const publicAlerts = [
  { id: 'alert-1', level: 'Advisory', title: 'Heavy rain expected this evening', message: 'Keep clear of low-lying roads and monitor local weather guidance.', issuedBy: 'Sample disaster-management office', updatedAt: '30 minutes ago' },
  { id: 'alert-2', level: 'Announcement', title: 'Community shelter open for residents', message: 'The sample community shelter is open. Bring essential medicines and identification if available.', issuedBy: 'Sample district administration', updatedAt: '2 hours ago' },
  { id: 'alert-3', level: 'Safety update', title: 'Avoid fallen electrical lines', message: 'Keep a safe distance and report damaged electrical infrastructure through official channels.', issuedBy: 'Sample emergency coordination centre', updatedAt: 'Today, 8:00 AM' },
];

export const mockProfile = { name: 'Aarav Citizen', phone: '+91 90000 00000', area: 'Sample ward — Central district', emergencyContact: 'Emergency contact not added' };
