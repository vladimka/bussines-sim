import { formatMoney } from '../game/format.js';

export default function BusinessModal({
  biz,
  money,
  onClose,
  onUpgradeTrack,
  onHireManager,
}) {
  if (!biz) return null;

  return (
    <div className="overlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal biz-modal" onClick={(e) => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose} aria-label="Закрыть">
          ✕
        </button>

        <div className="biz-modal-head">
          <div className="row-icon xl" aria-hidden="true">
            {biz.icon}
          </div>
          <div>
            <h2>{biz.name}</h2>
            <p className="muted small">
              {biz.categoryMeta.icon} {biz.categoryMeta.name} · {biz.owned} точек
            </p>
          </div>
        </div>

        <div className="biz-stats">
          <div>
            <span className="muted tiny">Доход точки</span>
            <strong>+{formatMoney(biz.unitIncome)}/сек</strong>
          </div>
          <div>
            <span className="muted tiny">Всего</span>
            <strong>+{formatMoney(biz.income)}/сек</strong>
          </div>
          <div>
            <span className="muted tiny">Синергия</span>
            <strong className={biz.synergy > 0 ? 'gain' : 'muted'}>
              +{Math.round(biz.synergy * 100)}%
            </strong>
          </div>
        </div>

        {biz.owned === 0 && (
          <p className="hint-box">Сначала купите хотя бы одну точку этого бизнеса.</p>
        )}

        <div className="tracks">
          {biz.tracks.map((track) => {
            const disabled = biz.owned < 1 || money < track.cost;
            return (
              <div className="track" key={track.id}>
                <div className="track-icon" aria-hidden="true">
                  {track.icon}
                </div>

                <div className="track-info">
                  <h4>
                    {track.name} <span className="lvl">ур. {track.level}</span>
                  </h4>
                  <p className="muted tiny">{track.hint}</p>
                  <p className="tiny">
                    <span className={track.bonus > 0 ? 'gain' : 'muted'}>
                      +{Math.round(track.bonus * 100)}%
                    </span>
                    <span className="muted">
                      {' '}
                      → +{Math.round(track.nextBonus * 100)}%
                    </span>
                  </p>
                </div>

                <button
                  className="buy track-buy"
                  disabled={disabled}
                  onClick={() => onUpgradeTrack(track.id)}
                >
                  <span>Улучшить</span>
                  <strong>{formatMoney(track.cost)}</strong>
                </button>
              </div>
            );
          })}

          <div className="track manager">
            <div className="track-icon" aria-hidden="true">
              👔
            </div>

            <div className="track-info">
              <h4>
                Менеджер: {biz.manager.name}{' '}
                {biz.manager.count > 1 && <span className="lvl">×{biz.manager.count}</span>}
              </h4>
              <p className="muted tiny">
                +{Math.round((biz.manager.bonus * biz.manager.count) * 100)}% к доходу всех точек этого
                бизнеса
              </p>
              <p className="tiny">
                {biz.manager.count > 0 ? (
                  <span className="gain">
                    В команде: {biz.manager.count}
                    {biz.manager.count >= 3 ? ' (лимит)' : ''}
                  </span>
                ) : (
                  <span className="muted">Нанимается один раз и навсегда</span>
                )}
              </p>
            </div>

            {biz.manager.count > 0 ? (
              <span className="check" aria-label="Нанят">
                ✓
              </span>
            ) : (
              <button
                className="buy track-buy"
                disabled={biz.owned < 1 || money < biz.manager.cost}
                onClick={onHireManager}
              >
                <span>Нанять</span>
                <strong>{formatMoney(biz.manager.cost)}</strong>
              </button>
            )}
          </div>
        </div>

        <p className="tiny muted center">
          Прокачка и менеджер действуют на все {biz.owned} точек этого бизнеса
        </p>
      </div>
    </div>
  );
}
