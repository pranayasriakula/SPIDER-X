// Temporary display data. Replace through services/dashboardService.js once public APIs exist.
export const dashboardSummary = [
  { icon: '!', value: '2', label: 'Active situations', detail: 'in the sample area' },
  { icon: '✓', value: '6', label: 'Shelters available', detail: 'capacity updates pending' },
  { icon: '↗', value: '24', label: 'Reports received', detail: 'sample data only' },
];

export const disasterSituations = [
  {
    id: 'situation-1',
    category: 'Heavy rainfall',
    status: 'monitoring',
    title: 'Waterlogging reported in low-lying areas',
    summary: 'Avoid waterlogged roads where possible and follow local authority guidance.',
    area: 'Sample ward — Central district',
    updatedAt: '30 minutes ago',
  },
  {
    id: 'situation-2',
    category: 'Severe weather',
    status: 'active',
    title: 'High-wind advisory remains in effect',
    summary: 'Secure loose outdoor items and avoid standing near trees or damaged power lines.',
    area: 'Sample ward — Riverside district',
    updatedAt: '1 hour ago',
  },
  {
    id: 'situation-3',
    category: 'Road safety',
    status: 'stable',
    title: 'Main evacuation route is clear',
    summary: 'The designated route is open. Continue to use it only if directed by authorities.',
    area: 'Sample ward — North district',
    updatedAt: '2 hours ago',
  },
];

export const safetyActions = [
  'Keep phones charged and carry a backup light source.',
  'Share your location only with trusted emergency contacts.',
  'Do not enter floodwater or touch fallen power lines.',
];

