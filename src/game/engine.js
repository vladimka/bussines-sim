import {
  BUSINESSES,
  CATEGORIES,
  DIVIDEND_RATE,
  LUXURY,
  MANAGERS_CAP,
  MANAGER_BONUS,
  MANAGER_COST_FACTOR,
  MANAGER_COST_GROWTH,
  REAL_ESTATE,
  STOCKS,
  TRACKS,
  UPGRADES,
} from './data.js';

export function initialState() {
  const market = {};
  const marketHistory = {};
  for (const stock of STOCKS) {
    market[stock.id] = stock.base;
    marketHistory[stock.id] = [stock.base];
  }

  return {
    money: 0,
    totalEarned: 0,
    totalEarnedAllTime: 0,
    clicks: 0,
    businesses: {},
    bizUpgrades: {},
    managers: {},
    upgrades: {},
    achievements: {},
    reputation: 0,
    ipos: 0,
    buyAmount: 1,
    realEstate: {},
    luxury: {},
    portfolio: {},
    market,
    marketHistory,
    trades: 0,
    eventsResolved: 0,
    casesResolved: 0,
    tempEffects: [],
    event: null,
    nextEventAt: Date.now() + 60000,
    startedAt: Date.now(),
    savedAt: Date.now(),
  };
}

/** Стоимость покупки amount единиц бизнеса (геометрическая прогрессия). */
export function costFor(amount, baseCost, growth, owned) {
  if (amount <= 0) return 0;
  return (
    (baseCost * Math.pow(growth, owned) * (Math.pow(growth, amount) - 1)) /
    (growth - 1)
  );
}

/** Сколько единиц бизнеса можно купить на деньги. */
export function maxAffordable(baseCost, growth, owned, money) {
  const price = baseCost * Math.pow(growth, owned);
  if (money < price) return 0;
  const raw = Math.floor(
    Math.log(1 + (money * (growth - 1)) / price) / Math.log(growth) + 1e-9
  );
  let amount = Math.max(0, raw);
  while (amount > 0 && costFor(amount, baseCost, growth, owned) > money) amount -= 1;
  return amount;
}

export function trackCost(biz, track, level) {
  return biz.cost * track.costMult * Math.pow(track.growth, level);
}

export function managerCost(biz, hiredCount = 0) {
  const n = Math.max(0, Math.floor(hiredCount || 0));
  return biz.cost * MANAGER_COST_FACTOR * Math.pow(MANAGER_COST_GROWTH, n);
}

export function isReqMet(req, state) {
  if (!req) return true;
  switch (req.kind) {
    case 'business':
      return (state.businesses[req.id] || 0) >= req.count;
    case 'clicks':
      return state.clicks >= req.count;
    case 'totalEarned':
      return state.totalEarnedAllTime >= req.amount;
    case 'reputation':
      return state.reputation >= req.amount;
    default:
      return true;
  }
}

/** Один шаг рынка: шум + притяжение к базовой цене. */
export function advanceMarket(market = {}, history = {}) {
  const nextMarket = { ...market };
  const nextHistory = { ...history };

  for (const stock of STOCKS) {
    const price = nextMarket[stock.id] ?? stock.base;
    const noise =
      Math.random() + Math.random() + Math.random() + Math.random() - 2;
    const pull = (stock.base - price) * 0.02;
    let next = price + pull + price * stock.vol * noise;
    next = Math.min(stock.base * 4, Math.max(stock.base * 0.25, next));
    nextMarket[stock.id] = next;

    const prev = Array.isArray(nextHistory[stock.id])
      ? nextHistory[stock.id]
      : [stock.base];
    nextHistory[stock.id] = [...prev.slice(-39), next];
  }

  return { market: nextMarket, history: nextHistory };
}

