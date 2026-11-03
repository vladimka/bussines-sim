import { computeDerived, initialState } from './engine.js';

const SAVE_KEY = 'business-sim-save-v1';
const OFFLINE_MIN_SECONDS = 60;
const OFFLINE_MAX_SECONDS = 4 * 3600;
const OFFLINE_EFFICIENCY = 0.5;

/**
 * Загружает сохранение и начисляет офлайн-доход.
 * Возвращает { state, offline }, где offline — отчёт для модального окна или null.
 */
export function loadGame() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return { state: initialState(), offline: null };

    const data = JSON.parse(raw);
    const base = initialState();
    const now = Date.now();

    const state = {
      ...base,
      ...data,
      businesses: data.businesses || {},
      bizUpgrades: data.bizUpgrades || {},
      managers: data.managers || {},
      upgrades: data.upgrades || {},
      achievements: data.achievements || {},
      realEstate: data.realEstate || {},
      luxury: data.luxury || {},
      portfolio: data.portfolio || {},
      market: { ...base.market, ...(data.market || {}) },
      marketHistory: { ...base.marketHistory, ...(data.marketHistory || {}) },
      tempEffects: Array.isArray(data.tempEffects)
        ? data.tempEffects.filter((e) => e.until > now)
        : [],
      event:
        data.event && data.event.expiresAt > now ? data.event : null,
      nextEventAt:
        typeof data.nextEventAt === 'number'
          ? data.nextEventAt
          : now + 60000,
      buyAmount: [1, 10, 100, 'max'].includes(data.buyAmount)
        ? data.buyAmount
        : 1,
      trades: data.trades || 0,
      eventsResolved: data.eventsResolved || 0,
      casesResolved: data.casesResolved || 0,
    };

    const elapsed = Math.max(0, (now - (data.savedAt || now)) / 1000);
    let offline = null;

    if (elapsed >= OFFLINE_MIN_SECONDS) {
      const { incomePerSecond } = computeDerived(state);
      if (incomePerSecond > 0) {
        const seconds = Math.min(elapsed, OFFLINE_MAX_SECONDS);
        const amount = incomePerSecond * seconds * OFFLINE_EFFICIENCY;
        state.money += amount;
        state.totalEarned += amount;
        state.totalEarnedAllTime += amount;
        offline = { seconds: Math.round(elapsed), amount };
      }
    }

    return { state, offline };
  } catch (err) {
    console.warn('Не удалось загрузить сохранение:', err);
    return { state: initialState(), offline: null };
  }
}

export function saveGame(state) {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify({ ...state, savedAt: Date.now() }));
  } catch (err) {
    console.warn('Не удалось сохранить игру:', err);
  }
}

export function clearSave() {
  try {
    localStorage.removeItem(SAVE_KEY);
  } catch {
    /* ignore */
  }
}
