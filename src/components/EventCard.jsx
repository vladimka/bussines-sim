export default function EventCard({ def, remaining, onChoose }) {
  if (!def) return null;
  const single = def.choices.length === 1;

  return (
    <section className="card event-card">
      <div className="card-head">
        <h2>
          {def.icon} {def.title}
        </h2>
        <span className="event-timer">{remaining} с</span>
      </div>

      <p className="muted small">{def.text}</p>

      <div className="event-choices">
        {def.choices.map((choice) => (
          <button
            key={choice.id}
            className={single ? 'ipo-btn' : 'event-choice'}
            onClick={() => onChoose(choice)}
          >
            <span>{choice.label}</span>
            <small>{choice.note}</small>
          </button>
        ))}
      </div>
    </section>
  );
}
