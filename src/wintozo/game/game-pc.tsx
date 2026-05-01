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

  // ✅ ИСПРАВЛЕННАЯ ФУНКЦИЯ БЕЗ БЛОКИРОВКИ "ДРУГОЙ АКТИВЕН"
  const handleBuyMultiplier = (id: string) => {
    const mult = state.multipliers.find(m => m.id === id);
    if (!mult) return;
    if (mult.level >= mult.maxLevel) { showNotification('Уже активен!'); return; }
    if (state.coins < mult.cost) { showNotification('Недостаточно монет!'); return; }

    // ✅ УБРАНА проверка "другой активен" — теперь можно купить любой множитель!

    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
    const newClickPower = state.baseClickPower * mult.multiplierValue;

    setState(s => {
      const ns = {
        ...s,
        coins: s.coins - mult.cost,
        clickPower: newClickPower,
        activeMultiplier: {
          id: mult.id,
          multiplier: mult.multiplierValue,
          expiresAt,
        },
        multipliers: s.multipliers.map(m =>
          m.id === id ? { ...m, level: m.level + 1 } : m
        ),
      };
      saveState(ns);
      return ns;
    });
    showNotification(`✅ ${mult.name} активирован на 24 часа!`);
  };

  const handleBuyAutoClicker = () => {
    const next = getNextAutoClickerUpgrade(state.autoClickerLevel);
    if (!next) { showNotification('Максимальный уровень!'); return; }
    if (state.coins < next.cost) { showNotification('Недостаточно монет!'); return; }
    setState(s => {
      const ns = { ...s, coins: s.coins - next.cost, autoClickerLevel: next.level };
      saveState(ns);
      return ns;
    });
    showNotification(`✅ ${next.name} куплен!`);
  };

  const handleClaimDailyGift = () => {
    if (!canClaimDailyGift(state)) { showNotification('Уже получен сегодня!'); return; }
    const nextDay = getNextDay(state);
    const gift = DAILY_GIFTS.find(g => g.day === nextDay);
    if (!gift) return;
    if (state.claimedDays.includes(nextDay)) { showNotification('День уже получен!'); return; }

    setState(s => {
      const ns = {
        ...s,
        lastDailyGiftDate: new Date().toISOString(),
        dailyGiftDay: nextDay,
        claimedDays: [...s.claimedDays, nextDay],
      };
      if (gift.type === 'coins') {
        ns.coins = s.coins + gift.reward;
        showNotification(`🎁 +${formatNumber(gift.reward)} монет!`);
      } else {
        ns.hasGoldenSpidi = true;
        showNotification('🏆 Золотой Спиди разблокирован!');
      }
      saveState(ns);
      return ns;
    });
    setDailyGiftAnim(true);
    setTimeout(() => setDailyGiftAnim(false), 1500);
  };

  const handleTrackChange = (trackIndex: number) => {
    setTrack(trackIndex);
    setState(s => {
      const ns = { ...s, selectedTrack: trackIndex };
      saveState(ns);
      return ns;
    });
  };

  const autoCoinsPerSec = getAutoClickerCoinsPerSec(state.autoClickerLevel);
  const nextAutoClicker = getNextAutoClickerUpgrade(state.autoClickerLevel);
  const nextGiftDay = getNextDay(state);
  const canClaim = canClaimDailyGift(state);

  const clickButtonImage = state.selectedClickButton === 'golden_spidi'
    ? CLICK_BUTTON_IMAGES.golden_spidi
    : CLICK_BUTTON_IMAGES.default;

  const tabBtn = (tab: Tab, label: string, icon: string) => (
    <button onClick={() => setActiveTab(tab)} style={{
      flex: 1, padding: '14px 0', borderRadius: 16, border: 'none', cursor: 'pointer',
      background: activeTab === tab ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'rgba(255,255,255,0.85)',
      color: activeTab === tab ? '#fff' : '#333',
      fontWeight: 600, fontSize: 15, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      transition: 'all 0.3s', boxShadow: activeTab === tab ? '0 4px 15px rgba(102,126,234,0.4)' : '0 2px 8px rgba(0,0,0,0.1)',
    }}>
      <img src={icon} alt="" style={{ width: 28, height: 28, objectFit: 'contain' }} />
      {label}
    </button>
  );

  return (
    <div style={{
      minHeight: '100vh', width: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center',
      backgroundImage: `url(${currentBg})`, backgroundSize: 'cover', backgroundPosition: 'center',
      padding: 20, position: 'relative',
    }}>
      {notification && (
        <div style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff',
          padding: '12px 24px', borderRadius: 12, fontWeight: 600, fontSize: 15,
          boxShadow: '0 4px 20px rgba(0,0,0,0.3)', animation: 'slideDown 0.3s ease-out',
        }}>
          {notification}
        </div>
      )}

      {medal100kAnim && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9998,
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#fff',
          padding: '30px 50px', borderRadius: 20, fontWeight: 700, fontSize: 24, textAlign: 'center',
          boxShadow: '0 10px 40px rgba(0,0,0,0.5)', animation: 'popIn 0.5s ease-out',
        }}>
          🏅 Медаль 100K!<br />
          <span style={{ fontSize: 18, fontWeight: 500 }}>Золотой Спиди разблокирован!</span>
        </div>
      )}

      <div style={{
        width: '100%', maxWidth: 1200, background: 'rgba(255,255,255,0.95)', borderRadius: 24,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)', overflow: 'hidden', display: 'flex', flexDirection: 'column',
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '20px 30px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 15 }}>
            <img src={LOGO} alt="Spidi" style={{ width: 50, height: 50, borderRadius: 12 }} />
            <div>
              <div style={{ color: '#fff', fontSize: 24, fontWeight: 700 }}>Spidi Clicker</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 13 }}>v3.0</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 20, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={COIN_ICON} alt="" style={{ width: 32, height: 32 }} />
              <div style={{ color: '#fff', fontSize: 22, fontWeight: 700 }}>{formatNumber(state.coins)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <img src={CLICK_POWER_ICON} alt="" style={{ width: 28, height: 28 }} />
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 600 }}>{state.clickPower}</div>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div style={{ padding: '16px 30px', display: 'flex', gap: 10, borderBottom: '2px solid #e2e8f0' }}>
          {tabBtn('game', 'Игра', TAB_ICONS.game)}
          {tabBtn('upgrades', 'Улучшения', TAB_ICONS.upgrades)}
          {tabBtn('gifts', 'Подарки', TAB_ICONS.gifts)}
          {tabBtn('settings', 'Настройки', TAB_ICONS.settings)}
        </div>

        <div style={{ padding: 30, minHeight: 500, overflowY: 'auto' }}>
          
          {/* GAME TAB */}
          {activeTab === 'game' && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 30 }}>
              {/* Click animations container */}
              <div style={{ position: 'relative', width: 300, height: 300 }}>
                <button onMouseDown={handleClick} style={{
                  width: '100%', height: '100%', borderRadius: '50%', border: 'none', cursor: 'pointer',
                  backgroundImage: `url(${clickButtonImage})`, backgroundSize: 'cover', backgroundPosition: 'center',
                  transform: isClickBtnPressed ? 'scale(0.92)' : 'scale(1)',
                  transition: 'transform 0.1s', boxShadow: '0 10px 40px rgba(0,0,0,0.3)',
                }} />
                {clickAnimations.map(anim => (
                  <div key={anim.id} style={{
                    position: 'absolute', left: anim.x, top: anim.y, pointerEvents: 'none',
                    color: '#f59e0b', fontSize: 24, fontWeight: 700, animation: 'floatUp 0.8s ease-out',
                  }}>
                    +{anim.value}
                  </div>
                ))}
              </div>

              {/* Stats */}
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 5 }}>Всего кликов</div>
                <div style={{ fontSize: 28, fontWeight: 700, color: '#1e293b' }}>{formatNumber(state.totalClicks)}</div>
                {autoCoinsPerSec > 0 && (
                  <div style={{ fontSize: 13, color: '#10b981', marginTop: 5 }}>
                    +{autoCoinsPerSec} монет/сек (авто)
                  </div>
                )}
              </div>

              {/* Active multiplier */}
              {state.activeMultiplier && (
                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: 16,
                  padding: '16px 24px', color: '#fff', textAlign: 'center', width: '100%', maxWidth: 500,
                }}>
                  <div style={{ fontSize: 18, fontWeight: 700 }}>
                    🔥 Множитель x{state.activeMultiplier.multiplier} активен · Сила клика = {state.clickPower}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>
                    Истекает: {new Date(state.activeMultiplier.expiresAt).toLocaleString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              )}

              {/* Medal */}
              {state.medal100k && (
                <div style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', borderRadius: 16,
                  padding: '16px 24px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <img src={MEDAL_100K_ICON} alt="" style={{ width: 48, height: 48 }} />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>Медаль 100K</div>
                    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13 }}>Достигнуто 100 000 ��ликов!</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* UPGRADES TAB */}
          {activeTab === 'upgrades' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={UPGRADES_SECTION_ICON} alt="" style={{ width: 32, height: 32 }} />
                <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Улучшения</h2>
              </div>

              {/* Auto-clicker */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)',
                borderRadius: 16, padding: 20, border: '2px solid rgba(59,130,246,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                  <img src={AUTO_CLICKER_ICON} alt="" style={{ width: 48, height: 48 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 18, fontWeight: 700, color: '#1e293b' }}>Авто-кликер</div>
                    <div style={{ fontSize: 13, color: '#64748b' }}>
                      Уровень {state.autoClickerLevel} / {AUTO_CLICKER_UPGRADES.length}
                      {autoCoinsPerSec > 0 && ` · ${autoCoinsPerSec} монет/сек`}
                    </div>
                  </div>
                </div>

                {/* Level bars */}
                <div style={{ display: 'flex', gap: 4, marginBottom: 15 }}>
                  {AUTO_CLICKER_UPGRADES.map(u => (
                    <div key={u.level} style={{
                      flex: 1, height: 8, borderRadius: 4,
                      background: state.autoClickerLevel >= u.level ? '#3b82f6' : '#e2e8f0',
                      transition: 'background 0.3s',
                    }} />
                  ))}
                </div>

                {nextAutoClicker ? (
                  <button onClick={handleBuyAutoClicker} disabled={state.coins < nextAutoClicker.cost} style={{
                    width: '100%', padding: '12px 20px', borderRadius: 12, border: 'none',
                    background: state.coins >= nextAutoClicker.cost
                      ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)'
                      : '#cbd5e1',
                    color: '#fff', fontWeight: 600, fontSize: 15, cursor: state.coins >= nextAutoClicker.cost ? 'pointer' : 'not-allowed',
                    transition: 'all 0.2s',
                  }}>
                    {nextAutoClicker.name} · {formatNumber(nextAutoClicker.cost)} 🪙
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 600, fontSize: 15 }}>
                    ✅ Максимальный уровень!
                  </div>
                )}
              </div>

              {/* Active multiplier indicator */}
              {state.activeMultiplier && (
                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: 16,
                  padding: '16px 20px', color: '#fff',
                }}>
                  <div style={{ fontSize: 16, fontWeight: 700 }}>
                    🔥 Множитель x{state.activeMultiplier.multiplier} активен · Сила клика = {state.clickPower}
                  </div>
                  <div style={{ fontSize: 13, marginTop: 6, opacity: 0.9 }}>
                    Истекает: {new Date(state.activeMultiplier.expiresAt).toLocaleString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              )}

              {/* Multipliers */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: 15 }}>
                {state.multipliers.map(mult => {
                  const isActive = state.activeMultiplier?.id === mult.id;
                  const canBuy = state.coins >= mult.cost && !isActive;

                  return (
                    <div key={mult.id} style={{
                      background: isActive ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'rgba(255,255,255,0.9)',
                      borderRadius: 14, padding: 16, border: '2px solid ' + (isActive ? '#f5576c' : '#e2e8f0'),
                      display: 'flex', flexDirection: 'column', gap: 10,
                    }}>
                      <div style={{ flex: 1 }}>
                        <div style={{ fontSize: 16, fontWeight: 700, color: isActive ? '#fff' : '#1e293b' }}>{mult.name}</div>
                        <div style={{ fontSize: 13, color: isActive ? 'rgba(255,255,255,0.9)' : '#64748b', marginTop: 4 }}>{mult.description}</div>
                        <div style={{ fontSize: 24, fontWeight: 700, color: isActive ? '#fff' : '#3b82f6', marginTop: 8 }}>
                          x{mult.multiplierValue}
                        </div>
                      </div>
                      <button onClick={() => handleBuyMultiplier(mult.id)} disabled={!canBuy} style={{
                        padding: '10px 16px', borderRadius: 10, border: 'none',
                        background: canBuy ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#cbd5e1',
                        color: '#fff', fontWeight: 600, fontSize: 14,
                        cursor: canBuy ? 'pointer' : 'not-allowed', transition: 'all 0.2s',
                      }}>
                        {isActive ? '✅ Активен' : `Купить · ${formatNumber(mult.cost)} 🪙`}
                      </button>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GIFTS TAB */}
          {activeTab === 'gifts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={GIFTS_SECTION_ICON} alt="" style={{ width: 32, height: 32 }} />
                <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Ежедневные подарки</h2>
              </div>

              <div style={{
                display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 15,
              }}>
                  {DAILY_GIFTS.map(gift => {
                    const claimed = (state.claimedDays || []).includes(gift.day);
                    const isCurrent = gift.day === nextGiftDay;
                    return (
                      <div key={gift.day} onClick={() => isCurrent && canClaim && handleClaimDailyGift()} style={{
                        background: claimed ? 'rgba(16,185,129,0.1)' : isCurrent ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 'rgba(255,255,255,0.8)',
                        border: '2px solid ' + (claimed ? '#10b981' : isCurrent ? '#f59e0b' : '#e2e8f0'),
                        borderRadius: 14, padding: 20, textAlign: 'center', cursor: isCurrent && canClaim ? 'pointer' : 'default',
                        transition: 'all 0.2s', position: 'relative',
                      }}>
                        <div style={{ fontSize: 14, fontWeight: 600, color: isCurrent && !claimed ? '#fff' : '#64748b', marginBottom: 8 }}>День {gift.day}</div>
                        {gift.type === 'coins' ? (
                          <>
                            <div style={{ fontSize: 28, fontWeight: 700, color: isCurrent && !claimed ? '#fff' : '#1e293b' }}>{formatNumber(gift.reward)}</div>
                            <div style={{ fontSize: 13, color: isCurrent && !claimed ? 'rgba(255,255,255,0.9)' : '#64748b', marginTop: 4 }}>🪙</div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: 13, color: isCurrent && !claimed ? '#fff' : '#64748b' }}>Золотой!</div>
                            <div style={{ fontSize: 40, marginTop: 4 }}>🏆</div>
                          </>
                        )}
                        {claimed && <div style={{ fontSize: 32, position: 'absolute', top: 10, right: 10 }}>✅</div>}
                      </div>
                    );
                  })}
                </div>

              {/* Golden Spidi */}
              {state.hasGoldenSpidi && (
                <div style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', borderRadius: 16,
                  padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 15,
                }}>
                  <img src={GOLDEN_SPIDI_ICON} alt="" style={{ width: 64, height: 64, borderRadius: 12 }} />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 18 }}>🏆 Золотой Спиди</div>
                    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 14, marginTop: 4 }}>Разблокирован! Зайди в Настройки → Кнопка клика</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 25 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <img src={SETTINGS_SECTION_ICON} alt="" style={{ width: 32, height: 32 }} />
                <h2 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>Настройки</h2>
              </div>

              {/* Music */}
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>🎵 Музыка</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 15 }}>
                  <span style={{ fontSize: 14, color: '#64748b' }}>Фоновая музыка</span>
                  <label style={{ position: 'relative', display: 'inline-block', width: 50, height: 26 }}>
                    <input type="checkbox" checked={state.musicEnabled} onChange={e => {
                      const enabled = e.target.checked;
                      setMusicEnabled(enabled);
                      setState(s => { const ns = { ...s, musicEnabled: enabled }; saveState(ns); return ns; });
                    }} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      background: state.musicEnabled ? '#3b82f6' : '#cbd5e1', borderRadius: 26, transition: '0.3s',
                    }}>
                      <span style={{
                        position: 'absolute', height: 20, width: 20, left: state.musicEnabled ? 27 : 3, bottom: 3,
                        background: '#fff', borderRadius: '50%', transition: '0.3s',
                      }} />
                    </span>
                  </label>
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
                      <span style={{ flex: 1, fontWeight: 600, fontSize: 14 }}>{name}</span>
                      {state.selectedTrack === i && <span style={{ color: '#3b82f6', fontSize: 12 }}>▶ Играет</span>}
                    </div>
                  ))}
                </div>
              </div>

              {/* Wallpaper */}
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>🖼️ Обои</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 10 }}>
                  {WALLPAPERS.map((wp, i) => (
                    <div key={i} onClick={() => setState(s => { const ns = { ...s, selectedWallpaper: i, customWallpaper: null }; saveState(ns); return ns; })} style={{
                      borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                      border: state.selectedWallpaper === i && state.selectedWallpaper !== -1 ? '3px solid #3b82f6' : '3px solid transparent',
                      transition: 'border 0.2s',
                    }}>
                      <img src={wp} alt="" style={{ width: '100%', height: 100, objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  marginTop: 12, padding: '10px 20px', borderRadius: 10, border: '2px dashed #3b82f6',
                  background: 'transparent', color: '#3b82f6', fontWeight: 600, cursor: 'pointer', width: '100%',
                }}>
                  📁 Загрузить свои обои
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
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>🎨 Пак иконок</div>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.1) 100%)',
                  borderRadius: 14, padding: 16, border: '2px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <img src={NEW_PACK_BTN} alt="" style={{ width: 48, height: 48, borderRadius: 10 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 15, color: '#1e293b' }}>NEW PACK ✨</div>
                    <div style={{ fontSize: 13, color: '#10b981', marginTop: 2 }}>Активен</div>
                  </div>
                </div>
              </div>

              {/* Click button selector */}
              {state.hasGoldenSpidi && (
                <div>
                  <div style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>🎯 Кнопка клика</div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    {(['default', 'golden_spidi'] as const).map(btn => (
                      <div key={btn} onClick={() => setState(s => { const ns = { ...s, selectedClickButton: btn }; saveState(ns); return ns; })} style={{
                        flex: 1, borderRadius: 14, overflow: 'hidden', cursor: 'pointer',
                        border: state.selectedClickButton === btn ? '3px solid #f59e0b' : '3px solid transparent',
                        transition: 'border 0.2s',
                      }}>
                        <img src={CLICK_BUTTON_IMAGES[btn]} alt="" style={{ width: '100%', height: 150, objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 13, color: '#64748b', marginTop: 10, textAlign: 'center' }}>
                    🏆 Разблокировано за 100К кликов или получение подарка "Золотой Спиди"
                  </div>
                </div>
              )}

              {/* Reset */}
              <div style={{
                background: 'rgba(239,68,68,0.1)', borderRadius: 14, padding: 20, border: '2px solid rgba(239,68,68,0.3)',
              }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#dc2626', marginBottom: 10 }}>⚠️ Сброс прогресса</div>
                <div style={{ fontSize: 14, color: '#64748b', marginBottom: 15 }}>
                  Сбросит весь прогресс и вернёт к начальной настройке.
                </div>
                <button onClick={onReset} style={{
                  padding: '10px 20px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#fff', fontWeight: 600, cursor: 'pointer', width: '100%',
                }}>
                  🔄 Сбросить всё
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-80px); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -20px); }
          to { opacity: 1; transform: translate(-50%, 0); }
        }
        @keyframes popIn {
          0% { opacity: 0; transform: translate(-50%, -50%) scale(0.8); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1); }
        }
      `}</style>
    </div>
  );
}
