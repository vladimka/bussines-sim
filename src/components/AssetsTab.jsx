import { formatMoney } from '../game/format.js';

export default function AssetsTab({ derived, money, onBuyProperty, onBuyLuxury }) {
  const totalStatus = derived.status;
  const statusBonus = Math.round((derived.statusMult - 1) * 100);

  return (
    <>
      <div className="status-banner">
        <div>
          <span className="muted tiny">Статус</span>
          <strong>★ {totalStatus}</strong>
        </div>
        <div>
          <span className="muted tiny">Бонус статуса</span>
          <strong className="gain">+{statusBonus}% к доходу</strong>
        </div>
        <div>
          <span className="muted tiny">Доход с недвижимости</span>
          <strong>+{formatMoney(derived.estateIncome)}/сек</strong>
        </div>
      </div>

      <div className="section-head">
        <h2>🏙️ Недвижимость</h2>
        <span className="muted tiny">
          {derived.estateTotal} объектов · цена растёт на 60% за покупку
        </span>
      </div>

      <div className="list">
        {derived.realEstate.map((p) => {
          const affordable = money >= p.nextCost;
          return (
            <article className={p.units > 0 ? 'row-card owned' : 'row-card'} key={p.id}>
              <div className="row-icon" aria-hidden="true">
                {p.icon}
              </div>

              <div className="row-info">
                <h3>
                  {p.name}
                  {p.units > 0 && <span className="owned-badge">×{p.units}</span>}
                </h3>
                <p className="muted small">
                  {p.units > 0
                    ? `+${formatMoney(p.income)}/сек · статус +${p.status * p.units}`
                    : p.desc}
                </p>
                <p className="tiny muted">
                  {p.units > 0
                    ? `Следующий: ${formatMoney(p.nextCost)} · +${formatMoney(p.income / p.units)}/сек`
                    : `Цена: ${formatMoney(p.cost)} · +${formatMoney(p.income)}/сек`}
                </p>
              </div>

              <button
                className="buy"
                disabled={!affordable}
                onClick={() => onBuyProperty(p.id)}
              >
                <span>{affordable ? 'Купить' : 'Не хватает'}</span>
                <strong>{formatMoney(p.nextCost)}</strong>
              </button>
            </article>
          );
        })}
      </div>

      <div className="section-head">
        <h2>💎 Предметы роскоши</h2>
        <span className="muted tiny">Покупаются один раз · остаются после IPO</span>
      </div>

      <div className="ach-grid luxury-grid">
        {derived.luxury.map((item) => {
          const affordable = money >= item.cost;
          return (
            <div className={item.owned ? 'ach got luxury' : 'ach luxury'} key={item.id}>
              <span className="ach-icon" aria-hidden="true">
                {item.icon}
              </span>
              <div className="luxury-body">
                <strong>{item.name}</strong>
                <p className="tiny muted">{item.desc}</p>
                <p className="tiny">
                  <span className="gain">★ +{item.status} статуса</span>
                  <span className="muted"> · {formatMoney(item.cost)}</span>
                </p>
                <button
                  className="buy luxury-buy"
                  disabled={item.owned || !affordable}
                  onClick={() => onBuyLuxury(item.id)}
                >
                  {item.owned ? 'Куплено ✓' : affordable ? 'Купить' : 'Не хватает'}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
