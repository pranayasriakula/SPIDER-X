import { useEffect, useState } from 'react';
import { getSubmittedItems } from '../../services/publicService';

function statusClass(status) { return status.toLowerCase().replaceAll(' ', '-'); }

export function RequestTracker() {
  const [items, setItems] = useState([]);

  useEffect(() => { getSubmittedItems().then(({ items: result }) => setItems(result)); }, []);

  return (
    <section className="feature-page" aria-labelledby="tracking-title">
      <div className="section-heading">
        <div><p className="eyebrow">My submissions · Mock data</p><h1 id="tracking-title">Track reports and requests</h1></div>
        <span className="demo-label">Not connected to a government system</span>
      </div>
      <p className="lead">Sample statuses show how your emergency reports and assistance requests will appear when public APIs become available.</p>
      <div className="tracker-list">
        {items.map((item) => (
          <article className="tracker-card" key={item.id}>
            <div className="tracker-topline"><span className="item-type">{item.type}</span><span className={`request-status ${statusClass(item.status)}`}>{item.status}</span></div>
            <h2>{item.subject}</h2><p>{item.detail}</p>
            <footer><span>{item.id}</span><span>Submitted {item.createdAt}</span></footer>
          </article>
        ))}
      </div>
    </section>
  );
}
