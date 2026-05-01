import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  GameState, WALLPAPERS, DAILY_GIFTS, AUTO_CLICKER_UPGRADES, CLICK_BUTTON_IMAGES,
  saveState, canClaimDailyGift, getNextDay,
  getAutoClickerCoinsPerSec, getNextAutoClickerUpgrade, formatNumber,
} from './gameState';
import { setMusicEnabled, setTrack, getTrackNames, startAudioOnInteraction } from './audioManager';

const LOGO = 'https://i.ibb.co/x8tjVJBT/9a537f7d-5259-44cd-b818-dff5f504aca3.jpg';
const COIN_ICON = 'https://imgfy.ru/ib/Vm9n8qKCjSoXfQ7_1775834388.webp';
const CLICK_POWER_ICON = 'https://imgfy.ru/ib/HJcZg8qbls7EbTV_1776351304.webp';
const UPGRADES_SECTION_ICON = 'https://imgfy.ru/ib/rc2NGfsgt97BWyb_1776351596.webp';
const AUTO_CLICKER_ICON = 'https://imgfy.ru/ib/kTYWzhqIhMduTlz_1777054672.webp';
const GIFTS_SECTION_ICON = 'https://imgfy.ru/ib/WqGTQErBrSV3lF8_1776970865.webp';
const GOLDEN_SPIDI_ICON = 'https://i.ibb.co/gppjW5R/1775898076670.jpg';
const MEDAL_100K_ICON = 'https://imgfy.ru/ib/kI4AgyRv8KaPZAo_1775835017.webp';
const SETTINGS_SECTION_ICON = 'https://imgfy.ru/ib/1dLMmuECgT7T0r9_1776351304.webp';

const TAB_ICONS = {
  game: 'https://imgfy.ru/ib/T4OFpSB3pas5OvI_1776415599.webp',
  upgrades: 'https://imgfy.ru/ib/8oDébZgUc1j5TuA_1776415600.webp',
  gifts: 'https://imgfy.ru/ib/WqGTQErBrSV3lF8_1776970865.webp',
  settings: 'https://imgfy.ru/ib/e8UA077eHGqRZ7u_1776415599.webp',
};

const NEW_PACK_BTN = 'https://imgfy.ru/ib/cFgAkQjlmXFzaGI_1776967380.webp';

type Tab = 'game' | 'upgrades' | 'gifts' | 'settings';

interface PCGameProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onReset: () => void;
}

