export function SectionPlaceholder({ section }) {
  return (
    <section className="placeholder-section" aria-labelledby="section-title">
      <p className="eyebrow">Public dashboard</p>
      <h1 id="section-title">{section.label}</h1>
      <p>This section is being prepared in the next implementation stage.</p>
    </section>
  );
}

