import { formatMoney, formatNumber } from '../game/format.js';

export default function Clicker({ clickPower, onDeal, pops }) {
  return (
    <section className="card clicker">
      <div className="card-head">
        <h2>Ручное управление</h2>
        <span className="muted small">+{formatMoney(clickPower)} за сделку</span>
      </div>

      <div className="clicker-body">
        <button className="deal-btn" onClick={onDeal} aria-label="Заключить сделку">
          <span className="deal-icon" aria-hidden="true">
            🤝
          </span>
          <span className="deal-label">Заключить сделку</span>
        </button>

        <div className="pops" aria-hidden="true">
          {pops.map((p) => (
            <span key={p.id} className="pop" style={{ '--dx': `${p.offset}px` }}>
              +{formatNumber(clickPower)}
            </span>
          ))}
        </div>
      </div>

      <p className="hint">
        Жми кнопку или <kbd>Пробел</kbd>
      </p>
    </section>
  );
}
