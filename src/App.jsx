import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ACHIEVEMENTS,
  BUSINESSES,
  EVENTS,
  LOOT_CASES,
  LUXURY,
  MANAGERS_CAP,
  REAL_ESTATE,
  STOCKS,
  TRACKS,
  UPGRADES,
} from './game/data.js';
import {
  advanceMarket,
  applyEventChoice,
  computeDerived,
  costFor,
  initialState,
  isReqMet,
  managerCost,
  maxAffordable,
  rollLoot,
  trackCost,
} from './game/engine.js';
import { clearSave, loadGame, saveGame } from './game/storage.js';
import { formatMoney, formatNumber } from './game/format.js';
import Clicker from './components/Clicker.jsx';
import PrestigePanel from './components/PrestigePanel.jsx';
import BusinessCard from './components/BusinessCard.jsx';
import BusinessModal from './components/BusinessModal.jsx';
import UpgradeCard from './components/UpgradeCard.jsx';
import AchievementsGrid from './components/AchievementsGrid.jsx';
import OfflineModal from './components/OfflineModal.jsx';
import EventCard from './components/EventCard.jsx';
import CasesTab from './components/CasesTab.jsx';
import AssetsTab from './components/AssetsTab.jsx';
import StocksTab from './components/StocksTab.jsx';

const TABS = [
  { id: 'business', label: 'Бизнесы', icon: '🏢' },
  { id: 'upgrades', label: 'Улучшения', icon: '⚡' },
  { id: 'assets', label: 'Активы', icon: '🏙️' },
  { id: 'stocks', label: 'Биржа', icon: '📈' },
  { id: 'cases', label: 'Кейсы', icon: '🎭' },
  { id: 'achievements', label: 'Достижения', icon: '🏆' },
];

const TICK_MS = 100;
const MARKET_MS = 3000;

