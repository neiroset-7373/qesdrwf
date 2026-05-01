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
const NEW_PACK_BTN = 'https://imgfy.ru/ib/cFgAkQjlmXFzaGI_1776967380.webp';

const TAB_ICONS = {
  game: 'https://imgfy.ru/ib/T4OFpSB3pas5OvI_1776415599.webp',
  upgrades: 'https://imgfy.ru/ib/8oDebZgUc1j5TuA_1776415600.webp',
  gifts: 'https://imgfy.ru/ib/WqGTQErBrSV3lF8_1776970865.webp',
  settings: 'https://imgfy.ru/ib/e8UA077eHGqRZ7u_1776415599.webp',
};

type Tab = 'game' | 'upgrades' | 'gifts' | 'settings';

interface AndroidGameProps {
  state: GameState;
  setState: React.Dispatch<React.SetStateAction<GameState>>;
  onReset: () => void;
}

export default function AndroidGame({ state, setState, onReset }: AndroidGameProps) {
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

  useEffect(() => {
    saveRef.current = setInterval(() => {
      setState(s => { saveState(s); return s; });
    }, 5000);
    return () => { if (saveRef.current) clearInterval(saveRef.current); };
  }, [setState]);

  useEffect(() => {
    if (!state.medal100k && state.totalClicks >= 100000) {
      setState(s => ({ ...s, medal100k: true, hasGoldenSpidi: true }));
      setMedal100kAnim(true);
      showNotification('🏅 100K + Золотой Спиди!');
      setTimeout(() => setMedal100kAnim(false), 3000);
    }
  }, [state.totalClicks, state.medal100k, setState, showNotification]);

  useEffect(() => {
    if (state.activeMultiplier) {
      const now = new Date();
      const expires = new Date(state.activeMultiplier.expiresAt);
      if (now >= expires) {
        setState(s => ({ 
          ...s, 
          activeMultiplier: null,
          clickPower: s.baseClickPower // Reset to base
        }));
        showNotification('⏰ Истёк, клик = ' + state.baseClickPower);
      }
    }
  }, [state.activeMultiplier, state.baseClickPower, setState, showNotification]);

  const handleClick = useCallback((e: React.TouchEvent | React.MouseEvent) => {
    startAudioOnInteraction();
    e.preventDefault();
    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    let x: number, y: number;
    if ('touches' in e && e.touches.length > 0) {
      x = e.touches[0].clientX - rect.left;
      y = e.touches[0].clientY - rect.top;
    } else {
      x = (e as React.MouseEvent).clientX - rect.left;
      y = (e as React.MouseEvent).clientY - rect.top;
    }
    const id = animIdRef.current++;

    const value = state.clickPower; // Just use clickPower directly

    setClickAnimations(prev => [...prev, { id, x, y, value }]);
    setTimeout(() => setClickAnimations(prev => prev.filter(a => a.id !== id)), 800);

    setIsClickBtnPressed(true);
    setTimeout(() => setIsClickBtnPressed(false), 100);

    setState(s => {
      return { ...s, coins: s.coins + s.clickPower, totalClicks: s.totalClicks + 1 };
    });
  }, [state.clickPower, setState]);

  const handleBuyMultiplier = (id: string) => {
    const mult = state.multipliers.find(m => m.id === id);
    if (!mult) return;
    if (mult.level >= mult.maxLevel) { showNotification('Уже активен!'); return; }
    if (state.coins < mult.cost) { showNotification('Недостаточно монет!'); return; }
    
    if (state.activeMultiplier) {
      showNotification('⚠️ Другой множитель активен!');
      return;
    }

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    setState(s => ({
      ...s,
      coins: s.coins - mult.cost,
      clickPower: mult.multiplierValue, // SET click power to multiplier value
      activeMultiplier: {
        id: mult.id,
        multiplier: mult.multiplierValue,
        expiresAt,
      },
      multipliers: s.multipliers.map(m =>
        m.id === id ? { ...m, level: 1, purchased: true } : m
      ),
    }));
    showNotification(`✅ Сила клика = ${mult.multiplierValue}!`);
  };

  const handleBuyAutoClicker = () => {
    const next = getNextAutoClickerUpgrade(state.autoClickerLevel);
    if (!next) { showNotification('Максимальный уровень!'); return; }
    if (state.coins < next.cost) { showNotification('Недостаточно монет!'); return; }
    setState(s => ({ ...s, coins: s.coins - next.cost, autoClickerLevel: next.level }));
    showNotification(`✅ ${next.name} куплен!`);
  };

  const handleClaimGift = () => {
    if (!canClaimDailyGift(state)) { showNotification('Подарок уже получен!'); return; }
    const day = getNextDay(state);
    const gift = DAILY_GIFTS.find(g => g.day === day);
    if (!gift) return;

    setDailyGiftAnim(true);
    setTimeout(() => setDailyGiftAnim(false), 1500);

    setState(s => {
      const ns = { ...s, dailyGiftDay: day, lastDailyGiftDate: new Date().toISOString(), claimedDays: [...s.claimedDays, day] };
      if (gift.type === 'coins') {
        ns.coins = s.coins + gift.reward;
        showNotification(`🎁 +${formatNumber(gift.reward)} монет!`);
      } else {
        ns.baseClickPower = s.baseClickPower + 50;
        ns.clickPower = s.activeMultiplier ? s.clickPower : s.baseClickPower + 50; // Keep multiplier if active
        ns.hasGoldenSpidi = true;
        showNotification('🌟 Золотой Спиди! +50 + кнопка!');
      }
      return ns;
    });
  };

  const autoCoinsPerSec = getAutoClickerCoinsPerSec(state.autoClickerLevel);
  const nextAutoClicker = getNextAutoClickerUpgrade(state.autoClickerLevel);
  const canClaimToday = canClaimDailyGift(state);
  const nextDay = getNextDay(state);

  const glass: React.CSSProperties = {
    background: 'rgba(255,255,255,0.85)',
    backdropFilter: 'blur(20px)',
    borderRadius: 20,
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
  };

  return (
    <div style={{
      minHeight: '100vh',
      backgroundImage: `url(${currentBg})`,
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      fontFamily: 'Inter, sans-serif',
      display: 'flex',
      flexDirection: 'column',
      position: 'relative',
      overflowX: 'hidden',
    }}>
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(248,250,255,0.15)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: 16,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          padding: '10px 20px',
          borderRadius: 16,
          background: 'rgba(255,255,255,0.97)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 6px 24px rgba(0,0,0,0.15)',
          fontSize: 13,
          fontWeight: 700,
          color: '#1e293b',
          animation: 'slideDown 0.3s ease',
          whiteSpace: 'nowrap',
          maxWidth: '90vw',
        }}>
          {notification}
        </div>
      )}

      {/* Medal 100k */}
      {medal100kAnim && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2000,
          textAlign: 'center',
          animation: 'bounceIn 0.5s ease',
          pointerEvents: 'none',
        }}>
          <img src={MEDAL_100K_ICON} alt="Medal" style={{ width: 100, height: 100, objectFit: 'contain', filter: 'drop-shadow(0 0 16px gold)' }} />
          <p style={{ color: '#fff', fontSize: 20, fontWeight: 900, textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginTop: 6 }}>100K!</p>
        </div>
      )}

      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '10px 16px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.88)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.5)',
        boxShadow: '0 2px 12px rgba(0,0,0,0.06)',
      }}>
        <img src={LOGO} alt="Logo" style={{ width: 40, height: 40, borderRadius: 10, objectFit: 'cover' }} />
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '7px 14px', borderRadius: 16, background: 'rgba(59,130,246,0.1)' }}>
          <img src={COIN_ICON} alt="Coin" style={{ width: 22, height: 22, objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 17, color: '#1e293b' }}>{formatNumber(state.coins)}</span>
        </div>
      </header>

      {/* Content area */}
      <div style={{ flex: 1, position: 'relative', zIndex: 1, overflowY: 'auto', paddingBottom: 80 }}>

        {/* GAME TAB */}
        {activeTab === 'game' && (
          <div style={{ padding: 16, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
            {/* Stats row */}
            <div style={{ ...glass, padding: '12px 20px', width: '100%', display: 'flex', justifyContent: 'space-around' }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                  <img src={CLICK_POWER_ICON} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                  <span style={{ fontWeight: 800, color: '#3b82f6', fontSize: 18 }}>{state.clickPower}</span>
                </div>
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Сила клика</p>
              </div>
              <div style={{ width: 1, background: '#e2e8f0' }} />
              <div style={{ textAlign: 'center' }}>
                <span style={{ fontWeight: 800, color: '#1e293b', fontSize: 18 }}>{formatNumber(state.totalClicks)}</span>
                <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Кликов</p>
              </div>
              {state.autoClickerLevel > 0 && (
                <>
                  <div style={{ width: 1, background: '#e2e8f0' }} />
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, justifyContent: 'center' }}>
                      <img src={AUTO_CLICKER_ICON} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                      <span style={{ fontWeight: 800, color: '#10b981', fontSize: 18 }}>{autoCoinsPerSec}/с</span>
                    </div>
                    <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>Авто</p>
                  </div>
                </>
              )}
            </div>

            {/* Click button */}
            <div style={{ position: 'relative', marginTop: 8 }}>
              <button
                onTouchStart={handleClick}
                onClick={handleClick}
                style={{
                  width: 200,
                  height: 200,
                  borderRadius: '50%',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  boxShadow: isClickBtnPressed
                    ? '0 4px 16px rgba(59,130,246,0.4)'
                    : '0 12px 40px rgba(59,130,246,0.45), 0 0 0 10px rgba(59,130,246,0.1)',
                  transform: isClickBtnPressed ? 'scale(0.91)' : 'scale(1)',
                  transition: 'transform 0.1s, box-shadow 0.1s',
                  padding: 0,
                  position: 'relative',
                  overflow: 'visible',
                  WebkitTapHighlightColor: 'transparent',
                  userSelect: 'none',
                }}
                >
                <img 
                  src={CLICK_BUTTON_IMAGES[state.selectedClickButton]} 
                  alt="Click" 
                  style={{ 
                    width: '100%', 
                    height: '100%', 
                    objectFit: 'cover',
                    borderRadius: '50%',
                    pointerEvents: 'none'
                  }} 
                />

                {clickAnimations.map(anim => (
                  <div key={anim.id} style={{
                    position: 'absolute',
                    left: anim.x,
                    top: anim.y,
                    transform: 'translate(-50%, -50%)',
                    color: '#fff',
                    fontWeight: 900,
                    fontSize: 16,
                    pointerEvents: 'none',
                    animation: 'floatUp 0.8s ease forwards',
                    zIndex: 10,
                    textShadow: '0 2px 6px rgba(0,0,0,0.3)',
                  }}>
                    +{anim.value}
                  </div>
                ))}
              </button>
              <div style={{
                position: 'absolute',
                inset: -6,
                borderRadius: '50%',
                border: '2px solid rgba(59,130,246,0.25)',
                animation: 'pulse 2s infinite',
                pointerEvents: 'none',
              }} />
            </div>

            {state.medal100k && (
              <div style={{ ...glass, padding: '12px 16px', width: '100%', display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={MEDAL_100K_ICON} alt="Medal" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <div>
                  <p style={{ fontWeight: 800, color: '#1e293b', fontSize: 13 }}>Медаль 100K 🏅</p>
                  <p style={{ fontSize: 11, color: '#64748b' }}>100 000 кликов!</p>
                </div>
              </div>
            )}
          </div>
        )}

        {/* UPGRADES TAB */}
        {activeTab === 'upgrades' && (
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 4px' }}>
              <img src={UPGRADES_SECTION_ICON} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1e293b' }}>Улучшения</h2>
            </div>

            {/* Auto-clicker */}
            <div style={{ ...glass, padding: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                <img src={AUTO_CLICKER_ICON} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                <div>
                  <p style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Авто-кликер</p>
                  <p style={{ fontSize: 11, color: '#64748b' }}>Ур. {state.autoClickerLevel}/{AUTO_CLICKER_UPGRADES.length} · {autoCoinsPerSec}/сек</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {AUTO_CLICKER_UPGRADES.map(u => (
                  <div key={u.level} style={{
                    flex: 1, height: 5, borderRadius: 3,
                    background: u.level <= state.autoClickerLevel ? '#3b82f6' : '#e2e8f0',
                    transition: 'background 0.3s',
                  }} />
                ))}
              </div>
              {nextAutoClicker ? (
                <button
                  onClick={handleBuyAutoClicker}
                  disabled={state.coins < nextAutoClicker.cost}
                  style={{
                    width: '100%', padding: '11px', borderRadius: 12, border: 'none',
                    background: state.coins >= nextAutoClicker.cost ? 'linear-gradient(135deg, #10b981, #059669)' : '#e2e8f0',
                    color: state.coins >= nextAutoClicker.cost ? '#fff' : '#94a3b8',
                    fontWeight: 700, fontSize: 13, cursor: state.coins >= nextAutoClicker.cost ? 'pointer' : 'not-allowed',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                  }}
                >
                  <img src={COIN_ICON} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                  {nextAutoClicker.name} — {formatNumber(nextAutoClicker.cost)}
                </button>
              ) : (
                <p style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 700, fontSize: 13 }}>✅ Макс. уровень!</p>
              )}
            </div>

            {/* Active multiplier indicator */}
            {state.activeMultiplier && (
              <div style={{ ...glass, padding: '14px 16px', background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 14, color: '#10b981', marginBottom: 2 }}>
                      🔥 x{state.activeMultiplier.multiplier} · Клик = {state.clickPower}
                    </p>
                    <p style={{ fontSize: 11, color: '#059669' }}>
                      До: {new Date(state.activeMultiplier.expiresAt).toLocaleString('ru-RU', { 
                        day: 'numeric', 
                        month: 'short', 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {/* Multipliers */}
            {state.multipliers.map(mult => {
              const isActive = state.activeMultiplier?.id === mult.id;
              const hasActiveOther = state.activeMultiplier && state.activeMultiplier.id !== mult.id;
              const canBuy = state.coins >= mult.cost && !isActive && !hasActiveOther;
              
              return (
                <div key={mult.id} style={{ 
                  ...glass, 
                  padding: 14,
                  border: isActive ? '2px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.7)',
                  background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.85)',
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 3 }}>{mult.name}</p>
                      <p style={{ fontSize: 10, color: '#64748b' }}>{mult.description}</p>
                    </div>
                    <span style={{ 
                      padding: '4px 10px', 
                      borderRadius: 16, 
                      background: isActive ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.1)', 
                      fontSize: 13, 
                      fontWeight: 800, 
                      color: isActive ? '#10b981' : '#3b82f6',
                      marginLeft: 8,
                      whiteSpace: 'nowrap',
                    }}>
                      x{mult.multiplierValue}
                    </span>
                  </div>
                  
                  <button
                    onClick={() => handleBuyMultiplier(mult.id)}
                    disabled={!canBuy}
                    style={{
                      width: '100%', 
                      padding: '11px', 
                      borderRadius: 12, 
                      border: 'none',
                      background: isActive
                        ? 'rgba(16,185,129,0.15)'
                        : canBuy
                          ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                          : '#f1f5f9',
                      color: isActive
                        ? '#10b981'
                        : canBuy ? '#fff' : '#94a3b8',
                      fontWeight: 700, 
                      fontSize: 13,
                      cursor: canBuy ? 'pointer' : 'not-allowed',
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'center', 
                      gap: 6,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    {isActive ? (
                      '✅ Активен'
                    ) : hasActiveOther ? (
                      '⏳ Другой активен'
                    ) : (
                      <>
                        <img src={COIN_ICON} alt="" style={{ width: 16, height: 16, objectFit: 'contain' }} />
                        {formatNumber(mult.cost)}
                      </>
                    )}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* GIFTS TAB */}
        {activeTab === 'gifts' && (
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={GIFTS_SECTION_ICON} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1e293b' }}>Подарки</h2>
            </div>

            <div style={{ ...glass, padding: 16 }}>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12, fontWeight: 500 }}>
                {canClaimToday ? '🎁 Подарок доступен!' : '⏳ Следующий подарок завтра.'}
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 6, marginBottom: 16 }}>
                {DAILY_GIFTS.map(gift => {
                  const isCurrent = nextDay === gift.day && canClaimToday;
                  const isClaimed = state.claimedDays.includes(gift.day);
                  return (
                    <div key={gift.day} style={{
                      padding: '10px 4px',
                      borderRadius: 12,
                      background: isClaimed ? 'rgba(16,185,129,0.1)' : isCurrent ? 'rgba(59,130,246,0.1)' : 'rgba(241,245,249,0.8)',
                      border: isCurrent ? '2px solid rgba(59,130,246,0.4)' : isClaimed ? '2px solid rgba(16,185,129,0.3)' : '2px solid transparent',
                      textAlign: 'center',
                      animation: isCurrent && dailyGiftAnim ? 'bounceIn 0.5s' : 'none',
                    }}>
                      <p style={{ fontSize: 9, fontWeight: 700, color: '#64748b', marginBottom: 4 }}>День {gift.day}</p>
                      {gift.type === 'golden_spidi' ? (
                        <img src={GOLDEN_SPIDI_ICON} alt="" style={{ width: 28, height: 28, objectFit: 'cover', borderRadius: '50%', margin: '0 auto 4px', display: 'block' }} />
                      ) : (
                        <img src={COIN_ICON} alt="" style={{ width: 24, height: 24, objectFit: 'contain', margin: '0 auto 4px', display: 'block' }} />
                      )}
                      <p style={{ fontSize: 9, fontWeight: 800, color: '#1e293b' }}>
                        {gift.type === 'coins' ? `+${formatNumber(gift.reward)}` : '+50💪'}
                      </p>
                      {isClaimed && <p style={{ fontSize: 8, color: '#10b981', fontWeight: 700 }}>✓</p>}
                    </div>
                  );
                })}
              </div>

              <button
                onClick={handleClaimGift}
                disabled={!canClaimToday}
                style={{
                  width: '100%', padding: '14px', borderRadius: 14, border: 'none',
                  background: canClaimToday ? 'linear-gradient(135deg, #f59e0b, #d97706)' : '#e2e8f0',
                  color: canClaimToday ? '#fff' : '#94a3b8',
                  fontWeight: 800, fontSize: 15, cursor: canClaimToday ? 'pointer' : 'not-allowed',
                  boxShadow: canClaimToday ? '0 6px 20px rgba(245,158,11,0.3)' : 'none',
                  WebkitTapHighlightColor: 'transparent',
                }}
              >
                {canClaimToday ? '🎁 Получить!' : '⏰ Уже получено'}
              </button>
            </div>
          </div>
        )}

        {/* SETTINGS TAB */}
        {activeTab === 'settings' && (
          <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={SETTINGS_SECTION_ICON} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
              <h2 style={{ fontSize: 18, fontWeight: 900, color: '#1e293b' }}>Настройки</h2>
            </div>

            {/* Music */}
            <div style={{ ...glass, padding: 16 }}>
              <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 14, marginBottom: 12 }}>🎵 Музыка</h3>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                <span style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>Фоновая музыка</span>
                <button onClick={() => {
                  const newVal = !state.musicEnabled;
                  setMusicEnabled(newVal);
                  setState(s => { const ns = { ...s, musicEnabled: newVal }; saveState(ns); return ns; });
                }} style={{
                  width: 46, height: 24, borderRadius: 12,
                  background: state.musicEnabled ? '#3b82f6' : '#cbd5e1',
                  border: 'none', cursor: 'pointer', position: 'relative', transition: 'background 0.3s',
                }}>
                  <span style={{
                    position: 'absolute', top: 2,
                    left: state.musicEnabled ? 22 : 2,
                    width: 20, height: 20, borderRadius: '50%', background: '#fff',
                    transition: 'left 0.3s', boxShadow: '0 2px 4px rgba(0,0,0,0.15)',
                  }} />
                </button>
              </div>
              {trackNames.map((name, i) => (
                <div key={i} onClick={() => { setTrack(i); setState(s => { const ns = { ...s, selectedTrack: i }; saveState(ns); return ns; }); }}
                  style={{
                    padding: '10px 12px', borderRadius: 12, marginBottom: 6,
                    border: state.selectedTrack === i ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                    background: state.selectedTrack === i ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                  <span style={{ fontSize: 18 }}>{i === 0 ? '🎶' : '🎸'}</span>
                  <span style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>{name}</span>
                  {state.selectedTrack === i && <span style={{ marginLeft: 'auto', color: '#3b82f6', fontWeight: 700, fontSize: 12 }}>▶</span>}
                </div>
              ))}
            </div>

            {/* Wallpapers */}
            <div style={{ ...glass, padding: 16 }}>
              <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 14, marginBottom: 12 }}>🖼️ Обои</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {WALLPAPERS.map((wp, i) => (
                  <button key={i} onClick={() => setState(s => { const ns = { ...s, selectedWallpaper: i, customWallpaper: null }; saveState(ns); return ns; })}
                    style={{
                      aspectRatio: '16/9', borderRadius: 10, overflow: 'hidden',
                      border: state.selectedWallpaper === i && !state.customWallpaper ? '2.5px solid #3b82f6' : '2px solid transparent',
                      cursor: 'pointer', padding: 0,
                      transform: state.selectedWallpaper === i && !state.customWallpaper ? 'scale(1.04)' : 'scale(1)',
                      transition: 'all 0.2s',
                    }}>
                    <img src={wp} alt={`Обои ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </button>
                ))}
                <button onClick={() => fileInputRef.current?.click()}
                  style={{
                    aspectRatio: '16/9', borderRadius: 10,
                    border: state.selectedWallpaper === -1 ? '2.5px solid #3b82f6' : '2px dashed #94a3b8',
                    background: state.customWallpaper && state.selectedWallpaper === -1
                      ? `url(${state.customWallpaper}) center/cover` : 'rgba(241,245,249,0.8)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 2,
                  }}>
                  {!state.customWallpaper && <>
                    <span style={{ fontSize: 16 }}>+</span>
                    <span style={{ fontSize: 8, color: '#64748b' }}>Своё</span>
                  </>}
                </button>
              </div>
              <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={(e) => {
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

            {/* Icon pack */}
            <div style={{ ...glass, padding: 16 }}>
              <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 14, marginBottom: 12 }}>🎨 Пак иконок</h3>
              <div style={{
                padding: '12px 14px', borderRadius: 12,
                border: '2px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.07)',
                display: 'flex', alignItems: 'center', gap: 10,
              }}>
                <img src={NEW_PACK_BTN} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }} />
                <div>
                  <p style={{ fontWeight: 700, color: '#3b82f6', fontSize: 13 }}>NEW PACK ✨</p>
                  <p style={{ fontSize: 11, color: '#64748b' }}>Активен</p>
                </div>
              </div>
            </div>

            {/* Click button selector */}
            {state.hasGoldenSpidi && (
              <div style={{ ...glass, padding: 16 }}>
                <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 14, marginBottom: 12 }}>🎯 Кнопка клика</h3>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setState(s => { const ns = { ...s, selectedClickButton: 'default' as const }; saveState(ns); return ns; })}
                    style={{
                      flex: 1,
                      padding: '14px 10px',
                      borderRadius: 12,
                      border: state.selectedClickButton === 'default' ? '2.5px solid #3b82f6' : '2px solid #e2e8f0',
                      background: state.selectedClickButton === 'default' ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <img src={CLICK_BUTTON_IMAGES.default} alt="Default" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                    <p style={{ fontWeight: 700, color: state.selectedClickButton === 'default' ? '#3b82f6' : '#374151', fontSize: 12 }}>Обычная</p>
                    {state.selectedClickButton === 'default' && <p style={{ fontSize: 9, color: '#3b82f6' }}>✓</p>}
                  </button>
                  
                  <button
                    onClick={() => setState(s => { const ns = { ...s, selectedClickButton: 'golden_spidi' as const }; saveState(ns); return ns; })}
                    style={{
                      flex: 1,
                      padding: '14px 10px',
                      borderRadius: 12,
                      border: state.selectedClickButton === 'golden_spidi' ? '2.5px solid #f59e0b' : '2px solid #e2e8f0',
                      background: state.selectedClickButton === 'golden_spidi' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.6)',
                      cursor: 'pointer',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 8,
                      WebkitTapHighlightColor: 'transparent',
                    }}
                  >
                    <img src={CLICK_BUTTON_IMAGES.golden_spidi} alt="Golden" style={{ width: 56, height: 56, borderRadius: '50%', objectFit: 'cover' }} />
                    <p style={{ fontWeight: 700, color: state.selectedClickButton === 'golden_spidi' ? '#f59e0b' : '#374151', fontSize: 12 }}>Золотой</p>
                    {state.selectedClickButton === 'golden_spidi' && <p style={{ fontSize: 9, color: '#f59e0b' }}>✓</p>}
                  </button>
                </div>
                <p style={{ fontSize: 10, color: '#64748b', marginTop: 10, textAlign: 'center' }}>
                  🏆 За 100К кликов или подарок
                </p>
              </div>
            )}

            {/* Reset */}
            <div style={{ ...glass, padding: 16 }}>
              <h3 style={{ fontWeight: 800, color: '#ef4444', fontSize: 14, marginBottom: 8 }}>⚠️ Сброс</h3>
              <p style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Сбросит весь прогресс.</p>
              <button onClick={onReset} style={{
                padding: '11px 20px', borderRadius: 12, border: '2px solid rgba(239,68,68,0.3)',
                background: 'rgba(239,68,68,0.08)', color: '#ef4444', fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
                🗑️ Сбросить всё
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Bottom navigation */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(255,255,255,0.92)',
        backdropFilter: 'blur(20px)',
        borderTop: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '0 -4px 20px rgba(0,0,0,0.08)',
        display: 'flex',
        padding: '6px 0 env(safe-area-inset-bottom, 6px)',
      }}>
        {([
          { id: 'game', label: 'ИГРА', icon: TAB_ICONS.game },
          { id: 'upgrades', label: 'УЛУЧШ.', icon: TAB_ICONS.upgrades },
          { id: 'gifts', label: 'ПОДАРКИ', icon: TAB_ICONS.gifts },
          { id: 'settings', label: 'НАСТР.', icon: TAB_ICONS.settings },
        ] as const).map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            style={{
              flex: 1,
              padding: '8px 4px',
              border: 'none',
              background: 'none',
              cursor: 'pointer',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 3,
              WebkitTapHighlightColor: 'transparent',
            }}
          >
            <div style={{
              width: 36,
              height: 36,
              borderRadius: 12,
              background: activeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              transition: 'background 0.2s',
            }}>
              <img src={tab.icon} alt={tab.label} style={{ width: 24, height: 24, objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 700, color: activeTab === tab.id ? '#3b82f6' : '#94a3b8', letterSpacing: 0.3 }}>
              {tab.label}
            </span>
          </button>
        ))}
      </nav>

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%); }
          100% { opacity: 0; transform: translate(-50%, -150%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.6; transform: scale(1.04); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
