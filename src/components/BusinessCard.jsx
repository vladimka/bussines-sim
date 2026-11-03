import { costFor, maxAffordable } from '../game/engine.js';
import { formatMoney } from '../game/format.js';

export default function BusinessCard({ biz, money, buyAmount, onBuy, onManage }) {
  const wanted =
    buyAmount === 'max' ? maxAffordable(biz.cost, biz.growth, biz.owned, money) : buyAmount;
  const amount = Math.max(0, wanted);
  const affordable = amount > 0 && costFor(amount, biz.cost, biz.growth, biz.owned) <= money;
  const shownAmount = amount > 0 ? amount : 1;
  const cost = costFor(shownAmount, biz.cost, biz.growth, biz.owned);

  return (
    <article className={biz.owned > 0 ? 'row-card owned' : 'row-card'}>
      <div className="row-icon" aria-hidden="true">
        {biz.icon}
      </div>

      <div className="row-info">
        <h3>
          {biz.name}
          {biz.owned > 0 && <span className="owned-badge">×{biz.owned}</span>}
          {biz.synergy > 0 && (
            <span className="synergy-badge" title="Бонус за точки в этой категории">
              +{Math.round(biz.synergy * 100)}%
            </span>
          )}
        </h3>

        <p className="muted small">
          {biz.owned > 0
            ? `+${formatMoney(biz.income)}/сек · ${formatMoney(biz.unitIncome)} с точки`
            : biz.desc}
        </p>

        <p className="tiny muted card-meta">
          {biz.owned > 0 ? (
            <>
              <span title="Уровень оборудования">⚙️ {biz.tracks[0].level}</span>
              <span title="Уровень персонала">👥 {biz.tracks[1].level}</span>
              <span title="Уровень маркетинга">📣 {biz.tracks[2].level}</span>
              {biz.manager.hired && <span title="Менеджер нанят">👔</span>}
              <span className="next-cost">Следующая: {formatMoney(biz.nextCost)}</span>
            </>
          ) : (
            <>Цена: {formatMoney(biz.cost)}</>
          )}
        </p>
      </div>

      <div className="row-actions">
        <button
          className="gear"
          onClick={onManage}
          title="Управление бизнесом"
          aria-label={`Управление: ${biz.name}`}
        >
          ⚙️
        </button>
        <button className="buy" disabled={!affordable} onClick={onBuy}>
          <span>{amount > 0 ? `Купить ×${amount}` : 'Не хватает'}</span>
          <strong>{formatMoney(cost)}</strong>
        </button>
      </div>
    </article>
  );
}
