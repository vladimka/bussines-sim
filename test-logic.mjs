import {
  advanceMarket,
  applyEventChoice,
  computeDerived,
  costFor,
  initialState,
  managerCost,
  maxAffordable,
  resolveCase,
  rollLoot,
  trackCost,
} from './src/game/engine.js';
import { formatNumber, formatMoney } from './src/game/format.js';
import {
  BUSINESSES,
  CASES,
  EVENTS,
  LOOT_CASES,
  LUXURY,
  REAL_ESTATE,
  STOCKS,
  TRACKS,
  UPGRADES,
} from './src/game/data.js';

let failed = 0;
const assert = (c, m) => {
  if (!c) {
    console.error('FAIL:', m);
    failed++;
  }
};
const near = (a, b, eps = 1e-9) => Math.abs(a - b) < eps;

// ── Цены и покупки ────────────────────────────────────────────────
assert(costFor(1, 15, 1.15, 0) === 15, 'first shawarma costs 15');
assert(
  near(costFor(10, 15, 1.15, 0), (15 * (Math.pow(1.15, 10) - 1)) / 0.15),
  'bulk cost'
);
const max = maxAffordable(15, 1.15, 0, 1000);
assert(
  max >= 10 && maxAffordable(15, 1.15, 0, costFor(max, 15, 1.15, 0)) === max,
  'max affordable exact'
);
assert(maxAffordable(15, 1.15, 0, 0) === 0, 'zero money');

// ── Прокачка ──────────────────────────────────────────────────────
const shawarma = BUSINESSES.find((b) => b.id === 'shawarma');
const eq = TRACKS.find((t) => t.id === 'eq');
assert(trackCost(shawarma, eq, 0) === 22.5, 'eq lvl0 cost');
assert(trackCost(shawarma, eq, 1) === 45, 'eq lvl1 cost');
assert(managerCost(shawarma) === 900, 'manager cost');
assert(managerCost(shawarma, 1) === 1800, 'second manager cost');

// ── Базовый доход и синергия ──────────────────────────────────────
const s = initialState();
s.businesses.shawarma = 10;
let d = computeDerived(s);
assert(near(d.categoryTotals.consumer, 10), 'category total');
assert(near(d.categoryBonus.consumer, 0.05), 'category bonus 5%');
assert(near(d.businesses[0].unitIncome, 0.6 * 1.05), 'unit income with synergy');
assert(near(d.incomePerSecond, 6.3), 'income 10 shawarmas');

s.bizUpgrades.shawarma = { eq: 1, staff: 2, mkt: 3 };
d = computeDerived(s);
const expectedUnit = 0.6 * 1.15 * 1.24 * 1.3 * 1.05;
assert(near(d.businesses[0].unitIncome, expectedUnit), 'track multipliers');
assert(near(d.businesses[0].tracks[0].level, 1), 'track level exposed');

s.managers.shawarma = true;
d = computeDerived(s);
assert(near(d.businesses[0].unitIncome, expectedUnit * 1.5), 'manager +50%');
assert(d.businesses[0].manager.count === 1, 'manager count 1');

// Второй менеджер — второй бизнес, +50% к первому, но не к третьему.
s.managers.shawarma = 2;
d = computeDerived(s);
assert(near(d.businesses[0].unitIncome, expectedUnit * 2.0), 'two managers +100%');
assert(d.businesses[0].manager.count === 2, 'manager count 2');

s.managers.shawarma = true;
d = computeDerived(s);
assert(near(d.businesses[0].unitIncome, expectedUnit * 1.5), 'manager back to boolean true');

// Синергия упирается в 50%.
const big = initialState();
big.businesses.shawarma = 250;
assert(near(computeDerived(big).categoryBonus.consumer, 0.5), 'synergy cap 50%');

// ── Статус, недвижимость, люкс ────────────────────────────────────
const estate = initialState();
estate.realEstate.studio = 2;
d = computeDerived(estate);
assert(d.status === 4, 'estate status');
assert(near(d.statusMult, 1.01), 'status mult');
assert(near(d.estateIncome, 5000 * 2 * 1.01), 'estate income');
assert(near(d.incomePerSecond, d.estateIncome), 'income from estate only');

estate.luxury.watch = true;
d = computeDerived(estate);
assert(d.status === 14, 'luxury status added');
assert(near(d.statusMult, 1.035), 'luxury status mult');

// ── Акции ─────────────────────────────────────────────────────────
const marketState = initialState();
marketState.portfolio['stock-tech'] = { shares: 10, cost: 1000 };
d = computeDerived(marketState);
assert(d.portfolio.find((p) => p.id === 'stock-tech').value === 1200, 'portfolio value');
assert(near(d.stocksIncome, 1200 * 0.0001), 'dividend income');
assert(near(d.incomePerSecond, d.stocksIncome), 'dividends in income');