/** Применяет выбранный вариант события и возвращает новое состояние. */
export function applyEventChoice(state, effects, derived, now = Date.now()) {
  let money = state.money;
  let totalEarned = state.totalEarned;
  let totalEarnedAllTime = state.totalEarnedAllTime;
  const tempEffects = [...(state.tempEffects || [])];

  for (const effect of effects || []) {
    if (effect.kind === 'incomeMult') {
      tempEffects.push({
        id: `${effect.label || 'Событие'}-${now}-${tempEffects.length}`,
        label: effect.label || 'Событие',
        mult: effect.mult,
        until: now + effect.seconds * 1000,
      });
    } else if (effect.kind === 'cash') {
      const amount = derived.incomePerSecond * effect.seconds;
      money += amount;
      totalEarned += amount;
      totalEarnedAllTime += amount;
    } else if (effect.kind === 'cashAmount') {
      const amount = effect.amount || 0;
      money += amount;
      totalEarned += amount;
      totalEarnedAllTime += amount;
    } else if (effect.kind === 'invest') {
      money -= effect.cost || 0;
      if (effect.incomeMult) {
        tempEffects.push({
          id: `invest-${now}-${tempEffects.length}`,
          label: effect.label || 'Инвестиция',
          mult: effect.incomeMult,
          until: now + (effect.seconds || 60) * 1000,
        });
      }
    } else if (effect.kind === 'cashPct') {
      money = Math.max(0, money * (1 - effect.pct));
    } else if (effect.kind === 'addBusiness') {
      // Открытие новых точек по кейсу: платим стоимость и добавляем юниты.
      const units = effect.count || 1;
      const cost = effect.cost || 0;
      if ((state.businesses[effect.id] || 0) + units <= 0) return state;
      return {
        ...state,
        money: Math.max(0, money - cost),
        businesses: {
          ...state.businesses,
          [effect.id]: (state.businesses[effect.id] || 0) + units,
        },
      };
    }
  }

  return {
    ...state,
    money,
    totalEarned,
    totalEarnedAllTime,
    tempEffects,
    event: null,
    nextEventAt: now + 90000,
    eventsResolved: (state.eventsResolved || 0) + 1,
  };
}

/** Разрешает кейс (сценарий) и возвращает новое состояние. */
export function resolveCase(state, choice, derived, now = Date.now()) {
  const next = applyEventChoice(state, choice?.effects, derived, now);
  return {
    ...next,
    casesResolved: (state.casesResolved || 0) + 1,
  };
}

/** Случайный дроп из лут-кейса. */
export function rollLoot(loot) {
  const total = loot.items.reduce((sum, i) => sum + i.chance, 0);
  let roll = Math.random() * total;
  for (const item of loot.items) {
    roll -= item.chance;
    if (roll <= 0) return item;
  }
  return loot.items[loot.items.length - 1];
}

