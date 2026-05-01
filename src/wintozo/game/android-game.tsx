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
    showNotification(`✅ ${mult.name} активирован!`);
  };

  const handleBuyAutoClicker = () => {
    const next = getNextAutoClickerUpgrade(state.autoClickerLevel);
    if (!next) { showNotification('Макс. уровень!'); return; }
    if (state.coins < next.cost) { showNotification('Недостаточно монет!'); return; }
    setState(s => {
      const ns = { ...s, coins: s.coins - next.cost, autoClickerLevel: next.level };
      saveState(ns);
      return ns;
    });
    showNotification(`✅ ${next.name}!`);
  };

  const handleClaimDailyGift = () => {
    if (!canClaimDailyGift(state)) { showNotification('Уже получен!'); return; }
    const nextDay = getNextDay(state);
    const gift = DAILY_GIFTS.find(g => g.day === nextDay);
    if (!gift) return;
    if (state.claimedDays.includes(nextDay)) { showNotification('Уже получен!'); return; }

    setState(s => {
      const ns = {
        ...s,
        lastDailyGiftDate: new Date().toISOString(),
        dailyGiftDay: nextDay,
        claimedDays: [...s.claimedDays, nextDay],
      };
      if (gift.type === 'coins') {
        ns.coins = s.coins + gift.reward;
        showNotification(`🎁 +${formatNumber(gift.reward)}!`);
      } else {
        ns.hasGoldenSpidi = true;
        showNotification('🏆 Золотой Спиди!');
      }
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

  return (
    <div style={{
      minHeight: '100vh', width: '100%', display: 'flex', flexDirection: 'column',
      backgroundImage: `url(${currentBg})`, backgroundSize: 'cover', backgroundPosition: 'center',
      position: 'relative',
    }}>
      {notification && (
        <div style={{
          position: 'fixed', top: 10, left: '50%', transform: 'translateX(-50%)', zIndex: 9999,
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff',
          padding: '10px 20px', borderRadius: 10, fontWeight: 600, fontSize: 13,
          boxShadow: '0 4px 15px rgba(0,0,0,0.3)', animation: 'slideDown 0.3s',
        }}>
          {notification}
        </div>
      )}

      {medal100kAnim && (
        <div style={{
          position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', zIndex: 9998,
          background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', color: '#fff',
          padding: '24px 40px', borderRadius: 16, fontWeight: 700, fontSize: 20, textAlign: 'center',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)', animation: 'popIn 0.5s',
        }}>
          🏅 100K!<br />
          <span style={{ fontSize: 15, fontWeight: 500 }}>Золотой Спиди разблокирован!</span>
        </div>
      )}

      <div style={{
        flex: 1, display: 'flex', flexDirection: 'column', background: 'rgba(255,255,255,0.95)',
        paddingBottom: 70,
      }}>
        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: '12px 16px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <img src={LOGO} alt="" style={{ width: 40, height: 40, borderRadius: 10 }} />
            <div>
              <div style={{ color: '#fff', fontSize: 18, fontWeight: 700 }}>Spidi Clicker</div>
              <div style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11 }}>v3.0</div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src={COIN_ICON} alt="" style={{ width: 24, height: 24 }} />
              <div style={{ color: '#fff', fontSize: 16, fontWeight: 700 }}>{formatNumber(state.coins)}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <img src={CLICK_POWER_ICON} alt="" style={{ width: 22, height: 22 }} />
              <div style={{ color: '#fff', fontSize: 14, fontWeight: 600 }}>{state.clickPower}</div>
            </div>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 16 }}>

          {/* GAME TAB */}
          {activeTab === 'game' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ textAlign: 'center', fontSize: 14, color: '#64748b' }}>
                Кликов: {formatNumber(state.totalClicks)}
                {autoCoinsPerSec > 0 && ` · +${autoCoinsPerSec}/сек`}
              </div>

              {/* Click button */}
              <div style={{ position: 'relative', width: '100%', maxWidth: 300, margin: '0 auto' }}>
                <button onTouchStart={handleClick} onMouseDown={handleClick} style={{
                  width: '100%', aspectRatio: '1', borderRadius: '50%', border: 'none',
                  backgroundImage: `url(${clickButtonImage})`, backgroundSize: 'cover', backgroundPosition: 'center',
                  transform: isClickBtnPressed ? 'scale(0.92)' : 'scale(1)',
                  transition: 'transform 0.1s', boxShadow: '0 8px 30px rgba(0,0,0,0.3)', cursor: 'pointer',
                }} />
                {clickAnimations.map(anim => (
                  <div key={anim.id} style={{
                    position: 'absolute', left: anim.x, top: anim.y, pointerEvents: 'none',
                    color: '#f59e0b', fontSize: 20, fontWeight: 700, animation: 'floatUp 0.8s',
                  }}>
                    +{anim.value}
                  </div>
                ))}
              </div>

              {/* Active multiplier */}
              {state.activeMultiplier && (
                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: 14,
                  padding: '14px 18px', color: '#fff', textAlign: 'center',
                }}>
                  <div style={{ fontSize: 15, fontWeight: 700 }}>
                    🔥 x{state.activeMultiplier.multiplier} · Клик = {state.clickPower}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 5, opacity: 0.9 }}>
                    До: {new Date(state.activeMultiplier.expiresAt).toLocaleString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              )}

              {state.medal100k && (
                <div style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', borderRadius: 14,
                  padding: '12px 16px', textAlign: 'center', color: '#fff', fontWeight: 700, fontSize: 14,
                }}>
                  Медаль 100K 🏅
                </div>
              )}
            </div>
          )}

          {/* UPGRADES TAB */}
          {activeTab === 'upgrades' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={UPGRADES_SECTION_ICON} alt="" style={{ width: 28, height: 28 }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Улучшения</h2>
              </div>

              {/* Auto-clicker */}
              <div style={{
                background: 'linear-gradient(135deg, rgba(59,130,246,0.1) 0%, rgba(139,92,246,0.1) 100%)',
                borderRadius: 14, padding: 16, border: '2px solid rgba(59,130,246,0.2)',
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <img src={AUTO_CLICKER_ICON} alt="" style={{ width: 40, height: 40 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 700 }}>Авто-кликер</div>
                    <div style={{ fontSize: 12, color: '#64748b' }}>Ур. {state.autoClickerLevel}/{AUTO_CLICKER_UPGRADES.length} · {autoCoinsPerSec}/сек</div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 3, marginBottom: 12 }}>
                  {AUTO_CLICKER_UPGRADES.map(u => (
                    <div key={u.level} style={{
                      flex: 1, height: 6, borderRadius: 3,
                      background: state.autoClickerLevel >= u.level ? '#3b82f6' : '#e2e8f0',
                    }} />
                  ))}
                </div>
                {nextAutoClicker ? (
                  <button onClick={handleBuyAutoClicker} disabled={state.coins < nextAutoClicker.cost} style={{
                    width: '100%', padding: '10px', borderRadius: 10, border: 'none',
                    background: state.coins >= nextAutoClicker.cost ? 'linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%)' : '#cbd5e1',
                    color: '#fff', fontWeight: 600, fontSize: 13, cursor: state.coins >= nextAutoClicker.cost ? 'pointer' : 'not-allowed',
                  }}>
                    {nextAutoClicker.name} · {formatNumber(nextAutoClicker.cost)} 🪙
                  </button>
                ) : (
                  <div style={{ textAlign: 'center', color: '#10b981', fontWeight: 600, fontSize: 13 }}>✅ Макс. уровень!</div>
                )}
              </div>

              {/* Active multiplier */}
              {state.activeMultiplier && (
                <div style={{
                  background: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)', borderRadius: 14,
                  padding: '14px 16px', color: '#fff',
                }}>
                  <div style={{ fontSize: 14, fontWeight: 700 }}>
                    🔥 x{state.activeMultiplier.multiplier} · Клик = {state.clickPower}
                  </div>
                  <div style={{ fontSize: 12, marginTop: 5, opacity: 0.9 }}>
                    До: {new Date(state.activeMultiplier.expiresAt).toLocaleString('ru-RU', {
                      day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit'
                    })}
                  </div>
                </div>
              )}

              {/* Multipliers */}
              {state.multipliers.map(mult => {
                const isActive = state.activeMultiplier?.id === mult.id;
                const canBuy = state.coins >= mult.cost && !isActive;

                return (
                  <div key={mult.id} style={{
                    background: isActive ? 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' : 'rgba(255,255,255,0.9)',
                    borderRadius: 12, padding: 14, border: '2px solid ' + (isActive ? '#f5576c' : '#e2e8f0'),
                  }}>
                    <div style={{ marginBottom: 10 }}>
                      <div style={{ fontSize: 15, fontWeight: 700, color: isActive ? '#fff' : '#1e293b' }}>{mult.name}</div>
                      <div style={{ fontSize: 12, color: isActive ? 'rgba(255,255,255,0.9)' : '#64748b', marginTop: 3 }}>{mult.description}</div>
                      <div style={{ fontSize: 22, fontWeight: 700, color: isActive ? '#fff' : '#3b82f6', marginTop: 6 }}>
                        x{mult.multiplierValue}
                      </div>
                    </div>
                    <button onClick={() => handleBuyMultiplier(mult.id)} disabled={!canBuy} style={{
                      width: '100%', padding: '9px', borderRadius: 10, border: 'none',
                      background: canBuy ? 'linear-gradient(135deg, #10b981 0%, #059669 100%)' : '#cbd5e1',
                      color: '#fff', fontWeight: 600, fontSize: 13,
                      cursor: canBuy ? 'pointer' : 'not-allowed',
                    }}>
                      {isActive ? '✅ Активен' : `Купить · ${formatNumber(mult.cost)} 🪙`}
                    </button>
                  </div>
                );
              })}
            </div>
          )}

          {/* GIFTS TAB */}
          {activeTab === 'gifts' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={GIFTS_SECTION_ICON} alt="" style={{ width: 28, height: 28 }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Подарки</h2>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 12 }}>
                  {DAILY_GIFTS.map(gift => {
                    const claimed = (state.claimedDays || []).includes(gift.day);
                    const isCurrent = gift.day === nextGiftDay;
                    return (
                      <div key={gift.day} onClick={() => isCurrent && canClaim && handleClaimDailyGift()} style={{
                        background: claimed ? 'rgba(16,185,129,0.1)' : isCurrent ? 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)' : 'rgba(255,255,255,0.8)',
                        border: '2px solid ' + (claimed ? '#10b981' : isCurrent ? '#f59e0b' : '#e2e8f0'),
                        borderRadius: 12, padding: 16, textAlign: 'center', cursor: isCurrent && canClaim ? 'pointer' : 'default',
                        position: 'relative',
                      }}>
                        <div style={{ fontSize: 12, fontWeight: 600, color: isCurrent && !claimed ? '#fff' : '#64748b', marginBottom: 6 }}>День {gift.day}</div>
                        {gift.type === 'coins' ? (
                          <>
                            <div style={{ fontSize: 22, fontWeight: 700, color: isCurrent && !claimed ? '#fff' : '#1e293b' }}>{formatNumber(gift.reward)}</div>
                            <div style={{ fontSize: 12, color: isCurrent && !claimed ? 'rgba(255,255,255,0.9)' : '#64748b', marginTop: 3 }}>🪙</div>
                          </>
                        ) : (
                          <>
                            <div style={{ fontSize: 12, color: isCurrent && !claimed ? '#fff' : '#64748b' }}>Золотой!</div>
                            <div style={{ fontSize: 32, marginTop: 3 }}>🏆</div>
                          </>
                        )}
                        {claimed && <div style={{ fontSize: 28, position: 'absolute', top: 8, right: 8 }}>✅</div>}
                      </div>
                    );
                  })}
                </div>

              {state.hasGoldenSpidi && (
                <div style={{
                  background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', borderRadius: 14,
                  padding: '16px 20px', display: 'flex', alignItems: 'center', gap: 12,
                }}>
                  <img src={GOLDEN_SPIDI_ICON} alt="" style={{ width: 56, height: 56, borderRadius: 10 }} />
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 16 }}>🏆 Золотой Спиди</div>
                    <div style={{ color: 'rgba(255,255,255,0.9)', fontSize: 13, marginTop: 3 }}>Настройки → Кнопка клика</div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <img src={SETTINGS_SECTION_ICON} alt="" style={{ width: 28, height: 28 }} />
                <h2 style={{ fontSize: 20, fontWeight: 700, margin: 0 }}>Настройки</h2>
              </div>

              {/* Music */}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>🎵 Музыка</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
                  <span style={{ fontSize: 13, color: '#64748b' }}>Фоновая музыка</span>
                  <label style={{ position: 'relative', display: 'inline-block', width: 44, height: 22 }}>
                    <input type="checkbox" checked={state.musicEnabled} onChange={e => {
                      const enabled = e.target.checked;
                      setMusicEnabled(enabled);
                      setState(s => { const ns = { ...s, musicEnabled: enabled }; saveState(ns); return ns; });
                    }} style={{ opacity: 0, width: 0, height: 0 }} />
                    <span style={{
                      position: 'absolute', cursor: 'pointer', top: 0, left: 0, right: 0, bottom: 0,
                      background: state.musicEnabled ? '#3b82f6' : '#cbd5e1', borderRadius: 22, transition: '0.3s',
                    }}>
                      <span style={{
                        position: 'absolute', height: 18, width: 18, left: state.musicEnabled ? 24 : 2, bottom: 2,
                        background: '#fff', borderRadius: '50%', transition: '0.3s',
                      }} />
                    </span>
                  </label>
                </div>
                {trackNames.map((name, i) => (
                  <div key={i} onClick={() => { setTrack(i); setState(s => { const ns = { ...s, selectedTrack: i }; saveState(ns); return ns; }); }} style={{
                    padding: '10px 12px', borderRadius: 12, marginBottom: 6,
                    border: state.selectedTrack === i ? '2px solid #3b82f6' : '2px solid #e2e8f0',
                    background: state.selectedTrack === i ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.6)',
                    cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8,
                  }}>
                    <span style={{ fontSize: 18 }}>{i === 0 ? '🎶' : '🎸'}</span>
                    <span style={{ flex: 1, fontWeight: 600, fontSize: 13 }}>{name}</span>
                    {state.selectedTrack === i && <span style={{ color: '#3b82f6', fontSize: 11 }}>▶</span>}
                  </div>
                ))}
              </div>

              {/* Wallpapers */}
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>🖼️ Обои</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(100px, 1fr))', gap: 8 }}>
                  {WALLPAPERS.map((wp, i) => (
                    <div key={i} onClick={() => setState(s => { const ns = { ...s, selectedWallpaper: i, customWallpaper: null }; saveState(ns); return ns; })} style={{
                      borderRadius: 10, overflow: 'hidden', cursor: 'pointer',
                      border: state.selectedWallpaper === i && state.selectedWallpaper !== -1 ? '3px solid #3b82f6' : '3px solid transparent',
                    }}>
                      <img src={wp} alt="" style={{ width: '100%', height: 80, objectFit: 'cover' }} />
                    </div>
                  ))}
                </div>
                <button onClick={() => fileInputRef.current?.click()} style={{
                  marginTop: 10, padding: '9px 16px', borderRadius: 10, border: '2px dashed #3b82f6',
                  background: 'transparent', color: '#3b82f6', fontWeight: 600, fontSize: 13, cursor: 'pointer', width: '100%',
                }}>
                  📁 Свои обои
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
              <div>
                <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>🎨 Пак иконок</div>
                <div style={{
                  background: 'linear-gradient(135deg, rgba(139,92,246,0.1) 0%, rgba(59,130,246,0.1) 100%)',
                  borderRadius: 12, padding: 14, border: '2px solid rgba(139,92,246,0.3)', display: 'flex', alignItems: 'center', gap: 10,
                }}>
                  <img src={NEW_PACK_BTN} alt="" style={{ width: 42, height: 42, borderRadius: 8 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700, fontSize: 14 }}>NEW PACK ✨</div>
                    <div style={{ fontSize: 12, color: '#10b981', marginTop: 2 }}>Активен</div>
                  </div>
                </div>
              </div>

              {/* Click button selector */}
              {state.hasGoldenSpidi && (
                <div>
                  <div style={{ fontSize: 16, fontWeight: 700, marginBottom: 10 }}>🎯 Кнопка клика</div>
                  <div style={{ display: 'flex', gap: 10 }}>
                    {(['default', 'golden_spidi'] as const).map(btn => (
                      <div key={btn} onClick={() => setState(s => { const ns = { ...s, selectedClickButton: btn }; saveState(ns); return ns; })} style={{
                        flex: 1, borderRadius: 12, overflow: 'hidden', cursor: 'pointer',
                        border: state.selectedClickButton === btn ? '3px solid #f59e0b' : '3px solid transparent',
                        transition: 'border 0.2s',
                      }}>
                        <img src={CLICK_BUTTON_IMAGES[btn]} alt="" style={{ width: '100%', height: 120, objectFit: 'cover' }} />
                      </div>
                    ))}
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 8, textAlign: 'center' }}>
                    🏆 За 100К кликов или подарок
                  </div>
                </div>
              )}

              {/* Reset */}
              <div style={{
                background: 'rgba(239,68,68,0.1)', borderRadius: 12, padding: 16, border: '2px solid rgba(239,68,68,0.3)',
              }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#dc2626', marginBottom: 8 }}>⚠️ Сброс</div>
                <div style={{ fontSize: 12, color: '#64748b', marginBottom: 12 }}>Сбросит весь прогресс.</div>
                <button onClick={onReset} style={{
                  width: '100%', padding: '9px', borderRadius: 10, border: 'none',
                  background: 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
                  color: '#fff', fontWeight: 600, fontSize: 13, cursor: 'pointer',
                }}>
                  🔄 Сбросить
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Bottom Tab Bar */}
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, height: 70,
          background: 'rgba(255,255,255,0.95)', borderTop: '2px solid #e2e8f0',
          display: 'flex', gap: 4, padding: '8px 4px', boxShadow: '0 -4px 20px rgba(0,0,0,0.1)',
        }}>
          {([
            { tab: 'game', label: 'Игра', icon: TAB_ICONS.game },
            { tab: 'upgrades', label: 'Улучш.', icon: TAB_ICONS.upgrades },
            { tab: 'gifts', label: 'Подарки', icon: TAB_ICONS.gifts },
            { tab: 'settings', label: 'Настр.', icon: TAB_ICONS.settings },
          ] as const).map(({ tab, label, icon }) => (
            <button key={tab} onClick={() => setActiveTab(tab)} style={{
              flex: 1, border: 'none', background: activeTab === tab ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' : 'transparent',
              color: activeTab === tab ? '#fff' : '#64748b', borderRadius: 12, cursor: 'pointer',
              display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 4,
              fontSize: 11, fontWeight: 600, transition: 'all 0.2s',
            }}>
              <img src={icon} alt="" style={{ width: 24, height: 24, objectFit: 'contain' }} />
              {label}
            </button>
          ))}
        </div>
      </div>

      <style>{`
        @keyframes floatUp {
          0% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-60px); }
        }
        @keyframes slideDown {
          from { opacity: 0; transform: translate(-50%, -10px); }
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
