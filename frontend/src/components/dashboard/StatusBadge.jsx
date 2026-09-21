const labelByStatus = {
  monitoring: 'Monitoring',
  active: 'Active response',
  stable: 'Stable',
};

export function StatusBadge({ status }) {
  return <span className={`status-badge ${status}`}>{labelByStatus[status] ?? status}</span>;
}

