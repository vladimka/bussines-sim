import { formatMoney } from '../game/format.js';

export default function UpgradeCard({ upgrade, money, owned, onBuy }) {
  const affordable = !owned && money >= upgrade.cost;

  return (
    <article className={owned ? 'row-card upg owned' : 'row-card upg'}>
      <div className="row-icon" aria-hidden="true">
        {upgrade.icon}
      </div>

      <div className="row-info">
        <h3>
          {upgrade.name}
          {owned && <span className="owned-badge">куплено</span>}
        </h3>
        <p className="muted small">{upgrade.desc}</p>
      </div>

      {owned ? (
        <span className="check">✓</span>
      ) : (
        <button className="buy" disabled={!affordable} onClick={onBuy}>
          <span>{affordable ? 'Купить' : 'Не хватает'}</span>
          <strong>{formatMoney(upgrade.cost)}</strong>
        </button>
      )}
    </article>
  );
}