export default function App() {
  const [boot] = useState(loadGame);
  const [state, setState] = useState(boot.state);
  const [offline, setOffline] = useState(boot.offline);
  const [tab, setTab] = useState('business');
  const [selectedBiz, setSelectedBiz] = useState(null);
  const [showOwned, setShowOwned] = useState(false);
  const [ipoConfirm, setIpoConfirm] = useState(false);
  const [tradeFraction, setTradeFraction] = useState(0.25);
  const [pops, setPops] = useState([]);
  const popId = useRef(0);

  const derived = useMemo(() => computeDerived(state), [state]);
  const stateRef = useRef(state);
  stateRef.current = state;
  const derivedRef = useRef(derived);
  derivedRef.current = derived;
  const selectedBizRef = useRef(selectedBiz);
  selectedBizRef.current = selectedBiz;

  const availableUpgrades = useMemo(
    () =>
      UPGRADES.filter(
        (u) => !state.upgrades[u.id] && isReqMet(u.req, state)
      ).sort((a, b) => a.cost - b.cost),
    [state]
  );

  const ownedUpgrades = useMemo(
    () => UPGRADES.filter((u) => state.upgrades[u.id]),
    [state.upgrades]
  );

  const eventDef = state.event
    ? EVENTS.find((e) => e.id === state.event.id)
    : null;
  const eventRemaining = state.event
    ? Math.max(0, Math.ceil((state.event.expiresAt - Date.now()) / 1000))
    : 0;

  const selected = selectedBiz
    ? derived.businesses.find((b) => b.id === selectedBiz)
    : null;

  // Пассивный доход.
  useEffect(() => {
    const id = setInterval(() => {
      const income = derivedRef.current.incomePerSecond;
      if (income <= 0) return;
      const gain = (income * TICK_MS) / 1000;
      setState((s) => ({
        ...s,
        money: s.money + gain,
        totalEarned: s.totalEarned + gain,
        totalEarnedAllTime: s.totalEarnedAllTime + gain,
      }));
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  // Живой рынок.
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        const { market, history } = advanceMarket(s.market, s.marketHistory);
        return { ...s, market, marketHistory: history };
      });
    }, MARKET_MS);
    return () => clearInterval(id);
  }, []);

  // Случайные события и очистка временных эффектов.
  useEffect(() => {
    const id = setInterval(() => {
      setState((s) => {
        const now = Date.now();
        let next = s;
        let changed = false;

        if (
          (s.tempEffects || []).some((e) => e.until <= now)
        ) {
          next = {
            ...next,
            tempEffects: (s.tempEffects || []).filter((e) => e.until > now),
          };
          changed = true;
        }

        if (next.event && next.event.expiresAt <= now) {
          next = { ...next, event: null, nextEventAt: now + 90000 };
          changed = true;
        }

        if (
          !next.event &&
          now >= next.nextEventAt &&
          derivedRef.current.incomePerSecond > 0 &&
          next.totalEarnedAllTime >= 5000
        ) {
          const def = EVENTS[Math.floor(Math.random() * EVENTS.length)];
          next = { ...next, event: { id: def.id, expiresAt: now + 25000 } };
          changed = true;
        }

        return changed ? next : s;
      });
    }, 1000);
    return () => clearInterval(id);
  }, []);

  // Автосохранение.
  useEffect(() => {
    const flush = () => saveGame(stateRef.current);
    const id = setInterval(flush, 5000);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', flush);
    return () => {
      clearInterval(id);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', flush);
      flush();
    };
  }, []);

  // Выдача достижений.
  useEffect(() => {
    const newly = ACHIEVEMENTS.filter(
      (a) => !state.achievements[a.id] && a.check(state, derived)
    );
    if (newly.length === 0) return;
    const patch = Object.fromEntries(newly.map((a) => [a.id, true]));
    setState((s) => ({
      ...s,
      achievements: { ...s.achievements, ...patch },
    }));
  }, [state, derived]);

  // Подтверждение IPO сбрасывается само.
  useEffect(() => {
    if (!ipoConfirm) return;
    const id = setTimeout(() => setIpoConfirm(false), 4000);
    return () => clearTimeout(id);
  }, [ipoConfirm]);

  const doDeal = () => {
    const amount = derivedRef.current.clickPower;
    setState((s) => ({
      ...s,
      money: s.money + amount,
      totalEarned: s.totalEarned + amount,
      totalEarnedAllTime: s.totalEarnedAllTime + amount,
      clicks: s.clicks + 1,
    }));

    const id = ++popId.current;
    setPops((p) => [
      ...p.slice(-6),
      { id, offset: Math.round(Math.random() * 70 - 35) },
    ]);
    setTimeout(() => setPops((p) => p.filter((x) => x.id !== id)), 900);
  };
  const dealRef = useRef(doDeal);
  dealRef.current = doDeal;

  // Пробел — сделка, Escape — закрыть окно.
  useEffect(() => {
    const onKey = (e) => {
      if (e.code === 'Escape') {
        setSelectedBiz(null);
        return;
      }
      if (e.code !== 'Space' || e.repeat) return;
      if (selectedBizRef.current) return;
      const tag = document.activeElement?.tagName;
      if (['INPUT', 'TEXTAREA', 'BUTTON', 'SELECT'].includes(tag)) return;
      e.preventDefault();
      dealRef.current();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const buyBusiness = (bizId) => {
    setState((s) => {
      const biz = BUSINESSES.find((b) => b.id === bizId);
      if (!biz) return s;
      const owned = s.businesses[bizId] || 0;
      const wanted =
        s.buyAmount === 'max'
          ? maxAffordable(biz.cost, biz.growth, owned, s.money)
          : s.buyAmount;
      let amount = wanted;
      while (amount > 0 && costFor(amount, biz.cost, biz.growth, owned) > s.money) {
        amount -= 1;
      }
      if (amount <= 0) return s;
      const cost = costFor(amount, biz.cost, biz.growth, owned);
      return {
        ...s,
        money: s.money - cost,
        businesses: { ...s.businesses, [bizId]: owned + amount },
      };
    });
  };

  const buyUpgrade = (id) => {
    setState((s) => {
      const up = UPGRADES.find((u) => u.id === id);
      if (!up || s.upgrades[id] || s.money < up.cost || !isReqMet(up.req, s)) {
        return s;
      }
      return {
        ...s,
        money: s.money - up.cost,
        upgrades: { ...s.upgrades, [id]: true },
      };
    });
  };

  const buyTrack = (bizId, trackId) => {
    setState((s) => {
      const biz = BUSINESSES.find((b) => b.id === bizId);
      const track = TRACKS.find((t) => t.id === trackId);
      if (!biz || !track || (s.businesses[bizId] || 0) < 1) return s;

      const level = s.bizUpgrades?.[bizId]?.[trackId] || 0;
      const cost = trackCost(biz, track, level);
      if (s.money < cost) return s;

      return {
        ...s,
        money: s.money - cost,
        bizUpgrades: {
          ...s.bizUpgrades,
          [bizId]: { ...(s.bizUpgrades?.[bizId] || {}), [trackId]: level + 1 },
        },
      };
    });
  };

  const hireManager = (bizId) => {
    setState((s) => {
      const biz = BUSINESSES.find((b) => b.id === bizId);
      const hiredCount = Number(s.managers?.[bizId] || 0) || 0;
      if (
        hiredCount >= MANAGERS_CAP ||
        (s.businesses[bizId] || 0) < 1
      )
        return s;
      const cost = managerCost(biz, hiredCount);
      if (s.money < cost) return s;
      return {
        ...s,
        money: s.money - cost,
        managers: { ...s.managers, [bizId]: hiredCount + 1 },
      };
    });
  };

  const buyProperty = (id) => {
    setState((s) => {
      const property = REAL_ESTATE.find((p) => p.id === id);
      if (!property) return s;
      const units = s.realEstate?.[id] || 0;
      const cost = property.cost * Math.pow(property.growth, units);
      if (s.money < cost) return s;
      return {
        ...s,
        money: s.money - cost,
        realEstate: { ...s.realEstate, [id]: units + 1 },
      };
    });
  };

  const buyLuxury = (id) => {
    setState((s) => {
      const item = LUXURY.find((l) => l.id === id);
      if (!item || s.luxury?.[id] || s.money < item.cost) return s;
      return {
        ...s,
        money: s.money - item.cost,
        luxury: { ...s.luxury, [id]: true },
      };
    });
  };

  const buyStock = (id) => {
    setState((s) => {
      const stock = STOCKS.find((a) => a.id === id);
      if (!stock) return s;
      const price = s.market?.[id] ?? stock.base;
      const budget = s.money * tradeFraction;
      if (budget < 1) return s;

      const prev = s.portfolio?.[id] || { shares: 0, cost: 0 };
      return {
        ...s,
        money: s.money - budget,
        trades: (s.trades || 0) + 1,
        portfolio: {
          ...s.portfolio,
          [id]: { shares: prev.shares + budget / price, cost: prev.cost + budget },
        },
      };
    });
  };

  const sellStock = (id) => {
    setState((s) => {
      const stock = STOCKS.find((a) => a.id === id);
      const held = s.portfolio?.[id];
      if (!stock || !held || held.shares <= 0) return s;

      const price = s.market?.[id] ?? stock.base;
      const shares = tradeFraction >= 1 ? held.shares : held.shares * tradeFraction;
      const costPart = tradeFraction >= 1 ? held.cost : held.cost * tradeFraction;
      const rest = held.shares - shares;

      const portfolio = { ...s.portfolio };
      if (rest > 1e-9) {
        portfolio[id] = {
          shares: rest,
          cost: Math.max(0, held.cost - costPart),
        };
      } else {
        delete portfolio[id];
      }

      return {
        ...s,
        money: s.money + shares * price,
        portfolio,
        trades: (s.trades || 0) + 1,
      };
    });
  };

  const chooseEvent = (choice) => {
    setState((s) =>
      s.event ? applyEventChoice(s, choice.effects, derivedRef.current) : s
    );
  };

  const openLootCase = (caseId) => {
    const loot = LOOT_CASES.find((l) => l.id === caseId);
    if (!loot || state.money < loot.cost) return null;
    const reward = rollLoot(loot);
    const gain = reward.type === 'cash' ? reward.amount : 0;
    setState((s) => ({
      ...s,
      money: s.money - loot.cost + gain,
      totalEarned: s.totalEarned - loot.cost + gain,
      totalEarnedAllTime: s.totalEarnedAllTime - loot.cost + gain,
      luxury: reward.type === 'luxury' ? { ...s.luxury, [reward.id]: true } : s.luxury,
    }));
    return reward;
  };

  const prestige = () => {
    if (derivedRef.current.prestigeGain < 1) return;
    if (!ipoConfirm) {
      setIpoConfirm(true);
      return;
    }
    setIpoConfirm(false);
    setTab('business');
    setSelectedBiz(null);
    setState((s) => {
      const gain = Math.floor(Math.sqrt(s.totalEarned / 1e6));
      const next = {
        ...s,
        reputation: s.reputation + gain,
        ipos: s.ipos + 1,
        money: 0,
        totalEarned: 0,
        clicks: 0,
        businesses: {},
        bizUpgrades: {},
        managers: {},
        upgrades: {},
        realEstate: {},
        portfolio: {},
        tempEffects: [],
        event: null,
        nextEventAt: Date.now() + 90000,
        casesResolved: 0,
        startedAt: Date.now(),
      };
      saveGame(next);
      return next;
    });
  };

  const resetProgress = () => {
    const sure = window.confirm(
      'Удалить весь прогресс и начать заново? Это действие нельзя отменить.'
    );
    if (!sure) return;
    clearSave();
    const fresh = initialState();
    saveGame(fresh);
    setState(fresh);
    setOffline(null);
    setSelectedBiz(null);
    setTab('business');
  };

  const setBuyAmount = (value) => setState((s) => ({ ...s, buyAmount: value }));

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <span className="brand-icon" aria-hidden="true">
            💼
          </span>
          <div>
            <h1>Симулятор Бизнесмена</h1>
            <p className="muted tiny">
              idle-империя · всего заработано {formatMoney(state.totalEarnedAllTime)}
            </p>
          </div>
        </div>

        <div className="stats">
          <div className="stat money">
            <span>Баланс</span>
            <strong>{formatMoney(state.money)}</strong>
          </div>
          <div className="stat income">
            <span>Доход</span>
            <strong>+{formatNumber(derived.incomePerSecond)}/сек</strong>
          </div>
          <div className="stat bonus">
            <span>Бонус</span>
            <strong>×{derived.totalMult.toFixed(2)}</strong>
          </div>
          <div className="stat status">
            <span>Статус</span>
            <strong>★ {derived.status}</strong>
          </div>
        </div>
      </header>

      <div className="layout">
        <aside className="sidebar">
          <Clicker clickPower={derived.clickPower} onDeal={doDeal} pops={pops} />
          <PrestigePanel
            state={state}
            derived={derived}
            confirm={ipoConfirm}
            onPrestige={prestige}
          />
          {eventDef && (
            <EventCard
              def={eventDef}
              remaining={eventRemaining}
              onChoose={chooseEvent}
            />
          )}
        </aside>

        <main className="panel card">
          {derived.activeEffects.length > 0 && (
            <div className="effects">
              {derived.activeEffects.map((effect) => {
                const left = Math.max(
                  0,
                  Math.ceil((effect.until - Date.now()) / 1000)
                );
                return (
                  <span
                    key={effect.id}
                    className={effect.mult >= 1 ? 'effect good' : 'effect bad'}
                  >
                    {effect.label} ×{effect.mult} · {left} с
                  </span>
                );
              })}
            </div>
          )}

          <div className="panel-head">
            <div className="tabs" role="tablist">
              {TABS.map((t) => (
                <button
                  key={t.id}
                  role="tab"
                  aria-selected={tab === t.id}
                  className={tab === t.id ? 'tab active' : 'tab'}
                  onClick={() => setTab(t.id)}
                >
                  <span aria-hidden="true">{t.icon}</span> {t.label}
                  {t.id === 'upgrades' && availableUpgrades.length > 0 && (
                    <b className="badge">{availableUpgrades.length}</b>
                  )}
                </button>
              ))}
            </div>

            {tab === 'business' && (
              <div className="chips" aria-label="Количество покупки">
                {[1, 10, 100, 'max'].map((v) => (
                  <button
                    key={v}
                    className={state.buyAmount === v ? 'chip active' : 'chip'}
                    onClick={() => setBuyAmount(v)}
                  >
                    {v === 'max' ? 'МАКС' : `×${v}`}
                  </button>
                ))}
              </div>
            )}

            {tab === 'stocks' && (
              <div className="chips" aria-label="Размер сделки">
                {[0.1, 0.25, 0.5, 1].map((v) => (
                  <button
                    key={v}
                    className={tradeFraction === v ? 'chip active' : 'chip'}
                    onClick={() => setTradeFraction(v)}
                  >
                    {v === 1 ? 'ВСЁ' : `${Math.round(v * 100)}%`}
                  </button>
                ))}
              </div>
            )}

            {tab === 'upgrades' && ownedUpgrades.length > 0 && (
              <button className="chip" onClick={() => setShowOwned((v) => !v)}>
                {showOwned ? 'Скрыть купленные' : `Куплено (${ownedUpgrades.length})`}
              </button>
            )}
          </div>

          {tab === 'business' && (
            <div className="list">
              {derived.businesses.map((biz) => (
                <BusinessCard
                  key={biz.id}
                  biz={biz}
                  money={state.money}
                  buyAmount={state.buyAmount}
                  onBuy={() => buyBusiness(biz.id)}
                  onManage={() => setSelectedBiz(biz.id)}
                />
              ))}
            </div>
          )}

          {tab === 'upgrades' && (
            <div className="list">
              {availableUpgrades.length === 0 && !showOwned && (
                <div className="empty">
                  <span aria-hidden="true">🔍</span>
                  <p>
                    Пока нет доступных улучшений.
                    <br />
                    Покупай бизнесы и зарабатывай деньги, чтобы открыть новые.
                  </p>
                </div>
              )}

              {availableUpgrades.map((u) => (
                <UpgradeCard
                  key={u.id}
                  upgrade={u}
                  money={state.money}
                  onBuy={() => buyUpgrade(u.id)}
                />
              ))}

              {showOwned &&
                ownedUpgrades.map((u) => (
                  <UpgradeCard
                    key={u.id}
                    upgrade={u}
                    money={state.money}
                    owned
                    onBuy={() => {}}
                  />
                ))}
            </div>
          )}

          {tab === 'assets' && (
            <AssetsTab
              derived={derived}
              money={state.money}
              onBuyProperty={buyProperty}
              onBuyLuxury={buyLuxury}
            />
          )}

          {tab === 'stocks' && (
            <StocksTab
              derived={derived}
              money={state.money}
              fraction={tradeFraction}
              onBuy={buyStock}
              onSell={sellStock}
            />
          )}

          {tab === 'cases' && (
            <CasesTab
              lootCases={LOOT_CASES}
              money={state.money}
              onOpenLoot={openLootCase}
            />
          )}

          {tab === 'achievements' && (
            <AchievementsGrid list={ACHIEVEMENTS} unlocked={state.achievements} />
          )}
        </main>
      </div>

      <footer className="footer">
        <span className="muted tiny">
          Прогресс сохраняется автоматически в этом браузере · офлайн-доход начисляется до 4 часов
        </span>
        <button className="link-danger" onClick={resetProgress}>
          Сбросить прогресс
        </button>
      </footer>

      <OfflineModal report={offline} onClose={() => setOffline(null)} />

      {selected && (
        <BusinessModal
          biz={selected}
          money={state.money}
          onClose={() => setSelectedBiz(null)}
          onUpgradeTrack={(trackId) => buyTrack(selected.id, trackId)}
          onHireManager={() => hireManager(selected.id)}
        />
      )}
    </div>
  );
}