let { market, history } = advanceMarket(initialState().market, initialState().marketHistory);
for (let i = 0; i < 300; i++) {
  ({ market, history } = advanceMarket(market, history));
}
for (const stock of STOCKS) {
  const price = market[stock.id];
  assert(Number.isFinite(price), `price finite ${stock.id}`);
  assert(price >= stock.base * 0.25 - 1e-9 && price <= stock.base * 4 + 1e-9, `price bounded ${stock.id}`);
  assert(history[stock.id].length <= 40, `history capped ${stock.id}`);
}

// ── События ───────────────────────────────────────────────────────
const eventState = {
  ...initialState(),
  event: { id: 'contract', expiresAt: Date.now() + 20000 },
  money: 1000,
};
const contract = EVENTS.find((e) => e.id === 'contract');
const afterCash = applyEventChoice(
  eventState,
  contract.choices[0].effects,
  computeDerived({ ...eventState, totalEarned: 0, businesses: { coffee: 10 } }),
  1700000000000
);
assert(afterCash.event === null, 'event cleared');
assert(afterCash.eventsResolved === 1, 'event counted');
assert(afterCash.money > 1000, 'cash reward added');

const penalty = applyEventChoice(
  eventState,
  [{ kind: 'incomeMult', mult: 0.75, seconds: 90, label: 'Инвестор' }],
  computeDerived(eventState)
);
assert(near(computeDerived(penalty).effectMult, 0.75), 'penalty effect');
assert(penalty.tempEffects.length === 1, 'effect stored');

const tax = applyEventChoice(
  { ...eventState, money: 1000 },
  [{ kind: 'cashPct', pct: 0.05 }],
  computeDerived(eventState),
  1700000000000
);
assert(near(tax.money, 950), 'cash percent effect');

// ── Кейсы ─────────────────────────────────────────────────────────
const caseState = { ...initialState(), money: 1000000 };
const franchise = CASES.find((c) => c.id === 'case-franchise');
assert(franchise, 'franchise case exists');
const nextCase = resolveCase(caseState, franchise.choices[0], computeDerived(caseState));
assert(nextCase.businesses.shawarma === 2, 'case addBusiness adds units');
assert(near(nextCase.money, 1000000 - 45000), 'case cost deducted');
assert(nextCase.casesResolved === 1, 'case resolved counted');

const maCase = CASES.find((c) => c.id === 'case-ma');
const maNext = resolveCase({ ...initialState(), money: 100 }, maCase.choices[0], computeDerived({ ...initialState(), money: 100 }));
assert(maNext.money > 100, 'case cashAmount reward');

const crisisCase = CASES.find((c) => c.id === 'case-crisis');
const crisisNext = resolveCase(
  { ...initialState(), money: 100000000 },
  crisisCase.choices[0],
  computeDerived({ ...initialState(), money: 100000000 })
);
assert(near(computeDerived(crisisNext).effectMult, 1.35), 'case invest effect');

for (const c of CASES) {
  assert(c.id.startsWith('case-'), 'case id prefix ' + c.id);
  for (const ch of c.choices) {
    for (const e of ch.effects || []) {
      assert(
        ['incomeMult', 'cash', 'cashAmount', 'cashPct', 'invest', 'addBusiness'].includes(e.kind),
        'case effect kind ' + e.kind
      );
      if (e.kind === 'addBusiness') {
        assert(BUSINESSES.some((b) => b.id === e.id), 'case addBusiness ref ' + e.id);
      }
    }
  }
}

// ── Лут-кейсы ─────────────────────────────────────────────────────
assert(LOOT_CASES.length >= 2, 'loot cases exist');
for (const l of LOOT_CASES) {
  const sum = l.items.reduce((s, i) => s + i.chance, 0);
  assert(Math.abs(sum - 1) < 1e-9, `loot odds sum to 1: ${l.id} (${sum})`);
}
for (const l of LOOT_CASES) {
  const drop = rollLoot(l);
  assert(l.items.some((i) => i.id === drop.id), 'loot roll within table ' + l.id);
  if (drop.type === 'cash') {
    assert(drop.amount > 0, 'loot cash amount positive');
  } else {
    assert(LUXURY.some((x) => x.id === drop.id), 'loot luxury ref ' + drop.id);
  }
}

// ── Ссылки и уникальность ────────────────────────────────────────
const ids = [
  ...BUSINESSES.map((b) => b.id),
  ...UPGRADES.map((u) => u.id),
  ...REAL_ESTATE.map((p) => p.id),
  ...LUXURY.map((l) => l.id),
  ...STOCKS.map((st) => st.id),
];
assert(new Set(ids).size === ids.length, 'unique ids');

