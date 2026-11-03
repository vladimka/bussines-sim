const SUFFIXES = ['', 'К', 'М', 'Б', 'Т', 'Кв', 'Кн', 'Ск', 'Сп', 'Ок', 'Нн', 'Дц'];

function trim(value) {
  return value.replace(/\.0+$/, '').replace(/(\.\d*?)0+$/, '$1');
}

/** Компактный вывод чисел: 1.23К, 4.5М, 12Б ... */
export function formatNumber(value) {
  if (!Number.isFinite(value)) return '∞';
  const sign = value < 0 ? '−' : '';
  const n = Math.abs(value);
  if (n < 1000) {
    if (n === 0) return '0';
    if (n < 10) return sign + trim(n.toFixed(2));
    if (n < 100) return sign + trim(n.toFixed(1));
    return sign + Math.round(n).toString();
  }
  let tier = Math.min(Math.floor(Math.log10(n) / 3), SUFFIXES.length - 1);
  let scaled = n / Math.pow(1000, tier);
  let decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
  let text = trim(scaled.toFixed(decimals));

  // 999 974 не должно превращаться в «1000К» — поднимаем разряд.
  if (Number(text) >= 1000 && tier < SUFFIXES.length - 1) {
    tier += 1;
    scaled = n / Math.pow(1000, tier);
    decimals = scaled < 10 ? 2 : scaled < 100 ? 1 : 0;
    text = trim(scaled.toFixed(decimals));
  }

  return sign + text + SUFFIXES[tier];
}

export function formatMoney(value) {
  return `${formatNumber(value)} ₽`;
}

export function formatPrice(value) {
  if (!Number.isFinite(value)) return '∞';
  if (Math.abs(value) >= 1000) return formatNumber(value);
  return value.toFixed(2);
}

export function formatDuration(seconds) {
  const total = Math.max(0, Math.floor(seconds));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  if (hours > 0) return `${hours} ч ${minutes} мин`;
  if (minutes > 0) return `${minutes} мин`;
  return `${total} сек`;
}
