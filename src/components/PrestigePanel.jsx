import { formatMoney, formatNumber } from '../game/format.js';

export default function PrestigePanel({ state, derived, confirm, onPrestige }) {
  const gain = derived.prestigeGain;
  const prevNeed = Math.pow(gain, 2) * 1e6;
  const nextNeed = Math.pow(gain + 1, 2) * 1e6;
  const progress = Math.min(
    1,
    Math.max(0, (state.totalEarned - prevNeed) / (nextNeed - prevNeed))
  );

  return (
    <section className="card prestige">
      <div className="card-head">
        <h2>🚀 Публичное размещение</h2>
        <span className="rep-pill">⭐ {state.reputation}</span>
      </div>

      <p className="muted small">
        Репутация навсегда даёт +{formatNumber(state.reputation * 10)}% к доходу. IPO
        обнуляет деньги, бизнесы, прокачку, недвижимость и портфель — но не репутацию,
        достижения и купленный люкс.
      </p>

      <div className="bar" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(progress * 100)}>
        <i style={{ width: `${progress * 100}%` }} />
      </div>

      <div className="prestige-row">
        <div>
          <span className="muted tiny">Награда</span>
          <strong className={gain > 0 ? 'gain' : 'muted'}>+{gain} реп.</strong>
        </div>
        <div className="align-right">
          <span className="muted tiny">До следующей</span>
          <strong>{formatMoney(Math.max(0, nextNeed - state.totalEarned))}</strong>
        </div>
      </div>

      <button className="ipo-btn" disabled={gain < 1} onClick={onPrestige}>
        {gain < 1
          ? `Нужно ${formatMoney(1e6)} за этот забег`
          : confirm
            ? 'Точно? Нажми ещё раз'
            : 'Выйти на IPO'}
      </button>

      {state.ipos > 0 && (
        <p className="tiny muted center">IPO проведено: {state.ipos}</p>
      )}
    </section>
  );
}
