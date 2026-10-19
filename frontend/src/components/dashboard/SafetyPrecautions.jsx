export function SafetyPrecautions() {
  const guidance = [
    {
      title: 'Floods',
      tips: [
        'Move to higher ground when flooding threatens.',
        'Never walk or drive through floodwater.',
        'Follow official evacuation instructions.'
      ]
    },
    {
      title: 'Cyclones and strong winds',
      tips: [
        'Stay indoors and away from windows.',
        'Secure loose objects before severe weather arrives.',
        'Follow official weather alerts and shelter guidance.'
      ]
    },
    {
      title: 'Earthquakes',
      tips: [
        'Drop, cover, and hold on during shaking.',
        'Keep away from glass and heavy objects.',
        'After shaking stops, check for hazards and follow official guidance.'
      ]
    }
  ];

  return (
    <section className="feature-page" aria-labelledby="safety-title">
      <p className="eyebrow">Public safety guide</p>
      <h1 id="safety-title">Safety &amp; Precautions</h1>
      <p className="lead">
        Practical steps to help you prepare for common disasters.
        Always follow instructions from local emergency authorities.
      </p>

      <div className="safety-guide-grid">
        {guidance.map((item) => (
          <article className="safety-guide-card" key={item.title}>
            <h2>{item.title}</h2>
            <ul>
              {item.tips.map((tip) => <li key={tip}>{tip}</li>)}
            </ul>
          </article>
        ))}
      </div>

      <p className="safety-guide-note">
        In an immediate emergency in India, call 112 where available.
      </p>
    </section>
  );
}
