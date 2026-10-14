export function FormNotice({ result }) {
  if (!result) return null;

  return (
    <div className="form-notice" role="status">
      <strong>{result.message}</strong>
      <span>{result.source === 'mock' ? 'This request is stored only in the local mock workflow.' : `Reference: ${result.reference}.`}</span>
    </div>
  );
}