/** Все производные значения: доходы, множители, цены прокачки, рынок. */
export function computeDerived(state) {
  const now = Date.now();
  const purchased = UPGRADES.filter((u) => state.upgrades[u.id]);

  let clickMult = 1;
  let globalMult = 1;
  const bizMult = {};

  for (const u of purchased) {
    if (!u.effect) continue;
    if (u.effect.kind === 'click') clickMult *= u.effect.mult;
    else if (u.effect.kind === 'global') globalMult *= u.effect.mult;
    else if (u.effect.kind === 'business') {
      bizMult[u.effect.id] = (bizMult[u.effect.id] || 1) * u.effect.mult;
    }
  }

  const reputationMult = 1 + state.reputation * 0.1;
  const achievementMult = 1 + Object.keys(state.achievements).length * 0.01;

  const activeEffects = (state.tempEffects || []).filter((e) => e.until > now);
  const effectMult = activeEffects.reduce((m, e) => m * e.mult, 1);

  // Статус: недвижимость + люкс, +0.25% дохода за очко.
  const estateUnits = {};
  let status = 0;
  for (const item of REAL_ESTATE) {
    const units = state.realEstate?.[item.id] || 0;
    estateUnits[item.id] = units;
    status += units * item.status;
  }
  for (const item of LUXURY) {
    if (state.luxury?.[item.id]) status += item.status;
  }
  const statusMult = 1 + status * 0.0025;

  const totalMult =
    globalMult * reputationMult * achievementMult * statusMult * effectMult;

  // Синергия: каждые 10 точек в категории дают +5%, максимум +50%.
  const categoryTotals = { consumer: 0, industry: 0, future: 0 };
  for (const b of BUSINESSES) {
    categoryTotals[b.category] += state.businesses[b.id] || 0;
  }
  const categoryBonus = {};
  for (const key of Object.keys(categoryTotals)) {
    categoryBonus[key] = Math.min(
      0.5,
      Math.floor(categoryTotals[key] / 10) * 0.05
    );
  }

  const businesses = BUSINESSES.map((b) => {
    const owned = state.businesses[b.id] || 0;
    const levelMap = state.bizUpgrades?.[b.id] || {};

    const tracks = TRACKS.map((t) => {
      const level = levelMap[t.id] || 0;
      return {
        ...t,
        name: b.titles?.[t.id] || t.label,
        level,
        cost: trackCost(b, t, level),
        bonus: level * t.perLevel,
        nextBonus: (level + 1) * t.perLevel,
      };
    });

    const trackMult = tracks.reduce((m, t) => m * (1 + t.bonus), 1);
    const hiredCount = Math.min(
      Number(state.managers?.[b.id] || 0) || 0,
      MANAGERS_CAP
    );
    const managerMult = 1 + hiredCount * MANAGER_BONUS;
    const synergy = categoryBonus[b.category] || 0;
    const unitIncome =
      b.income *
      trackMult *
      managerMult *
      (bizMult[b.id] || 1) *
      (1 + synergy) *
      totalMult;

    return {
      ...b,
      owned,
      income: unitIncome * owned,
      unitIncome,
      tracks,
      trackLevels: tracks.reduce((sum, t) => sum + t.level, 0),
      manager: {
        hired: hiredCount > 0,
        count: hiredCount,
        name: b.manager,
        cost: managerCost(b, hiredCount),
        bonus: MANAGER_BONUS,
      },
      synergy,
      categoryMeta: CATEGORIES[b.category],
      nextCost: costFor(1, b.cost, b.growth, owned),
    };
  });

  const businessIncome = businesses.reduce((sum, b) => sum + b.income, 0);

  const realEstate = REAL_ESTATE.map((p) => {
    const units = estateUnits[p.id] || 0;
    return {
      ...p,
      units,
      income: p.income * units * totalMult,
      nextCost: p.cost * Math.pow(p.growth, units),
    };
  });
  const estateIncome = realEstate.reduce((sum, p) => sum + p.income, 0);

  const luxury = LUXURY.map((item) => ({
    ...item,
    owned: Boolean(state.luxury?.[item.id]),
  }));

  const portfolio = STOCKS.map((stock) => {
    const price = state.market?.[stock.id] ?? stock.base;
    const held = state.portfolio?.[stock.id] || { shares: 0, cost: 0 };
    const value = held.shares * price;
    return {
      ...stock,
      price,
      history: state.marketHistory?.[stock.id] || [stock.base],
      shares: held.shares,
      cost: held.cost,
      value,
      pnl: value - held.cost,
    };
  });
  const stocksValue = portfolio.reduce((sum, s) => sum + s.value, 0);
  const stocksCost = portfolio.reduce((sum, s) => sum + s.cost, 0);
  const stocksIncome = stocksValue * DIVIDEND_RATE;

  const incomePerSecond = businessIncome + estateIncome + stocksIncome;
  const clickPower = Math.max(1, clickMult * totalMult);
  const prestigeGain = Math.floor(Math.sqrt(state.totalEarned / 1e6));

  return {
    businesses,
    realEstate,
    luxury,
    portfolio,
    categoryTotals,
    categoryBonus,
    status,
    statusMult,
    effectMult,
    activeEffects,
    totalMult,
    reputationMult,
    achievementMult,
    incomePerSecond,
    businessIncome,
    estateIncome,
    stocksIncome,
    stocksValue,
    stocksCost,
    clickPower,
    prestigeGain,
    upgradeCount: purchased.length,
    ownedTotal: businesses.reduce((sum, b) => sum + b.owned, 0),
    estateTotal: Object.values(estateUnits).reduce((a, b) => a + b, 0),
  };
}
