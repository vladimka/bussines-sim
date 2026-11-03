import { useState } from 'react';
import { formatMoney } from '../game/format.js';

export default function CasesTab({ cases, lootCases, money, onChoose, onOpenLoot }) {
  const [lootReward, setLootReward] = useState(null);

  if (!cases || cases.length === 0) {
    return (
      <div className="empty">
        <span aria-hidden="true">🎭</span>
        <p>Кейсы пока недоступны.</p>
      </div>
    );
  }

  return (
    <div className="list">
      {cases.map((c) => (
        <section className="card event-card" key={c.id}>
          <div className="card-head">
            <h2>
              {c.icon} {c.title}
            </h2>
            <span className="case-tag">{c.tag}</span>
          </div>

          <p className="muted small">{c.text}</p>

          <div className="event-choices">
            {c.choices.map((choice) => {
              const cost = (choice.effects || []).reduce(
                (acc, e) => acc + (e.cost || 0),
                0
              );
              const disabled = cost > 0 && money < cost;
              return (
                <button
                  key={choice.id}
                  className="event-choice"
                  disabled={disabled}
                  onClick={() => onChoose(choice)}
                >
                  <span>{choice.label}</span>
                  <small>{choice.note}</small>
                </button>
              );
            })}
          </div>
        </section>
      ))}

      <div className="section-head">
        <h2>🎁 Кейсы с дропом</h2>
        <span className="muted tiny">Деньги или дорогие предметы и машины</span>
      </div>

      {lootCases.map((l) => (
        <section className="card event-card" key={l.id}>
          <div className="card-head">
            <h2>
              {l.icon} {l.name}
            </h2>
            <span className="case-tag">{formatMoney(l.cost)}</span>
          </div>

          <p className="muted small">{l.desc}</p>

          <div className="event-choices">
            <button
              className="event-choice"
              disabled={money < l.cost}
              onClick={() => setLootReward(onOpenLoot(l.id))}
            >
              <span>Открыть кейс</span>
              <small>{formatMoney(l.cost)} · шанс выпадения машины или предмета</small>
            </button>
          </div>

          {lootReward && lootReward.id === l.id && (
            <p className="tiny" style={{ marginTop: 8 }}>
              {lootReward.type === 'cash'
                ? `Выпадение: ${lootReward.name} (+${formatMoney(lootReward.amount)})`
                : `Выпадение: ${lootReward.name}!`}
            </p>
          )}
        </section>
      ))}
    </div>
  );
}