export default function PCGame({ state, setState, onReset }: PCGameProps) {
  const [activeTab, setActiveTab] = useState<Tab>('game');
  const [clickAnimations, setClickAnimations] = useState<{ id: number; x: number; y: number; value: number }[]>([]);
  const [isClickBtnPressed, setIsClickBtnPressed] = useState(false);
  const [notification, setNotification] = useState<string | null>(null);
  const [medal100kAnim, setMedal100kAnim] = useState(false);
  const [dailyGiftAnim, setDailyGiftAnim] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const autoClickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const saveRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const animIdRef = useRef(0);
  const trackNames = getTrackNames();

  const currentBg = state.customWallpaper && state.selectedWallpaper === -1
    ? state.customWallpaper
    : WALLPAPERS[state.selectedWallpaper] || WALLPAPERS[0];

  const showNotification = useCallback((msg: string) => {
    setNotification(msg);
    setTimeout(() => setNotification(null), 3000);
  }, []);

  // Auto-clicker
  useEffect(() => {
    if (autoClickRef.current) clearInterval(autoClickRef.current);
    if (state.autoClickerLevel > 0) {
      const coinsPerSec = getAutoClickerCoinsPerSec(state.autoClickerLevel);
      autoClickRef.current = setInterval(() => {
        setState(s => ({ ...s, coins: s.coins + coinsPerSec }));
      }, 1000);
    }
    return () => { if (autoClickRef.current) clearInterval(autoClickRef.current); };
  }, [state.autoClickerLevel, setState]);

  // Auto-save
  useEffect(() => {
    saveRef.current = setInterval(() => {
      setState(s => { saveState(s); return s; });
    }, 5000);
    return () => { if (saveRef.current) clearInterval(saveRef.current); };
  }, [setState]);

  // Medal check
  useEffect(() => {
    if (!state.medal100k && state.totalClicks >= 100000) {
      setState(s => ({ ...s, medal100k: true, hasGoldenSpidi: true }));
      setMedal100kAnim(true);
      showNotification('🏅 Медаль 100K + Золотой Спиди разблокирован!');
      setTimeout(() => setMedal100kAnim(false), 3000);
    }
  }, [state.totalClicks, state.medal100k, setState, showNotification]);

  // Check for expired multiplier
  useEffect(() => {
    if (state.activeMultiplier) {
      const now = new Date();
      const expires = new Date(state.activeMultiplier.expiresAt);
      if (now >= expires) {
        setState(s => ({ 
          ...s, 
          activeMultiplier: null,
          clickPower: s.baseClickPower
        }));
        showNotification('⏰ Множитель истёк, сила клика = ' + state.baseClickPower);
      }
    }
  }, [state.activeMultiplier, state.baseClickPower, setState, showNotification]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    startAudioOnInteraction();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = animIdRef.current++;
    
    const value = state.clickPower;

    setClickAnimations(prev => [...prev, { id, x, y, value }]);
    setTimeout(() => setClickAnimations(prev => prev.filter(a => a.id !== id)), 800);

    setIsClickBtnPressed(true);
    setTimeout(() => setIsClickBtnPressed(false), 100);

    setState(s => {
      const newCoins = s.coins + s.clickPower;
      const newTotal = s.totalClicks + 1;
      return { ...s, coins: newCoins, totalClicks: newTotal };
    });
  }, [state.clickPower, setState]);

  // ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ БЕЗ "ДРУГОЙ АКТИВЕН"
  const handleBuyMultiplier = (id: string) => {
    const mult = state.multipliers.find(m => m.id === id);
    if (!mult) return;
    if (mult.level >= mult.maxLevel) { showNotification('Уже активен!'); return; }
    if (state.coins < mult.cost) { showNotification('Недостаточно монет!'); return; }

    if (state.activeMultiplier?.id === id) {
      showNotification('Этот множитель уже активен!');
      return;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const newClickPower = state.baseClickPower * mult.multiplierValue;

    setState(s => ({
      ...s,
      coins: s.coins - mult.cost,
      activeMultiplier: {
        id: mult.id,
        multiplier: mult.multiplierValue,
        expiresAt,
      },
      clickPower: newClickPower,
      multipliers: s.multipliers.map(m =>
        m.id === id ? { ...m, level: m.level + 1 } : m
      ),
    }));
    showNotification(`✅ ${mult.name} активирован на 24 часа!`);
  };

  const handleBuyAutoClicker = () => {
    const next = getNextAutoClickerUpgrade(state.autoClickerLevel);
    if (!next) return;
    if (state.coins < next.cost) { showNotification('Недостаточно монет!'); return; }
    setState(s => ({
      ...s,
      coins: s.coins - next.cost,
      autoClickerLevel: next.level,
      autoClickerActive: true,
    }));
    showNotification(`✅ ${next.name} куплен!`);
  };

  const handleClaimDailyGift = () => {
    if (!canClaimDailyGift(state)) { showNotification('Подарок уже получен сегодня!'); return; }
    const nextDay = getNextDay(state);
    const gift = DAILY_GIFTS.find(g => g.day === nextDay);
    if (!gift) return;

    let newState = { ...state };
    if (gift.type === 'coins') {
      newState.coins += gift.reward;
      showNotification(`🎁 День ${nextDay}: +${formatNumber(gift.reward)} монет!`);
    } else if (gift.type === 'golden_spidi') {
      newState.hasGoldenSpidi = true;
      showNotification('🎁 День 5: Золотой Спиди разблокирован!');
    }
    newState.dailyGiftDay = nextDay;
    newState.lastDailyGiftDate = new Date().toISOString();
    newState.claimedDays = [...(state.claimedDays || []), nextDay];
    setState(newState);
    setDailyGiftAnim(true);
    setTimeout(() => setDailyGiftAnim(false), 2000);
  };

  const handleTrackChange = (i: number) => {
    setTrack(i);
    setState(s => { const ns = { ...s, selectedTrack: i }; saveState(ns); return ns; });
  };

  const autoCoinsPerSec = getAutoClickerCoinsPerSec(state.autoClickerLevel);
  const nextAutoClicker = getNextAutoClickerUpgrade(state.autoClickerLevel);
  const canClaimGift = canClaimDailyGift(state);
  const nextGiftDay = getNextDay(state);
  const nextGift = DAILY_GIFTS.find(g => g.day === nextGiftDay);

  const glass = {
    background: 'rgba(255,255,255,0.72)',
    borderRadius: 20,
    border: '1.5px solid rgba(255,255,255,0.5)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 24px rgba(0,0,0,0.07)',
  };

  const tabBtn = (tab: Tab, label: string, icon: string) => (
    <button
      key={tab}
      onClick={() => setActiveTab(tab)}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
        padding: '10px 20px', borderRadius: 16, border: 'none', cursor: 'pointer',
        background: activeTab === tab ? 'rgba(59,130,246,0.15)' : 'transparent',
        color: activeTab === tab ? '#3b82f6' : '#64748b',
        fontWeight: activeTab === tab ? 800 : 600,
        fontSize: 12, transition: 'all 0.2s',
      }}
    >
      <img src={icon} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
      {label}
    </button>
  );

  return (
    <div style={{
      minHeight: '100vh', width: '100%',
      backgroundImage: `url(${currentBg})`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', flexDirection: 'column',
    }}>
      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)', zIndex: 0,
      }} />

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(30,41,59,0.95)', color: '#fff', borderRadius: 16,
          padding: '12px 28px', fontSize: 15, fontWeight: 700, zIndex: 9999,
          boxShadow: '0 4px 24px rgba(0,0,0,0.2)',
          animation: 'fadeInDown 0.3s ease',
        }}>
          {notification}
        </div>
      )}

      {/* Medal 100k animation */}
      {medal100kAnim && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{
            ...glass, padding: '32px 48px', textAlign: 'center',
            animation: 'fadeInUp 0.4s ease',
          }}>
            <img src={MEDAL_100K_ICON} alt="" style={{ width: 80, height: 80, objectFit: 'contain', marginBottom: 12 }} />
            <div style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>🏅 100K кликов!</div>
            <div style={{ fontSize: 14, color: '#64748b', marginTop: 4 }}>Медаль + Золотой Спиди разблокированы</div>
          </div>
        </div>
      )}

      {/* Main layout */}
      <div style={{
        position: 'relative', zIndex: 1,
        display: 'flex', flexDirection: 'column', minHeight: '100vh',
      }}>
        {/* Header */}
        <div style={{
          ...glass, margin: '16px 16px 0', padding: '12px 20px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <img src={LOGO} alt="Spidi Clicker" style={{ height: 40, objectFit: 'contain', borderRadius: 10 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={COIN_ICON} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <span style={{ fontSize: 22, fontWeight: 900, color: '#f59e0b' }}>{formatNumber(state.coins)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src={CLICK_POWER_ICON} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: '#64748b' }}>x{state.clickPower}</span>
            </div>
          </div>
        </div>

        {/* Tab navigation */}
        <div style={{
          ...glass, margin: '10px 16px 0', padding: '6px 12px',
          display: 'flex', justifyContent: 'space-around',
        }}>
          {tabBtn('game', 'Игра', TAB_ICONS.game)}
          {tabBtn('upgrades', 'Улучшения', TAB_ICONS.upgrades)}
          {tabBtn('gifts', 'Подарки', TAB_ICONS.gifts)}
          {tabBtn('settings', 'Настройки', TAB_ICONS.settings)}
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 16px 100px' }}>
          
          {/* GAME TAB */}
          {activeTab === 'game' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20 }}>
              {/* Click animations container */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  onClick={handleClick}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    transform: isClickBtnPressed ? 'scale(0.94)' : 'scale(1)',
                    transition: 'transform 0.1s',
                    borderRadius: '50%',
                    boxShadow: isClickBtnPressed
                      ? '0 4px 20px rgba(59,130,246,0.3)'
                      : '0 8px 40px rgba(59,130,246,0.25)',
                  }}
                >
                  <img
                    src={state.selectedClickButton === 'golden_spidi'
                      ? CLICK_BUTTON_IMAGES.golden_spidi
                      : CLICK_BUTTON_IMAGES.default}
                    alt="Click!"
                    style={{ width: 200, height: 200, objectFit: 'contain', borderRadius: '50%', userSelect: 'none' }}
                    draggable={false}
                  />
                </button>
                {clickAnimations.map(anim => (
                  <div key={anim.id} style={{
                    position: 'absolute',
                    left: anim.x, top: anim.y,
                    pointerEvents: 'none',
                    fontWeight: 900, fontSize: 22, color: '#f59e0b',
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    animation: 'floatUp 0.8s ease forwards',
                    whiteSpace: 'nowrap',
                  }}>
                    +{anim.value}
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div style={{ ...glass, padding: '16px 24px', textAlign: 'center', minWidth: 260 }}>
                <div style={{ fontSize: 13, color: '#64748b', marginBottom: 4 }}>Всего кликов</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: '#1e293b' }}>{formatNumber(state.totalClicks)}</div>
                {autoCoinsPerSec > 0 && (
                  <div style={{ fontSize: 13, color: '#10b981', marginTop: 4, fontWeight: 700 }}>
                    +{autoCoinsPerSec} монет/сек (авто)
                  </div>
                )}
              </div>

              {/* Active multiplier */}
              {state.activeMultiplier && (
                <div style={{
                  ...glass, padding: '14px 20px', width: '100%', maxWidth: 400,
                  background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#10b981', marginBottom: 4 }}>
                    🔥 Множитель x{state.activeMultiplier.multiplier} активен · Сила клика = {state.clickPower}
                  </div>
                  <div style={{ fontSize: 12, color: '#059669' }}>
                    Истекает: {new Date(state.activeMultiplier.expiresAt).toLocaleString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              )}

              {/* Medal */}
              {state.medal100k && (
                <div style={{
                  ...glass, padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <img src={MEDAL_100K_ICON} alt="" style={{ width: 40, height: 40, objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#f59e0b' }}>Медаль 100K</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Достигнуто 100 000 кликов!</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UPGRADES TAB */}
          {activeTab === 'upgrades' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={UPGRADES_SECTION_ICON} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.3)', margin: 0 }}>Улучшения</h2>
              </div>

              {/* Auto-clicker */}
              <div style={{ ...glass, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <img src={AUTO_CLICKER_ICON} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Авто-кликер</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Уровень {state.autoClickerLevel} / {AUTO_CLICKER_UPGRADES.length}
                      {autoCoinsPerSec > 0 && ` · ${autoCoinsPerSec} монет/сек`}
                    </div>
                  </div>
                </div>

                {/* Level bars */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {AUTO_CLICKER_UPGRADES.map(u => (
                    <div key={u.level} style={{
                      flex: 1, height: 6, borderRadius: 4,
                      background: state.autoClickerLevel >= u.level ? '#3b82f6' : '#e2e8f0',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>

                {nextAutoClicker ? (
                  <button
                    onClick={handleBuyAutoClicker}
                    disabled={state.coins < nextAutoClicker.cost}
                    style={{
                      width: '100%', padding: '12px 0', borderRadius: 14, border: 'none',
                      background: state.coins >= nextAutoClicker.cost ? '#3b82f6' : '#e2e8f0',
                      color: state.coins >= nextAutoClicker.cost ? '#fff' : '#94a3b8',
                      fontWeight: 800, fontSize: 15, cursor: state.coins >= nextAutoClicker.cost ? 'pointer' : 'not-allowed',
                      transition: 'all 0.2s',
                    }}
                  >
                    {nextAutoClicker.name} · {formatNumber(nextAutoClicker.cost)} монет
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 700 }}>✅ Максимальный уровень!</div>
                )}
              </div>

              {/* Active multiplier indicator */}
              {state.activeMultiplier && (
                <div style={{
                  ...glass, padding: '16px 20px',
                  background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: 15, color: '#10b981', marginBottom: 4 }}>
                    🔥 Множитель x{state.activeMultiplier.multiplier} активен · Сила клика = {state.clickPower}
                  </div>
                  <div style={{ fontSize: 12, color: '#059669' }}>
                    Истекает: {new Date(state.activeMultiplier.expiresAt).toLocaleString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              )}

              {/* Multipliers */}
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
                gap: 14,
              }}>
                {state.multipliers.map(mult => {
                  const isActive = state.activeMultiplier?.id === mult.id;
                  // ✅ ФИКС: убрана проверка hasActiveOther
                  const canBuy = state.coins >= mult.cost && !isActive;

                  return (
                    <div key={mult.id} style={{
                      ...glass,
                      padding: 18,
                      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                      border: isActive ? '2px solid rgba(16,185,129,0.4)' : '1.5px solid rgba(255,255,255,0.5)',
                      background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.82)',
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{mult.name}</div>
                        <div style={{ fontSize: 12, color: '#64748b', marginBottom: 10 }}>{mult.description}</div>
                        <button
                          onClick={() => handleBuyMultiplier(mult.id)}
                          disabled={!canBuy}
                          style={{
                            padding: '8px 18px', borderRadius: 12, border: 'none',
                            background: isActive
                              ? 'rgba(16,185,129,0.15)'
                              : canBuy
                                ? '#3b82f6'
                                : '#e2e8f0',
                            color: isActive
                              ? '#10b981'
                              : canBuy
                                ? '#fff'
                                : '#94a3b8',
                            fontWeight: 700, fontSize: 13,
                            cursor: canBuy ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s',
                          }}
                        >
                          {/* ✅ ФИКС: убран текст "другой активен" */}
                          {isActive
                            ? '✅ Активен'
                            : canBuy
                              ? `Купить · ${formatNumber(mult.cost)}`
                              : `Не хватает · ${formatNumber(mult.cost)}`}
                        </button>
                      </div>
                      <div style={{
                        padding: '6px 14px', borderRadius: 20,
                        background: isActive ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.1)',
                        fontSize: 18, fontWeight: 900,
                        color: isActive ? '#10b981' : '#3b82f6',
                        marginLeft: 12, whiteSpace: 'nowrap',
                      }}>
                        x{mult.multiplierValue}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GIFTS TAB */}
          {activeTab === 'gifts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={GIFTS_SECTION_ICON} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.3)', margin: 0 }}>Ежедневные подарки</h2>
              </div>

              <div style={{ ...glass, padding: 20 }}>
                <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
                  {DAILY_GIFTS.map(gift => {
                    const claimed = (state.claimedDays || []).includes(gift.day);
                    const isCurrent = gift.day === nextGiftDay;
                    return (
                      <div key={gift.day} style={{
                        flex: 1, borderRadius: 14,
                        border: isCurrent ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                        background: claimed
                          ? 'rgba(16,185,129,0.1)'
                          : isCurrent
                            ? 'rgba(59,130,246,0.07)'
                            : 'rgba(255,255,255,0.6)',
                        padding: '10px 6px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>День {gift.day}</div>
                        {gift.type === 'coins' ? (
                          <>
                            <img src={COIN_ICON} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
                            <div style={{ fontSize: 12, fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>{formatNumber(gift.reward)}</div>
                          </>
                        ) : (
                          <>
                            <img src={GOLDEN_SPIDI_ICON} alt="" style={{ width: 28, height: 28, objectFit: 'contain', borderRadius: 6 }} />
                            <div style={{ fontSize: 10, fontWeight: 700, color: '#f59e0b', marginTop: 2 }}>Золотой!</div>
                          </>
                        )}
                        {claimed && <div style={{ fontSize: 16, marginTop: 2 }}>✅</div>}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleClaimDailyGift}
                  disabled={!canClaimGift}
                  style={{
                    width: '100%', padding: '14px 0', borderRadius: 14, border: 'none',
                    background: canClaimGift
                      ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                      : '#e2e8f0',
                    color: canClaimGift ? '#fff' : '#94a3b8',
                    fontWeight: 800, fontSize: 16,
                    cursor: canClaimGift ? 'pointer' : 'not-allowed',
                    boxShadow: canClaimGift ? '0 4px 20px rgba(59,130,246,0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {canClaimGift
                    ? `🎁 Получить подарок (День ${nextGiftDay})`
                    : '✅ Подарок уже получен сегодня'}
                </button>
              </div>

              {/* Golden Spidi */}
              {state.hasGoldenSpidi && (
                <div style={{ ...glass, padding: 20, display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img src={GOLDEN_SPIDI_ICON} alt="" style={{ width: 56, height: 56, objectFit: 'contain', borderRadius: 12 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 16, color: '#f59e0b' }}>🏆 Золотой Спиди</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>Разблокирован! Зайди в Настройки → Кнопка клика</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={SETTINGS_SECTION_ICON} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.3)', margin: 0 }}>Настройки</h2>
              </div>

              {/* Music */}
              <div style={{ ...glass, padding: 20 }}>
                <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 16, marginBottom: 14, margin: '0 0 14px' }}>🎵 Музыка</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                  <span style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Фоновая музыка</span>
                  <button
                    onClick={() => {
                      const newEnabled = !state.musicEnabled;
                      setMusicEnabled(newEnabled);
                      setState(s => { const ns = { ...s, musicEnabled: newEnabled }; saveState(ns); return ns; });
                    }}
                    style={{
                      padding: '6px 18px', borderRadius: 20, border: 'none',
                      background: state.musicEnabled ? '#3b82f6' : '#e2e8f0',
                      color: state.musicEnabled ? '#fff' : '#64748b',
                      fontWeight: 700, fontSize: 13, cursor: 'pointer', transition: 'all 0.2s',
                    }}
                  >
                    {state.musicEnabled ? 'Вкл' : 'Выкл'}
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {trackNames.map((name, i) => (
                    <div key={i} onClick={() => handleTrackChange(i)} style={{
                      padding: '12px 16px', borderRadius: 14, cursor: 'pointer',
                      border: state.selectedTrack === i ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                      background: state.selectedTrack === i ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.6)',
                      display: 'flex', alignItems: 'center', gap: 10, transition: 'all 0.2s',
                    }}>
                      <span style={{ fontSize: 20 }}>{i === 0 ? '🎶' : '🎸'}</span>
                      <span style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>{name}</span>
                      {state.selectedTrack === i && <span style={{ marginLeft: 'auto', color: '#3b82f6', fontWeight: 700 }}>▶ Играет</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Wallpaper */}
              <div style={{ ...glass, padding: 20 }}>
                <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 16, margin: '0 0 14px' }}>🖼️ Обои</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginBottom: 10 }}>
                  {WALLPAPERS.map((wp, i) => (
                    <div key={i} onClick={() => setState(s => { const ns = { ...s, selectedWallpaper: i, customWallpaper: null }; saveState(ns); return ns; })} style={{
                      borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                      border: state.selectedWallpaper === i && state.selectedWallpaper !== -1 ? '3px solid #3b82f6' : '3px solid transparent',
                      transition: 'border 0.2s',
                    }}>
                      <img src={wp} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ))}
                </div>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  width: '100%', padding: '10px 0', borderRadius: 12, border: '2px dashed #cbd5e1',
                  background: state.selectedWallpaper === -1 ? 'rgba(59,130,246,0.07)' : 'transparent',
                  color: '#64748b', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                  📁 Своя картинка
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={e => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = ev => {
                    const url = ev.target?.result as string;
                    setState(s => { const ns = { ...s, customWallpaper: url, selectedWallpaper: -1 }; saveState(ns); return ns; });
                  };
                  reader.readAsDataURL(file);
                }} />
              </div>

              {/* Icon pack display */}
              <div style={{ ...glass, padding: 20 }}>
                <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 16, margin: '0 0 14px' }}>🎨 Пак иконок</h3>
                <div style={{
                  padding: '14px 16px', borderRadius: 14,
                  border: '2px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.07)',
                  display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <img src={NEW_PACK_BTN} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 10 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: 14 }}>NEW PACK ✨</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Активен</div>
                  </div>
                </div>
              </div>

              {/* Click button selector */}
              {state.hasGoldenSpidi && (
                <div style={{ ...glass, padding: 20 }}>
                  <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 16, margin: '0 0 14px' }}>🎯 Кнопка клика</h3>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['default', 'golden_spidi'] as const).map(btn => (
                      <div key={btn} onClick={() => setState(s => { const ns = { ...s, selectedClickButton: btn }; saveState(ns); return ns; })} style={{
                        flex: 1, borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                        border: state.selectedClickButton === btn ? '3px solid #f59e0b' : '3px solid transparent',
                        transition: 'border 0.2s',
                      }}>
                        <img src={CLICK_BUTTON_IMAGES[btn]} alt="" style={{ width: '100%', height: 80, objectFit: 'cover', display: 'block' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 12, textAlign: 'center' }}>
                    🏆 Разблокировано за 100К кликов или получение подарка "Золотой Спиди"
                  </div>
                </div>
              )}

              {/* Reset */}
              <div style={{ ...glass, padding: 20 }}>
                <h3 style={{ fontWeight: 800, color: '#ef4444', fontSize: 16, margin: '0 0 8px' }}>⚠️ Сброс прогресса</h3>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, margin: '0 0 16px' }}>
                  Сбросит весь прогресс и вернёт к начальной настройке.
                </p>
                <button onClick={onReset} style={{
                  width: '100%', padding: '12px 0', borderRadius: 12, border: 'none',
                  background: '#fee2e2', color: '#ef4444', fontWeight: 800, fontSize: 14,
                  cursor: 'pointer', transition: 'all 0.2s',
                }}>
                  Сбросить прогресс
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -80px) scale(0.7); }
        }
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
