export function FormNotice({ result }) {
  if (!result) return null;

  return (
    <div className="form-notice" role="status">
      <strong>{result.message}</strong>
      <span>Reference: {result.reference}. This is a mock submission stored only in your browser session.</span>
    </div>
  );
}