for (const u of UPGRADES) {
  if (u.effect.kind === 'business') {
    assert(BUSINESSES.some((b) => b.id === u.effect.id), 'biz ref ' + u.id);
  }
  assert(['business', 'clicks', 'totalEarned', 'reputation'].includes(u.req.kind), 'req kind ' + u.id);
  assert(u.req.kind !== 'business' || BUSINESSES.some((b) => b.id === u.req.id), 'req biz ' + u.id);
}
for (const b of BUSINESSES) {
  assert(['consumer', 'industry', 'future'].includes(b.category), 'category ' + b.id);
  assert(b.titles && b.titles.eq && b.titles.staff && b.titles.mkt, 'titles ' + b.id);
}

// ── Симуляция 30 минут с новой прокачкой ─────────────────────────
const sim = initialState();
const SIM_SECONDS = 30 * 60;
let purchases = 0;
let upgradesBought = 0;

for (let sec = 0; sec < SIM_SECONDS; sec++) {
  for (let click = 0; click < 3; click++) {
    const p = computeDerived(sim).clickPower;
    sim.money += p;
    sim.totalEarned += p;
    sim.totalEarnedAllTime += p;
    sim.clicks += 1;
  }

  let d2 = computeDerived(sim);
  sim.money += d2.incomePerSecond;
  sim.totalEarned += d2.incomePerSecond;
  sim.totalEarnedAllTime += d2.incomePerSecond;

  // Улучшения-карточки.
  for (const u of UPGRADES) {
    if (sim.upgrades[u.id] || sim.money < u.cost) continue;
    if (u.req.kind === 'business' && (sim.businesses[u.req.id] || 0) < u.req.count) continue;
    if (u.req.kind === 'clicks' && sim.clicks < u.req.count) continue;
    if (u.req.kind === 'totalEarned' && sim.totalEarnedAllTime < u.req.amount) continue;
    sim.money -= u.cost;
    sim.upgrades[u.id] = true;
    upgradesBought++;
  }

  // Бизнесы и прокачка: покупаем самое дешёвое из доступного.
  while (true) {
    let best = null;
    for (const b of BUSINESSES) {
      const owned = sim.businesses[b.id] || 0;
      const cost = costFor(1, b.cost, b.growth, owned);
      if (!best || cost < best.cost) best = { kind: 'biz', b, cost };
      if (owned > 0) {
        for (const t of TRACKS) {
          const level = sim.bizUpgrades[b.id]?.[t.id] || 0;
          const tc = trackCost(b, t, level);
          if (!best || tc < best.cost) best = { kind: 'track', b, t, cost: tc };
        }
        const hiredCount = sim.managers[b.id] || 0;
        if (hiredCount < 3) {
          const mc = managerCost(b, hiredCount);
          if (!best || mc < best.cost) best = { kind: 'manager', b, cost: mc };
        }
      }
    }
    if (!best || best.cost > sim.money) break;
    sim.money -= best.cost;
    if (best.kind === 'biz') {
      sim.businesses[best.b.id] = (sim.businesses[best.b.id] || 0) + 1;
      purchases++;
    } else if (best.kind === 'track') {
      const map = sim.bizUpgrades[best.b.id] || {};
      sim.bizUpgrades[best.b.id] = { ...map, [best.t.id]: (map[best.t.id] || 0) + 1 };
    } else {
      sim.managers[best.b.id] = (sim.managers[best.b.id] || 0) + 1;
    }
  }
}

const simD = computeDerived(sim);
assert(Number.isFinite(simD.incomePerSecond) && simD.incomePerSecond > 0, 'sim income finite');
assert(Number.isFinite(sim.money), 'sim money finite');
assert(simD.incomePerSecond > 0, 'sim progressed');

console.log(
  'format:',
  [
    formatNumber(0),
    formatNumber(7.5),
    formatNumber(999),
    formatNumber(1000),
    formatNumber(1234),
    formatNumber(1.5e6),
    formatNumber(2.34e9),
    formatNumber(1e15),
  ].join(' · '),
  '|',
  formatMoney(1234567)
);
console.log(
  `30 мин симуляции → доход ${formatNumber(simD.incomePerSecond)}/сек, баланс ${formatMoney(sim.money)}, бизнесов ${purchases}, карточных улучшений ${upgradesBought}, статус ${simD.status}`
);
console.log(failed ? `ТЕСТОВ ПРОВАЛЕНО: ${failed}` : 'ВСЕ ТЕСТЫ ПРОЙДЕНЫ');
process.exitCode = failed ? 1 : 0;
