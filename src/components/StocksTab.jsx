import { formatMoney, formatNumber, formatPrice } from '../game/format.js';

function Sparkline({ data, up }) {
  const values = data && data.length > 1 ? data : [data?.[0] ?? 1, data?.[0] ?? 1];
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const points = values
    .map((value, i) => {
      const x = (i / (values.length - 1)) * 100;
      const y = 22 - ((value - min) / span) * 20;
      return `${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');

  return (
    <svg className="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
      <polyline
        points={points}
        fill="none"
        stroke={up ? '#4ade80' : '#ff7a8a'}
        strokeWidth="1.6"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}

export default function StocksTab({ derived, money, fraction, onBuy, onSell }) {
  const pnl = derived.stocksValue - derived.stocksCost;
  const percent = Math.round(fraction * 100);

  return (
    <>
      <div className="status-banner">
        <div>
          <span className="muted tiny">Портфель</span>
          <strong>{formatMoney(derived.stocksValue)}</strong>
        </div>
        <div>
          <span className="muted tiny">Вложено</span>
          <strong>{formatMoney(derived.stocksCost)}</strong>
        </div>
        <div>
          <span className="muted tiny">Прибыль</span>
          <strong className={pnl >= 0 ? 'gain' : 'loss'}>
            {pnl >= 0 ? '+' : ''}
            {formatMoney(pnl)}
          </strong>
        </div>
        <div>
          <span className="muted tiny">Дивиденды</span>
          <strong className="gain">+{formatMoney(derived.stocksIncome)}/сек</strong>
        </div>
      </div>

      <p className="tiny muted stocks-note">
        Сделка: {percent}% баланса при покупке и {percent}% позиции при продаже.
        Дивиденды капают со стоимости портфеля — около 0.6% в минуту.
      </p>

      <div className="list">
        {derived.portfolio.map((stock) => {
          const prev = stock.history[stock.history.length - 2] ?? stock.price;
          const change = (stock.price / prev - 1) * 100;
          const up = change >= 0;
          const buySum = money * fraction;
          const sellSum = stock.value * fraction;

          return (
            <article className="stock-row" key={stock.id}>
              <div className="row-icon" aria-hidden="true">
                {stock.icon}
              </div>

              <div className="stock-main">
                <div className="stock-top">
                  <h3>
                    {stock.name} <span className="ticker">{stock.ticker}</span>
                  </h3>
                  <span className={up ? 'price up' : 'price down'}>
                    {formatPrice(stock.price)} ₽
                    <b>
                      {up ? '+' : ''}
                      {change.toFixed(2)}%
                    </b>
                  </span>
                </div>

                <div className="stock-bottom">
                  <Sparkline data={stock.history} up={up} />
                  <span className="tiny muted stock-holdings">
                    {stock.shares > 0
                      ? `${formatNumber(stock.shares)} шт · ${formatMoney(stock.value)} · ${
                          stock.pnl >= 0 ? '+' : ''
                        }${formatMoney(stock.pnl)}`
                      : 'Нет в портфеле'}
                  </span>
                </div>
              </div>

              <div className="stock-actions">
                <button className="buy" disabled={buySum < 1} onClick={() => onBuy(stock.id)}>
                  <span>Купить</span>
                  <strong>{formatMoney(buySum)}</strong>
                </button>
                <button
                  className="sell"
                  disabled={stock.shares <= 0}
                  onClick={() => onSell(stock.id)}
                >
                  <span>Продать</span>
                  <strong>{formatMoney(sellSum)}</strong>
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </>
  );
}
