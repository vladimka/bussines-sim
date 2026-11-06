import { useState } from 'react';
import { formatMoney } from '../game/format.js';

export default function CasesTab({ lootCases, money, onOpenLoot }) {
  const [lootReward, setLootReward] = useState(null);

  if (!lootCases || lootCases.length === 0) {
    return (
      <div className="empty">
        <span aria-hidden="true">🎁</span>
        <p>Лут-кейсы пока недоступны.</p>
      </div>
    );
  }

  return (
    <div className="list">
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
