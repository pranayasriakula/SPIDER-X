import { StatusBadge } from './StatusBadge';

export function SituationCard({ situation }) {
  return (
    <article className="situation-card">
      <div className="card-heading">
        <p className="card-kicker">{situation.category}</p>
        <StatusBadge status={situation.status} />
      </div>
      <h3>{situation.title}</h3>
      <p>{situation.summary}</p>
      <dl className="situation-meta">
        <div>
          <dt>Area</dt>
          <dd>{situation.area}</dd>
        </div>
        <div>
          <dt>Updated</dt>
          <dd>{situation.updatedAt}</dd>
        </div>
      </dl>
    </article>
  );
}

