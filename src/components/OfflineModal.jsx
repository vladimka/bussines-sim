import { formatDuration, formatMoney } from '../game/format.js';

export default function OfflineModal({ report, onClose }) {
  if (!report) return null;

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-icon" aria-hidden="true">
          🌙
        </div>
        <h2>Пока вас не было</h2>
        <p className="muted small">
          Вы отсутствовали {formatDuration(report.seconds)}. Бизнесы работали сами
          и принесли 50% дохода:
        </p>
        <div className="modal-amount">+{formatMoney(report.amount)}</div>
        <button className="ipo-btn" onClick={onClose}>
          Продолжить
        </button>
      </div>
    </div>
  );
}
