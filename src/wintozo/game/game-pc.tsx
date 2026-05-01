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
  upgrades: 'https://imgfy.ru/ib/8oDebZgUc1j5TuA_1776415600.webp',
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
          clickPower: s.baseClickPower // Reset to base power
        }));
        showNotification('⏰ Множитель истёк, сила клика вернулась к ' + state.baseClickPower);
      }
    }
  }, [state.activeMultiplier, state.baseClickPower, setState, showNotification]);

  const handleClick = useCallback((e: React.MouseEvent) => {
    startAudioOnInteraction();
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const id = animIdRef.current++;
    
    const value = state.clickPower; // Just use clickPower directly

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

  const handleBuyMultiplier = (id: string) => {
    const mult = state.multipliers.find(m => m.id === id);
    if (!mult) return;
    if (mult.level >= mult.maxLevel) { showNotification('Уже активен!'); return; }
    if (state.coins < mult.cost) { showNotification('Недостаточно монет!'); return; }
    
    // Check if another multiplier is active
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
    showNotification(`✅ ${mult.name} активен! Сила клика = ${mult.multiplierValue}`);
  };

  const handleBuyAutoClicker = () => {
    const next = getNextAutoClickerUpgrade(state.autoClickerLevel);
    if (!next) { showNotification('Максимальный уровень автокликера!'); return; }
    if (state.coins < next.cost) { showNotification('Недостаточно монет!'); return; }
    setState(s => ({ ...s, coins: s.coins - next.cost, autoClickerLevel: next.level }));
    showNotification(`✅ ${next.name} куплен!`);
  };

  const handleClaimGift = () => {
    if (!canClaimDailyGift(state)) { showNotification('Подарок уже получен сегодня!'); return; }
    const day = getNextDay(state);
    const gift = DAILY_GIFTS.find(g => g.day === day);
    if (!gift) return;

    setDailyGiftAnim(true);
    setTimeout(() => setDailyGiftAnim(false), 1500);

    setState(s => {
      const newState = {
        ...s,
        dailyGiftDay: day,
        lastDailyGiftDate: new Date().toISOString(),
        claimedDays: [...s.claimedDays, day],
      };
      if (gift.type === 'coins') {
        newState.coins = s.coins + gift.reward;
        showNotification(`🎁 +${formatNumber(gift.reward)} монет!`);
      } else if (gift.type === 'golden_spidi') {
        newState.baseClickPower = s.baseClickPower + 50;
        newState.clickPower = s.activeMultiplier ? s.clickPower : s.baseClickPower + 50; // Keep multiplier if active
        newState.hasGoldenSpidi = true;
        showNotification('🌟 Золотой Спиди! +50 клик + разблокирована кнопка!');
      }
      return newState;
    });
  };

  const handleMusicToggle = () => {
    const newVal = !state.musicEnabled;
    setMusicEnabled(newVal);
    setState(s => { const ns = { ...s, musicEnabled: newVal }; saveState(ns); return ns; });
  };

  const handleTrackChange = (i: number) => {
    setTrack(i);
    setState(s => { const ns = { ...s, selectedTrack: i }; saveState(ns); return ns; });
  };

  const handleWallpaperChange = (i: number) => {
    setState(s => { const ns = { ...s, selectedWallpaper: i, customWallpaper: null }; saveState(ns); return ns; });
  };

  const handleCustomWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const url = ev.target?.result as string;
      setState(s => { const ns = { ...s, customWallpaper: url, selectedWallpaper: -1 }; saveState(ns); return ns; });
    };
    reader.readAsDataURL(file);
  };

  const autoCoinsPerSec = getAutoClickerCoinsPerSec(state.autoClickerLevel);
  const nextAutoClicker = getNextAutoClickerUpgrade(state.autoClickerLevel);
  const canClaimToday = canClaimDailyGift(state);
  const nextDay = getNextDay(state);

  const glass = {
    background: 'rgba(255,255,255,0.82)',
    backdropFilter: 'blur(20px)',
    borderRadius: 24,
    border: '1px solid rgba(255,255,255,0.7)',
    boxShadow: '0 8px 32px rgba(0,0,0,0.08)',
  } as React.CSSProperties;

  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundImage: `url(${currentBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
        fontFamily: 'Inter, sans-serif',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Background overlay */}
      <div style={{ position: 'fixed', inset: 0, background: 'rgba(248,250,255,0.18)', pointerEvents: 'none', zIndex: 0 }} />

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed',
          top: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 1000,
          padding: '12px 24px',
          borderRadius: 20,
          background: 'rgba(255,255,255,0.95)',
          backdropFilter: 'blur(16px)',
          boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
          fontSize: 14,
          fontWeight: 700,
          color: '#1e293b',
          animation: 'slideDown 0.3s ease',
          whiteSpace: 'nowrap',
        }}>
          {notification}
        </div>
      )}

      {/* Medal 100k popup */}
      {medal100kAnim && (
        <div style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          zIndex: 2000,
          textAlign: 'center',
          animation: 'bounceIn 0.5s ease',
        }}>
          <img src={MEDAL_100K_ICON} alt="Medal" style={{ width: 120, height: 120, objectFit: 'contain', filter: 'drop-shadow(0 0 20px gold)' }} />
          <p style={{ color: '#fff', fontSize: 22, fontWeight: 900, textShadow: '0 2px 8px rgba(0,0,0,0.5)', marginTop: 8 }}>Медаль 100K!</p>
        </div>
      )}

      {/* Header */}
      <header style={{
        position: 'relative',
        zIndex: 10,
        padding: '12px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        borderBottom: '1px solid rgba(255,255,255,0.6)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.06)',
      }}>
        <img src={LOGO} alt="Spidi Clicker" style={{ height: 48, width: 48, borderRadius: 12, objectFit: 'cover', boxShadow: '0 4px 12px rgba(59,130,246,0.25)' }} />

        {/* Coins display */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 20px',
          borderRadius: 20,
          background: 'rgba(59,130,246,0.1)',
          border: '1.5px solid rgba(59,130,246,0.2)',
        }}>
          <img src={COIN_ICON} alt="Coin" style={{ width: 28, height: 28, objectFit: 'contain' }} />
          <span style={{ fontWeight: 800, fontSize: 20, color: '#1e293b' }}>{formatNumber(state.coins)}</span>
        </div>

        {/* Stats */}
        <div style={{ display: 'flex', gap: 16 }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src={CLICK_POWER_ICON} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
              <span style={{ fontWeight: 800, color: '#3b82f6', fontSize: 16 }}>{state.clickPower}</span>
            </div>
            <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>Сила клика</p>
          </div>
          {state.autoClickerLevel > 0 && (
            <div style={{ textAlign: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <img src={AUTO_CLICKER_ICON} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                <span style={{ fontWeight: 800, color: '#10b981', fontSize: 16 }}>{autoCoinsPerSec}/с</span>
              </div>
              <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 1 }}>Авто</p>
            </div>
          )}
          {state.medal100k && (
            <img src={MEDAL_100K_ICON} alt="Medal" style={{ width: 32, height: 32, objectFit: 'contain', filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.2))' }} />
          )}
        </div>
      </header>

      {/* Main layout */}
      <div style={{ display: 'flex', flex: 1, position: 'relative', zIndex: 1 }}>

        {/* Sidebar */}
        <aside style={{
          width: 88,
          padding: '16px 8px',
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(20px)',
          borderRight: '1px solid rgba(255,255,255,0.5)',
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
                padding: '12px 4px',
                borderRadius: 16,
                border: 'none',
                background: activeTab === tab.id ? 'rgba(59,130,246,0.15)' : 'transparent',
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
                transition: 'all 0.2s',
                transform: activeTab === tab.id ? 'scale(1.05)' : 'scale(1)',
                outline: activeTab === tab.id ? '2px solid rgba(59,130,246,0.4)' : 'none',
              }}
            >
              <img src={tab.icon} alt={tab.label} style={{ width: 32, height: 32, objectFit: 'contain' }} />
              <span style={{ fontSize: 9, fontWeight: 700, color: activeTab === tab.id ? '#3b82f6' : '#64748b', letterSpacing: 0.3 }}>
                {tab.label}
              </span>
            </button>
          ))}
        </aside>

        {/* Content */}
        <main style={{ flex: 1, padding: 24, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* GAME TAB */}
          {activeTab === 'game' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 24 }}>
              {/* Click stats bar */}
              <div style={{ ...glass, padding: '16px 32px', display: 'flex', gap: 32, alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={CLICK_POWER_ICON} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                  <div>
                    <p style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Сила клика</p>
                    <p style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>{state.clickPower}</p>
                  </div>
                </div>
                <div style={{ width: 1, height: 40, background: '#e2e8f0' }} />
                <div>
                  <p style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Всего кликов</p>
                  <p style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>{formatNumber(state.totalClicks)}</p>
                </div>
                {state.autoClickerLevel > 0 && (
                  <>
                    <div style={{ width: 1, height: 40, background: '#e2e8f0' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <img src={AUTO_CLICKER_ICON} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                      <div>
                        <p style={{ fontSize: 11, color: '#64748b', fontWeight: 500 }}>Авто/сек</p>
                        <p style={{ fontSize: 22, fontWeight: 900, color: '#10b981' }}>+{autoCoinsPerSec}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {/* Click button */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={handleClick}
                  style={{
                    width: 220,
                    height: 220,
                    borderRadius: '50%',
                    border: 'none',
                    background: 'transparent',
                    cursor: 'pointer',
                    boxShadow: isClickBtnPressed
                      ? '0 4px 20px rgba(59,130,246,0.4)'
                      : '0 16px 48px rgba(59,130,246,0.45), 0 0 0 12px rgba(59,130,246,0.1)',
                    transform: isClickBtnPressed ? 'scale(0.93)' : 'scale(1)',
                    transition: 'transform 0.1s, box-shadow 0.1s',
                    padding: 0,
                    position: 'relative',
                    overflow: 'visible',
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

                  {/* Click animations */}
                  {clickAnimations.map(anim => (
                    <div
                      key={anim.id}
                      style={{
                        position: 'absolute',
                        left: anim.x,
                        top: anim.y,
                        transform: 'translate(-50%, -50%)',
                        color: '#fff',
                        fontWeight: 900,
                        fontSize: 18,
                        pointerEvents: 'none',
                        animation: 'floatUp 0.8s ease forwards',
                        zIndex: 10,
                        textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                      }}
                    >
                      +{anim.value}
                    </div>
                  ))}
                </button>

                {/* Pulse ring */}
                <div style={{
                  position: 'absolute',
                  inset: -8,
                  borderRadius: '50%',
                  border: '2px solid rgba(59,130,246,0.3)',
                  animation: 'pulse 2s infinite',
                  pointerEvents: 'none',
                }} />
              </div>

              {state.medal100k && (
                <div style={{ ...glass, padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                  <img src={MEDAL_100K_ICON} alt="Medal" style={{ width: 48, height: 48, objectFit: 'contain' }} />
                  <div>
                    <p style={{ fontWeight: 800, color: '#1e293b', fontSize: 16 }}>Медаль 100K</p>
                    <p style={{ fontSize: 12, color: '#64748b' }}>Вы сделали 100 000 кликов! 🎉</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UPGRADES TAB */}
          {activeTab === 'upgrades' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 4 }}>
                <img src={UPGRADES_SECTION_ICON} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>Улучшения Спиди</h2>
              </div>

              {/* Auto-clicker */}
              <div style={{ ...glass, padding: 20 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
                  <img src={AUTO_CLICKER_ICON} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                  <div>
                    <p style={{ fontWeight: 800, fontSize: 16, color: '#1e293b' }}>Авто-кликер</p>
                    <p style={{ fontSize: 12, color: '#64748b' }}>
                      Уровень {state.autoClickerLevel} / {AUTO_CLICKER_UPGRADES.length}
                      {autoCoinsPerSec > 0 && ` · ${autoCoinsPerSec} монет/сек`}
                    </p>
                  </div>
                </div>

                {/* Level bars */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 16 }}>
                  {AUTO_CLICKER_UPGRADES.map(u => (
                    <div key={u.level} style={{
                      flex: 1,
                      height: 6,
                      borderRadius: 3,
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
                      width: '100%',
                      padding: '12px',
                      borderRadius: 14,
                      border: 'none',
                      background: state.coins >= nextAutoClicker.cost
                        ? 'linear-gradient(135deg, #10b981, #059669)'
                        : '#e2e8f0',
                      color: state.coins >= nextAutoClicker.cost ? '#fff' : '#94a3b8',
                      fontWeight: 700,
                      fontSize: 14,
                      cursor: state.coins >= nextAutoClicker.cost ? 'pointer' : 'not-allowed',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: 8,
                      transition: 'all 0.2s',
                    }}
                  >
                    <img src={COIN_ICON} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                    Купить {nextAutoClicker.name} — {formatNumber(nextAutoClicker.cost)}
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', color: '#3b82f6', fontWeight: 700, fontSize: 14 }}>✅ Максимальный уровень!</div>
                )}
              </div>

              {/* Active multiplier indicator */}
              {state.activeMultiplier && (
                <div style={{ ...glass, padding: '16px 20px', background: 'rgba(16,185,129,0.1)', border: '2px solid rgba(16,185,129,0.3)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div>
                      <p style={{ fontWeight: 800, fontSize: 15, color: '#10b981', marginBottom: 4 }}>
                        🔥 Множитель x{state.activeMultiplier.multiplier} активен · Сила клика = {state.clickPower}
                      </p>
                      <p style={{ fontSize: 12, color: '#059669' }}>
                        Истекает: {new Date(state.activeMultiplier.expiresAt).toLocaleString('ru-RU', { 
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
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 14 }}>
                {state.multipliers.map(mult => {
                  const isActive = state.activeMultiplier?.id === mult.id;
                  const hasActiveOther = state.activeMultiplier && state.activeMultiplier.id !== mult.id;
                  const canBuy = state.coins >= mult.cost && !isActive && !hasActiveOther;
                  
                  return (
                    <div key={mult.id} style={{ 
                      ...glass, 
                      padding: 18,
                      border: isActive ? '2px solid rgba(16,185,129,0.4)' : '1px solid rgba(255,255,255,0.7)',
                      background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.82)',
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                        <div>
                          <p style={{ fontWeight: 800, fontSize: 15, color: '#1e293b', marginBottom: 4 }}>{mult.name}</p>
                          <p style={{ fontSize: 12, color: '#64748b' }}>{mult.description}</p>
                        </div>
                        <div style={{
                          padding: '4px 10px',
                          borderRadius: 20,
                          background: isActive ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.1)',
                          fontSize: 12,
                          fontWeight: 700,
                          color: isActive ? '#10b981' : '#3b82f6',
                        }}>
                          x{mult.multiplierValue}
                        </div>
                      </div>
                      
                      <button
                        onClick={() => handleBuyMultiplier(mult.id)}
                        disabled={!canBuy}
                        style={{
                          width: '100%',
                          padding: '10px',
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
                          transition: 'all 0.2s',
                        }}
                      >
                        {isActive ? (
                          '✅ Активен'
                        ) : hasActiveOther ? (
                          '⏳ Недоступно'
                        ) : (
                          <>
                            <img src={COIN_ICON} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
                            {formatNumber(mult.cost)}
                          </>
                        )}
                      </button>
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
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>Ежедневные подарки</h2>
              </div>

              {/* Daily streak */}
              <div style={{ ...glass, padding: 20 }}>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16, fontWeight: 500 }}>
                  {canClaimToday ? '🎁 Подарок доступен! Забери его сегодня.' : '⏳ Следующий подарок завтра.'}
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 10 }}>
                  {DAILY_GIFTS.map((gift) => {
                    const isCurrent = nextDay === gift.day && canClaimToday;
                    const isClaimed = state.claimedDays.includes(gift.day);
                    return (
                      <div
                        key={gift.day}
                        style={{
                          padding: '16px 8px',
                          borderRadius: 16,
                          background: isClaimed
                            ? 'rgba(16,185,129,0.1)'
                            : isCurrent
                              ? 'rgba(59,130,246,0.1)'
                              : 'rgba(241,245,249,0.8)',
                          border: isCurrent
                            ? '2px solid rgba(59,130,246,0.4)'
                            : isClaimed
                              ? '2px solid rgba(16,185,129,0.3)'
                              : '2px solid transparent',
                          textAlign: 'center',
                          animation: isCurrent && dailyGiftAnim ? 'bounceIn 0.5s ease' : 'none',
                          transition: 'all 0.3s',
                        }}
                      >
                        <p style={{ fontSize: 11, fontWeight: 700, color: '#64748b', marginBottom: 8 }}>День {gift.day}</p>
                        {gift.type === 'golden_spidi' ? (
                          <img src={GOLDEN_SPIDI_ICON} alt="Golden Spidi" style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: '50%', margin: '0 auto 8px' }} />
                        ) : (
                          <img src={COIN_ICON} alt="Coins" style={{ width: 36, height: 36, objectFit: 'contain', margin: '0 auto 8px', display: 'block' }} />
                        )}
                        <p style={{ fontSize: 12, fontWeight: 800, color: '#1e293b' }}>
                          {gift.type === 'coins' ? `+${formatNumber(gift.reward)}` : '+50 💪'}
                        </p>
                        {isClaimed && <p style={{ fontSize: 10, color: '#10b981', marginTop: 4, fontWeight: 700 }}>✓ Получено</p>}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleClaimGift}
                  disabled={!canClaimToday}
                  style={{
                    width: '100%',
                    marginTop: 20,
                    padding: '16px',
                    borderRadius: 16,
                    border: 'none',
                    background: canClaimToday
                      ? 'linear-gradient(135deg, #f59e0b, #d97706)'
                      : '#e2e8f0',
                    color: canClaimToday ? '#fff' : '#94a3b8',
                    fontWeight: 800,
                    fontSize: 16,
                    cursor: canClaimToday ? 'pointer' : 'not-allowed',
                    boxShadow: canClaimToday ? '0 8px 24px rgba(245,158,11,0.3)' : 'none',
                    transition: 'all 0.2s',
                  }}
                >
                  {canClaimToday ? '🎁 Получить подарок!' : '⏰ Уже получено сегодня'}
                </button>
              </div>
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <img src={SETTINGS_SECTION_ICON} alt="" style={{ width: 36, height: 36, objectFit: 'contain' }} />
                <h2 style={{ fontSize: 22, fontWeight: 900, color: '#1e293b' }}>Настройки</h2>
              </div>

              {/* Music */}
              <div style={{ ...glass, padding: 20 }}>
                <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 16, marginBottom: 14 }}>🎵 Музыка</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                  <span style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>Фоновая музыка</span>
                  <button
                    onClick={handleMusicToggle}
                    style={{
                      width: 52,
                      height: 28,
                      borderRadius: 14,
                      background: state.musicEnabled ? '#3b82f6' : '#cbd5e1',
                      border: 'none',
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.3s',
                    }}
                  >
                    <span style={{
                      position: 'absolute',
                      top: 3,
                      left: state.musicEnabled ? 26 : 3,
                      width: 22,
                      height: 22,
                      borderRadius: '50%',
                      background: '#fff',
                      transition: 'left 0.3s',
                      boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    }} />
                  </button>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {trackNames.map((name, i) => (
                    <div
                      key={i}
                      onClick={() => handleTrackChange(i)}
                      style={{
                        padding: '12px 16px',
                        borderRadius: 14,
                        border: state.selectedTrack === i ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                        background: state.selectedTrack === i ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        transition: 'all 0.2s',
                      }}
                    >
                      <span style={{ fontSize: 20 }}>{i === 0 ? '🎶' : '🎸'}</span>
                      <span style={{ fontWeight: 600, color: '#374151', fontSize: 14 }}>{name}</span>
                      {state.selectedTrack === i && <span style={{ marginLeft: 'auto', color: '#3b82f6', fontWeight: 700 }}>▶ Играет</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Wallpaper */}
              <div style={{ ...glass, padding: 20 }}>
                <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 16, marginBottom: 14 }}>🖼️ Обои</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
                  {WALLPAPERS.map((wp, i) => (
                    <button
                      key={i}
                      onClick={() => handleWallpaperChange(i)}
                      style={{
                        aspectRatio: '16/9',
                        borderRadius: 12,
                        overflow: 'hidden',
                        border: state.selectedWallpaper === i && !state.customWallpaper ? '3px solid #3b82f6' : '2px solid transparent',
                        cursor: 'pointer',
                        padding: 0,
                        transition: 'all 0.2s',
                        transform: state.selectedWallpaper === i && !state.customWallpaper ? 'scale(1.05)' : 'scale(1)',
                      }}
                    >
                      <img src={wp} alt={`Обои ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    </button>
                  ))}
                  {/* Custom wallpaper button */}
                  <button
                    onClick={() => fileInputRef.current?.click()}
                    style={{
                      aspectRatio: '16/9',
                      borderRadius: 12,
                      border: state.selectedWallpaper === -1 ? '3px solid #3b82f6' : '2px dashed #94a3b8',
                      background: state.customWallpaper && state.selectedWallpaper === -1
                        ? `url(${state.customWallpaper}) center/cover`
                        : 'rgba(241,245,249,0.8)',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexDirection: 'column',
                      gap: 4,
                      transition: 'all 0.2s',
                    }}
                  >
                    {!state.customWallpaper && (
                      <>
                        <span style={{ fontSize: 20 }}>+</span>
                        <span style={{ fontSize: 9, color: '#64748b' }}>Своё фото</span>
                      </>
                    )}
                  </button>
                </div>
                <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCustomWallpaper} />
              </div>

              {/* Icon pack display */}
              <div style={{ ...glass, padding: 20 }}>
                <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 16, marginBottom: 14 }}>🎨 Пак иконок</h3>
                <div style={{
                  padding: '14px 16px',
                  borderRadius: 14,
                  border: '2px solid rgba(59,130,246,0.3)',
                  background: 'rgba(59,130,246,0.07)',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                }}>
                  <img src={NEW_PACK_BTN} alt="" style={{ width: 40, height: 40, objectFit: 'contain', borderRadius: 10 }} />
                  <div>
                    <p style={{ fontWeight: 700, color: '#3b82f6', fontSize: 14 }}>NEW PACK ✨</p>
                    <p style={{ fontSize: 12, color: '#64748b' }}>Активен</p>
                  </div>
                </div>
              </div>

              {/* Click button selector */}
              {state.hasGoldenSpidi && (
                <div style={{ ...glass, padding: 20 }}>
                  <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 16, marginBottom: 14 }}>🎯 Кнопка клика</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <button
                      onClick={() => setState(s => { const ns = { ...s, selectedClickButton: 'default' as const }; saveState(ns); return ns; })}
                      style={{
                        padding: '16px 12px',
                        borderRadius: 14,
                        border: state.selectedClickButton === 'default' ? '2.5px solid #3b82f6' : '2px solid #e2e8f0',
                        background: state.selectedClickButton === 'default' ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <img src={CLICK_BUTTON_IMAGES.default} alt="Default" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <p style={{ fontWeight: 700, color: state.selectedClickButton === 'default' ? '#3b82f6' : '#374151', fontSize: 13 }}>Обычная</p>
                        {state.selectedClickButton === 'default' && <p style={{ fontSize: 10, color: '#3b82f6', marginTop: 2 }}>✓ Активна</p>}
                      </div>
                    </button>
                    
                    <button
                      onClick={() => setState(s => { const ns = { ...s, selectedClickButton: 'golden_spidi' as const }; saveState(ns); return ns; })}
                      style={{
                        padding: '16px 12px',
                        borderRadius: 14,
                        border: state.selectedClickButton === 'golden_spidi' ? '2.5px solid #f59e0b' : '2px solid #e2e8f0',
                        background: state.selectedClickButton === 'golden_spidi' ? 'rgba(245,158,11,0.08)' : 'rgba(255,255,255,0.6)',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 10,
                      }}
                    >
                      <img src={CLICK_BUTTON_IMAGES.golden_spidi} alt="Golden Spidi" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover' }} />
                      <div>
                        <p style={{ fontWeight: 700, color: state.selectedClickButton === 'golden_spidi' ? '#f59e0b' : '#374151', fontSize: 13 }}>Золотой Спиди</p>
                        {state.selectedClickButton === 'golden_spidi' && <p style={{ fontSize: 10, color: '#f59e0b', marginTop: 2 }}>✓ Активна</p>}
                      </div>
                    </button>
                  </div>
                  <p style={{ fontSize: 11, color: '#64748b', marginTop: 12, textAlign: 'center' }}>
                    🏆 Разблокировано за 100К кликов или получение подарка "Золотой Спиди"
                  </p>
                </div>
              )}

              {/* Reset */}
              <div style={{ ...glass, padding: 20 }}>
                <h3 style={{ fontWeight: 800, color: '#ef4444', fontSize: 16, marginBottom: 8 }}>⚠️ Сброс прогресса</h3>
                <p style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
                  Сбросит весь прогресс и вернёт к начальной настройке.
                </p>
                <button
                  onClick={onReset}
                  style={{
                    padding: '12px 24px',
                    borderRadius: 14,
                    border: '2px solid rgba(239,68,68,0.3)',
                    background: 'rgba(239,68,68,0.08)',
                    color: '#ef4444',
                    fontWeight: 700,
                    fontSize: 14,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onMouseOver={e => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.15)';
                  }}
                  onMouseOut={e => {
                    e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                  }}
                >
                  🗑️ Сбросить всё
                </button>
              </div>
            </div>
          )}
        </main>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, -50%); }
          100% { opacity: 0; transform: translate(-50%, -150%); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.4; transform: scale(1); }
          50% { opacity: 0.8; transform: scale(1.05); }
        }
        @keyframes bounceIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.15); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-12px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
      `}</style>
    </div>
  );
}
