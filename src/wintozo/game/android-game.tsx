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
  upgrades: 'https://imgfy.ru/ib/8oDébZgUc1j5TuA_1776415600.webp',
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
          clickPower: s.baseClickPower
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

    const value = state.clickPower;

    setClickAnimations(prev => [...prev, { id, x, y, value }]);
    setTimeout(() => setClickAnimations(prev => prev.filter(a => a.id !== id)), 800);

    setIsClickBtnPressed(true);
    setTimeout(() => setIsClickBtnPressed(false), 100);

    setState(s => {
      return { ...s, coins: s.coins + s.clickPower, totalClicks: s.totalClicks + 1 };
    });
  }, [state.clickPower, setState]);

  // ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ — убрана блокировка "другой активен"
  const handleBuyMultiplier = (id: string) => {
    const mult = state.multipliers.find(m => m.id === id);
    if (!mult) return;
    if (mult.level >= mult.maxLevel) { showNotification('Уже активен!'); return; }
    if (state.coins < mult.cost) { showNotification('Недостаточно монет!'); return; }

    // Если уже активен этот же — не покупаем повторно
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
    showNotification(`✅ ${mult.name} активирован!`);
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
      showNotification('🎁 День 5: Золотой Спиди!');
    }
    newState.dailyGiftDay = nextDay;
    newState.lastDailyGiftDate = new Date().toISOString();
    newState.claimedDays = [...(state.claimedDays || []), nextDay];
    setState(newState);
  };

  const autoCoinsPerSec = getAutoClickerCoinsPerSec(state.autoClickerLevel);
  const nextAutoClicker = getNextAutoClickerUpgrade(state.autoClickerLevel);
  const canClaimGift = canClaimDailyGift(state);
  const nextGiftDay = getNextDay(state);

  const glass = {
    background: 'rgba(255,255,255,0.72)',
    borderRadius: 18,
    border: '1.5px solid rgba(255,255,255,0.5)',
    backdropFilter: 'blur(12px)',
    boxShadow: '0 4px 20px rgba(0,0,0,0.07)',
  };

  return (
    <div style={{
      minHeight: '100vh', width: '100%', maxWidth: 430, margin: '0 auto',
      backgroundImage: `url(${currentBg})`,
      backgroundSize: 'cover', backgroundPosition: 'center',
      display: 'flex', flexDirection: 'column', position: 'relative',
    }}>
      {/* Overlay */}
      <div style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15,23,42,0.45)', backdropFilter: 'blur(2px)', zIndex: 0,
      }} />

      {/* Notification */}
      {notification && (
        <div style={{
          position: 'fixed', top: 16, left: '50%', transform: 'translateX(-50%)',
          background: 'rgba(30,41,59,0.95)', color: '#fff', borderRadius: 14,
          padding: '10px 22px', fontSize: 13, fontWeight: 700, zIndex: 9999,
          boxShadow: '0 4px 20px rgba(0,0,0,0.2)', whiteSpace: 'nowrap',
        }}>
          {notification}
        </div>
      )}

      {/* Medal animation */}
      {medal100kAnim && (
        <div style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          pointerEvents: 'none',
        }}>
          <div style={{ ...glass, padding: '24px 36px', textAlign: 'center' }}>
            <img src={MEDAL_100K_ICON} alt="" style={{ width: 60, height: 60, objectFit: 'contain', marginBottom: 8 }} />
            <div style={{ fontSize: 18, fontWeight: 900, color: '#f59e0b' }}>🏅 100K кликов!</div>
          </div>
        </div>
      )}

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
        {/* Header */}
        <div style={{
          ...glass, margin: '12px 12px 0', padding: '10px 14px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <img src={LOGO} alt="Spidi Clicker" style={{ height: 32, objectFit: 'contain', borderRadius: 8 }} />
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src={COIN_ICON} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
              <span style={{ fontSize: 18, fontWeight: 900, color: '#f59e0b' }}>{formatNumber(state.coins)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <img src={CLICK_POWER_ICON} alt="" style={{ width: 18, height: 18, objectFit: 'contain' }} />
              <span style={{ fontSize: 12, fontWeight: 700, color: '#64748b' }}>x{state.clickPower}</span>
            </div>
          </div>
        </div>

        {/* Content */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 90px' }}>

          {/* GAME TAB */}
          {activeTab === 'game' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16 }}>
              <div style={{ fontSize: 13, color: '#fff', fontWeight: 700, opacity: 0.8 }}>
                Кликов: {formatNumber(state.totalClicks)}
                {autoCoinsPerSec > 0 && ` · +${autoCoinsPerSec}/сек`}
              </div>

              {/* Click button */}
              <div style={{ position: 'relative', display: 'inline-block' }}>
                <button
                  onTouchStart={handleClick}
                  onClick={handleClick}
                  style={{
                    background: 'none', border: 'none', cursor: 'pointer', padding: 0,
                    transform: isClickBtnPressed ? 'scale(0.93)' : 'scale(1)',
                    transition: 'transform 0.1s', borderRadius: '50%',
                    boxShadow: isClickBtnPressed
                      ? '0 4px 20px rgba(59,130,246,0.3)'
                      : '0 8px 40px rgba(59,130,246,0.25)',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  <img
                    src={state.selectedClickButton === 'golden_spidi'
                      ? CLICK_BUTTON_IMAGES.golden_spidi
                      : CLICK_BUTTON_IMAGES.default}
                    alt="Click!"
                    style={{ width: 180, height: 180, objectFit: 'contain', borderRadius: '50%', userSelect: 'none' }}
                    draggable={false}
                  />
                </button>
                {clickAnimations.map(anim => (
                  <div key={anim.id} style={{
                    position: 'absolute', left: anim.x, top: anim.y,
                    pointerEvents: 'none', fontWeight: 900, fontSize: 20, color: '#f59e0b',
                    textShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    animation: 'floatUp 0.8s ease forwards', whiteSpace: 'nowrap',
                  }}>
                    +{anim.value}
                  </div>
                ))}
              </div>

              {/* Active multiplier */}
              {state.activeMultiplier && (
                <div style={{
                  ...glass, padding: '12px 16px', width: '100%',
                  background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#10b981', marginBottom: 2 }}>
                    🔥 x{state.activeMultiplier.multiplier} · Клик = {state.clickPower}
                  </div>
                  <div style={{ fontSize: 11, color: '#059669' }}>
                    До: {new Date(state.activeMultiplier.expiresAt).toLocaleString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              )}

              {state.medal100k && (
                <div style={{ ...glass, padding: '10px 14px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <img src={MEDAL_100K_ICON} alt="" style={{ width: 32, height: 32, objectFit: 'contain' }} />
                  <div style={{ fontSize: 13, fontWeight: 800, color: '#f59e0b' }}>Медаль 100K 🏅</div>
                </div>
              )}
            </div>
          )}

          {/* UPGRADES TAB */}
          {activeTab === 'upgrades' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={UPGRADES_SECTION_ICON} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.3)', margin: 0 }}>Улучшения</h2>
              </div>

              {/* Auto-clicker */}
              <div style={{ ...glass, padding: 16 }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
                  <img src={AUTO_CLICKER_ICON} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b' }}>Авто-кликер</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Ур. {state.autoClickerLevel}/{AUTO_CLICKER_UPGRADES.length} · {autoCoinsPerSec}/сек</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                  {AUTO_CLICKER_UPGRADES.map(u => (
                    <div key={u.level} style={{
                      flex: 1, height: 5, borderRadius: 4,
                      background: state.autoClickerLevel >= u.level ? '#3b82f6' : '#e2e8f0',
                    }} />
                  ))}
                </div>
                {nextAutoClicker ? (
                  <button
                    onClick={handleBuyAutoClicker}
                    disabled={state.coins < nextAutoClicker.cost}
                    style={{
                      width: '100%', padding: '10px 0', borderRadius: 12, border: 'none',
                      background: state.coins >= nextAutoClicker.cost ? '#3b82f6' : '#e2e8f0',
                      color: state.coins >= nextAutoClicker.cost ? '#fff' : '#94a3b8',
                      fontWeight: 800, fontSize: 13,
                      cursor: state.coins >= nextAutoClicker.cost ? 'pointer' : 'not-allowed',
                    }}
                  >
                    {nextAutoClicker.name} · {formatNumber(nextAutoClicker.cost)} монет
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 700, fontSize: 13 }}>✅ Макс. уровень!</div>
                )}
              </div>

              {/* Active multiplier */}
              {state.activeMultiplier && (
                <div style={{
                  ...glass, padding: '14px 16px',
                  background: 'rgba(16,185,129,0.12)', border: '2px solid rgba(16,185,129,0.3)',
                }}>
                  <div style={{ fontWeight: 800, fontSize: 14, color: '#10b981', marginBottom: 2 }}>
                    🔥 x{state.activeMultiplier.multiplier} · Клик = {state.clickPower}
                  </div>
                  <div style={{ fontSize: 11, color: '#059669' }}>
                    До: {new Date(state.activeMultiplier.expiresAt).toLocaleString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              )}

              {/* Multipliers */}
              {state.multipliers.map(mult => {
                const isActive = state.activeMultiplier?.id === mult.id;
                // ✅ ФИКС: убрана проверка hasActiveOther — можно купить любой множитель
                const canBuy = state.coins >= mult.cost && !isActive;

                return (
                  <div key={mult.id} style={{
                    ...glass, padding: 14, marginBottom: 0,
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    border: isActive ? '2px solid rgba(16,185,129,0.4)' : '1.5px solid rgba(255,255,255,0.5)',
                    background: isActive ? 'rgba(16,185,129,0.08)' : 'rgba(255,255,255,0.85)',
                  }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontWeight: 800, fontSize: 14, color: '#1e293b', marginBottom: 3 }}>{mult.name}</div>
                      <div style={{ fontSize: 10, color: '#64748b', marginBottom: 8 }}>{mult.description}</div>
                      <button
                        onClick={() => handleBuyMultiplier(mult.id)}
                        disabled={!canBuy}
                        style={{
                          padding: '6px 14px', borderRadius: 10, border: 'none',
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
                          fontWeight: 700, fontSize: 12,
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
                    <span style={{
                      padding: '4px 10px', borderRadius: 16,
                      background: isActive ? 'rgba(16,185,129,0.2)' : 'rgba(59,130,246,0.1)',
                      fontSize: 13, fontWeight: 800,
                      color: isActive ? '#10b981' : '#3b82f6',
                      marginLeft: 8, whiteSpace: 'nowrap',
                    }}>
                      x{mult.multiplierValue}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

          {/* GIFTS TAB */}
          {activeTab === 'gifts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={GIFTS_SECTION_ICON} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.3)', margin: 0 }}>Подарки</h2>
              </div>

              <div style={{ ...glass, padding: 16 }}>
                <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
                  {DAILY_GIFTS.map(gift => {
                    const claimed = (state.claimedDays || []).includes(gift.day);
                    const isCurrent = gift.day === nextGiftDay;
                    return (
                      <div key={gift.day} style={{
                        flex: 1, borderRadius: 12,
                        border: isCurrent ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                        background: claimed
                          ? 'rgba(16,185,129,0.1)'
                          : isCurrent
                            ? 'rgba(59,130,246,0.07)'
                            : 'rgba(255,255,255,0.6)',
                        padding: '8px 4px', textAlign: 'center',
                      }}>
                        <div style={{ fontSize: 10, color: '#64748b', marginBottom: 3 }}>День {gift.day}</div>
                        {gift.type === 'coins' ? (
                          <>
                            <img src={COIN_ICON} alt="" style={{ width: 20, height: 20, objectFit: 'contain' }} />
                            <div style={{ fontSize: 10, fontWeight: 800, color: '#f59e0b', marginTop: 2 }}>{formatNumber(gift.reward)}</div>
                          </>
                        ) : (
                          <>
                            <img src={GOLDEN_SPIDI_ICON} alt="" style={{ width: 22, height: 22, objectFit: 'contain', borderRadius: 5 }} />
                            <div style={{ fontSize: 9, fontWeight: 700, color: '#f59e0b', marginTop: 2 }}>Золотой!</div>
                          </>
                        )}
                        {claimed && <div style={{ fontSize: 14 }}>✅</div>}
                      </div>
                    );
                  })}
                </div>

                <button
                  onClick={handleClaimDailyGift}
                  disabled={!canClaimGift}
                  style={{
                    width: '100%', padding: '13px 0', borderRadius: 12, border: 'none',
                    background: canClaimGift
                      ? 'linear-gradient(135deg, #3b82f6, #8b5cf6)'
                      : '#e2e8f0',
                    color: canClaimGift ? '#fff' : '#94a3b8',
                    fontWeight: 800, fontSize: 14,
                    cursor: canClaimGift ? 'pointer' : 'not-allowed',
                    boxShadow: canClaimGift ? '0 4px 16px rgba(59,130,246,0.3)' : 'none',
                    WebkitTapHighlightColor: 'transparent',
                  }}
                >
                  {canClaimGift ? `🎁 Получить (День ${nextGiftDay})` : '✅ Уже получен сегодня'}
                </button>
              </div>

              {state.hasGoldenSpidi && (
                <div style={{ ...glass, padding: 16, display: 'flex', alignItems: 'center', gap: 12 }}>
                  <img src={GOLDEN_SPIDI_ICON} alt="" style={{ width: 44, height: 44, objectFit: 'contain', borderRadius: 10 }} />
                  <div>
                    <div style={{ fontWeight: 800, fontSize: 14, color: '#f59e0b' }}>🏆 Золотой Спиди</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Настройки → Кнопка клика</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={SETTINGS_SECTION_ICON} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
                <h2 style={{ fontSize: 18, fontWeight: 900, color: '#fff', textShadow: '0 2px 8px rgba(0,0,0,0.3)', margin: 0 }}>Настройки</h2>
              </div>

              {/* Music */}
              <div style={{ ...glass, padding: 16 }}>
                <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 14, margin: '0 0 12px' }}>🎵 Музыка</h3>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                  <span style={{ fontWeight: 600, color: '#374151', fontSize: 13 }}>Фоновая музыка</span>
                  <button
                    onClick={() => {
                      const newEnabled = !state.musicEnabled;
                      setMusicEnabled(newEnabled);
                      setState(s => { const ns = { ...s, musicEnabled: newEnabled }; saveState(ns); return ns; });
                    }}
                    style={{
                      padding: '5px 14px', borderRadius: 16, border: 'none',
                      background: state.musicEnabled ? '#3b82f6' : '#e2e8f0',
                      color: state.musicEnabled ? '#fff' : '#64748b',
                      fontWeight: 700, fontSize: 12, cursor: 'pointer',
                    }}
                  >
                    {state.musicEnabled ? 'Вкл' : 'Выкл'}
                  </button>
                </div>
                {trackNames.map((name, i) => (
                  <div key={i} onClick={() => { setTrack(i); setState(s => { const ns = { ...s, selectedTrack: i }; saveState(ns); return ns; }); }} style={{
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
                <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 14, margin: '0 0 12px' }}>🖼️ Обои</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6, marginBottom: 8 }}>
                  {WALLPAPERS.map((wp, i) => (
                    <div key={i} onClick={() => setState(s => { const ns = { ...s, selectedWallpaper: i, customWallpaper: null }; saveState(ns); return ns; })} style={{
                      borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                      border: state.selectedWallpaper === i && state.selectedWallpaper !== -1 ? '3px solid #3b82f6' : '3px solid transparent',
                    }}>
                      <img src={wp} alt="" style={{ width: '100%', aspectRatio: '16/9', objectFit: 'cover', display: 'block' }} />
                    </div>
                  ))}
                </div>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  width: '100%', padding: '9px 0', borderRadius: 10, border: '2px dashed #cbd5e1',
                  background: state.selectedWallpaper === -1 ? 'rgba(59,130,246,0.07)' : 'transparent',
                  color: '#64748b', fontWeight: 600, fontSize: 12, cursor: 'pointer',
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

              {/* Icon pack */}
              <div style={{ ...glass, padding: 16 }}>
                <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 14, margin: '0 0 12px' }}>🎨 Пак иконок</h3>
                <div style={{
                  padding: '12px 14px', borderRadius: 12,
                  border: '2px solid rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.07)',
                  display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <img src={NEW_PACK_BTN} alt="" style={{ width: 32, height: 32, objectFit: 'contain', borderRadius: 8 }} />
                  <div>
                    <div style={{ fontWeight: 700, color: '#3b82f6', fontSize: 13 }}>NEW PACK ✨</div>
                    <div style={{ fontSize: 11, color: '#64748b' }}>Активен</div>
                  </div>
                </div>
              </div>

              {/* Click button selector */}
              {state.hasGoldenSpidi && (
                <div style={{ ...glass, padding: 16 }}>
                  <h3 style={{ fontWeight: 800, color: '#1e293b', fontSize: 14, margin: '0 0 12px' }}>🎯 Кнопка клика</h3>
                  <div style={{ display: 'flex', gap: 8 }}>
                    {(['default', 'golden_spidi'] as const).map(btn => (
                      <div key={btn} onClick={() => setState(s => { const ns = { ...s, selectedClickButton: btn }; saveState(ns); return ns; })} style={{
                        flex: 1, borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                        border: state.selectedClickButton === btn ? '3px solid #f59e0b' : '3px solid transparent',
                        transition: 'border 0.2s',
                      }}>
                        <img src={CLICK_BUTTON_IMAGES[btn]} alt="" style={{ width: '100%', height: 70, objectFit: 'cover', display: 'block' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 10, color: '#64748b', marginTop: 10, textAlign: 'center' }}>
                    🏆 За 100К кликов или подарок
                  </div>
                </div>
              )}

              {/* Reset */}
              <div style={{ ...glass, padding: 16 }}>
                <h3 style={{ fontWeight: 800, color: '#ef4444', fontSize: 14, margin: '0 0 8px' }}>⚠️ Сброс</h3>
                <p style={{ fontSize: 12, color: '#64748b', margin: '0 0 12px' }}>Сбросит весь прогресс.</p>
                <button onClick={onReset} style={{
                  width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
                  background: '#fee2e2', color: '#ef4444', fontWeight: 800, fontSize: 13,
                  cursor: 'pointer',
                }}>
                  Сбросить прогресс
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: 430,
          ...glass, borderRadius: '18px 18px 0 0',
          display: 'flex', justifyContent: 'space-around', padding: '8px 0 12px',
          zIndex: 100,
        }}>
          {([
            { tab: 'game', label: 'Игра', icon: TAB_ICONS.game },
            { tab: 'upgrades', label: 'Улучш.', icon: TAB_ICONS.upgrades },
            { tab: 'gifts', label: 'Подарки', icon: TAB_ICONS.gifts },
            { tab: 'settings', label: 'Настр.', icon: TAB_ICONS.settings },
          ] as const).map(({ tab, label, icon }) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3,
              padding: '6px 14px', borderRadius: 12, border: 'none', cursor: 'pointer',
              background: activeTab === tab ? 'rgba(59,130,246,0.13)' : 'transparent',
              color: activeTab === tab ? '#3b82f6' : '#64748b',
              fontWeight: activeTab === tab ? 800 : 600,
              fontSize: 10, transition: 'all 0.2s',
              WebkitTapHighlightColor: 'transparent',
            }}>
              <img src={icon} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translate(-50%, 0) scale(1); }
          100% { opacity: 0; transform: translate(-50%, -70px) scale(0.7); }
        }
      `}</style>
    </div>
  );
}
