import React, { useState, useRef } from 'react';
import { GameState, WALLPAPERS } from '../game/gameState';
import { previewTrack, getTrackNames } from '../game/audioManager';

interface OOBEProps {
  onComplete: (settings: Partial<GameState>) => void;
}

const LOGO = 'https://i.ibb.co/x8tjVJBT/9a537f7d-5259-44cd-b818-dff5f504aca3.jpg';

const DEVICE_ICONS = {
  phone: 'https://imgfy.ru/ib/475Jq1LdI26eKyi_1776415547.webp',
  tablet: 'https://imgfy.ru/ib/sXHaQUDSGc305IG_1776415547.webp',
  pc: 'https://imgfy.ru/ib/UsrM5vinHW04SdC_1776415548.webp',
};

const NEW_PACK_BTN = 'https://imgfy.ru/ib/cFgAkQjlmXFzaGI_1776967380.webp';
const COIN_ICON = 'https://imgfy.ru/ib/Vm9n8qKCjSoXfQ7_1775834388.webp';

export default function OOBEWintozo({ onComplete }: OOBEProps) {
  const [step, setStep] = useState(1);
  const [deviceType, setDeviceType] = useState<'phone' | 'tablet' | 'pc' | null>(null);
  const [selectedWallpaper, setSelectedWallpaper] = useState(0);
  const [customWallpaper, setCustomWallpaper] = useState<string | null>(null);
  const [iconPackError, setIconPackError] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(0);
  const [musicEnabled, setMusicEnabled] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const trackNames = getTrackNames();

  const totalSteps = 5;

  const goNext = () => {
    if (step === 1 && !deviceType) return;
    setIsAnimating(true);
    setTimeout(() => {
      setStep(s => s + 1);
      setIsAnimating(false);
    }, 200);
  };

  const goPrev = () => {
    if (step === 1) return;
    setIsAnimating(true);
    setTimeout(() => {
      setStep(s => s - 1);
      setIsAnimating(false);
    }, 200);
  };

  const handleCustomWallpaper = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setCustomWallpaper(ev.target?.result as string);
      setSelectedWallpaper(-1);
    };
    reader.readAsDataURL(file);
  };

  const handleComplete = () => {
    onComplete({
      deviceType: deviceType!,
      selectedWallpaper,
      customWallpaper,
      selectedIconPack: 'new',
      musicEnabled,
      selectedTrack,
      completedOnboarding: true,
    });
  };

  const handlePreview = (trackIdx: number) => {
    previewTrack(trackIdx, 5000);
  };

  const currentBg = customWallpaper && selectedWallpaper === -1
    ? customWallpaper
    : WALLPAPERS[selectedWallpaper] || WALLPAPERS[0];

  return (
    <div
      className="fixed inset-0 flex items-center justify-center"
      style={{
        backgroundImage: `url(${currentBg})`,
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      {/* Overlay */}
      <div className="absolute inset-0" style={{ background: 'rgba(0,0,0,0.35)' }} />

      {/* Card */}
      <div
        className="relative z-10 w-full mx-4"
        style={{
          maxWidth: 520,
          background: 'rgba(255,255,255,0.92)',
          backdropFilter: 'blur(24px)',
          borderRadius: 28,
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
          padding: '36px 32px',
          transition: 'opacity 0.2s',
          opacity: isAnimating ? 0 : 1,
          maxHeight: '90vh',
          overflowY: 'auto',
        }}
      >
        {/* Progress */}
        <div className="flex gap-2 mb-6">
          {Array.from({ length: totalSteps }).map((_, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                height: 4,
                borderRadius: 4,
                background: i < step ? '#3b82f6' : '#e2e8f0',
                transition: 'background 0.3s',
              }}
            />
          ))}
        </div>

        {/* Step 1: Device */}
        {step === 1 && (
          <div>
            <div className="text-center mb-6">
              <img src={LOGO} alt="Spidi Clicker" style={{ height: 64, margin: '0 auto 12px', borderRadius: 16, objectFit: 'cover' }} />
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#1e293b', marginBottom: 6 }}>Добро пожаловать!</h2>
              <p style={{ color: '#64748b', fontSize: 14 }}>Выберите тип устройства</p>
            </div>
            <div className="flex gap-3 justify-center mb-2">
              {([['phone', 'Телефон'], ['tablet', 'Планшет'], ['pc', 'Компьютер']] as const).map(([type, label]) => (
                <button
                  key={type}
                  onClick={() => setDeviceType(type)}
                  style={{
                    flex: 1,
                    padding: '16px 8px',
                    borderRadius: 20,
                    border: deviceType === type ? '2.5px solid #3b82f6' : '2px solid #e2e8f0',
                    background: deviceType === type ? 'rgba(59,130,246,0.08)' : 'rgba(255,255,255,0.7)',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: deviceType === type ? 'scale(1.04)' : 'scale(1)',
                  }}
                >
                  <img src={DEVICE_ICONS[type]} alt={label} style={{ width: 48, height: 48, objectFit: 'contain', margin: '0 auto 8px' }} />
                  <p style={{ fontSize: 13, fontWeight: 600, color: deviceType === type ? '#3b82f6' : '#334155' }}>{label}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Step 2: Wallpaper */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>🖼️ Выбор фона</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 16 }}>Выберите обои для игры</p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 10, maxHeight: 320, overflowY: 'auto' }}>
              {WALLPAPERS.map((wp, i) => (
                <button
                  key={i}
                  onClick={() => { setSelectedWallpaper(i); setCustomWallpaper(null); }}
                  style={{
                    aspectRatio: '16/9',
                    borderRadius: 12,
                    overflow: 'hidden',
                    border: selectedWallpaper === i && !customWallpaper ? '3px solid #3b82f6' : '2px solid transparent',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    transform: selectedWallpaper === i && !customWallpaper ? 'scale(1.04)' : 'scale(1)',
                    padding: 0,
                  }}
                >
                  <img src={wp} alt={`Обои ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </button>
              ))}
              {/* Custom wallpaper */}
              <button
                onClick={() => fileInputRef.current?.click()}
                style={{
                  aspectRatio: '16/9',
                  borderRadius: 12,
                  border: selectedWallpaper === -1 ? '3px solid #3b82f6' : '2px dashed #94a3b8',
                  background: customWallpaper && selectedWallpaper === -1
                    ? `url(${customWallpaper}) center/cover`
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
                {!customWallpaper && (
                  <>
                    <span style={{ fontSize: 22 }}>+</span>
                    <span style={{ fontSize: 10, color: '#64748b' }}>Своё фото</span>
                  </>
                )}
              </button>
            </div>
            <input ref={fileInputRef} type="file" accept="image/*" style={{ display: 'none' }} onChange={handleCustomWallpaper} />
          </div>
        )}

        {/* Step 3: Icon Pack */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>🎨 Пак иконок</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Выберите стиль иконок</p>
            <div className="flex gap-4 justify-center">
              {/* NEW PACK */}
              <button
                onClick={() => { setIconPackError(false); }}
                style={{
                  flex: 1,
                  padding: 20,
                  borderRadius: 20,
                  border: !iconPackError ? '2.5px solid #3b82f6' : '2px solid #e2e8f0',
                  background: !iconPackError ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                <div style={{ marginBottom: 12, display: 'flex', gap: 8, justifyContent: 'center' }}>
                  <img src={NEW_PACK_BTN} alt="New Pack Button" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 12 }} />
                  <img src={COIN_ICON} alt="Coin" style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 12 }} />
                </div>
                <p style={{ fontWeight: 700, color: '#3b82f6', fontSize: 15 }}>NEW PACK ✨</p>
                <p style={{ fontSize: 12, color: '#64748b', marginTop: 4 }}>Новые красивые иконки</p>
              </button>

              {/* OLD PACK */}
              <button
                onClick={() => setIconPackError(true)}
                style={{
                  flex: 1,
                  padding: 20,
                  borderRadius: 20,
                  border: '2px solid #e2e8f0',
                  background: 'rgba(241,245,249,0.7)',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  opacity: 0.7,
                }}
              >
                <div style={{ fontSize: 40, marginBottom: 12 }}>📦</div>
                <p style={{ fontWeight: 700, color: '#94a3b8', fontSize: 15 }}>OLD PACK</p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 4 }}>Старые иконки</p>
              </button>
            </div>
            {iconPackError && (
              <div style={{
                marginTop: 16,
                padding: '12px 16px',
                borderRadius: 12,
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#dc2626',
                fontSize: 13,
                fontWeight: 600,
                textAlign: 'center',
                animation: 'fadeIn 0.3s ease',
              }}>
                ❌ Старый пак удалён из Spidi Clicker
              </div>
            )}
          </div>
        )}

        {/* Step 4: Music */}
        {step === 4 && (
          <div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#1e293b', marginBottom: 4 }}>🎵 Музыка</h2>
            <p style={{ color: '#64748b', fontSize: 13, marginBottom: 20 }}>Выберите фоновую музыку</p>

            <div className="flex flex-col gap-3 mb-5">
              {trackNames.map((name, i) => (
                <div
                  key={i}
                  style={{
                    padding: '14px 16px',
                    borderRadius: 16,
                    border: selectedTrack === i ? '2.5px solid #3b82f6' : '2px solid #e2e8f0',
                    background: selectedTrack === i ? 'rgba(59,130,246,0.07)' : 'rgba(255,255,255,0.7)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setSelectedTrack(i)}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ fontSize: 24 }}>{i === 0 ? '🎶' : '🎸'}</span>
                    <div>
                      <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>{name}</p>
                      <p style={{ fontSize: 12, color: '#64748b' }}>Трек {i + 1}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <button
                      onClick={(e) => { e.stopPropagation(); handlePreview(i); }}
                      style={{
                        padding: '6px 12px',
                        borderRadius: 20,
                        background: '#3b82f6',
                        color: '#fff',
                        border: 'none',
                        fontSize: 12,
                        fontWeight: 600,
                        cursor: 'pointer',
                      }}
                    >
                      ▶ 5 сек
                    </button>
                    {selectedTrack === i && <span style={{ color: '#3b82f6', fontWeight: 700 }}>✓</span>}
                  </div>
                </div>
              ))}
            </div>

            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '14px 16px',
                borderRadius: 16,
                background: 'rgba(241,245,249,0.8)',
              }}
            >
              <div>
                <p style={{ fontWeight: 700, color: '#1e293b', fontSize: 14 }}>Музыка в игре</p>
                <p style={{ fontSize: 12, color: '#64748b' }}>Фоновая музыка</p>
              </div>
              <button
                onClick={() => setMusicEnabled(m => !m)}
                style={{
                  width: 52,
                  height: 28,
                  borderRadius: 14,
                  background: musicEnabled ? '#3b82f6' : '#cbd5e1',
                  border: 'none',
                  cursor: 'pointer',
                  position: 'relative',
                  transition: 'background 0.3s',
                }}
              >
                <span style={{
                  position: 'absolute',
                  top: 3,
                  left: musicEnabled ? 26 : 3,
                  width: 22,
                  height: 22,
                  borderRadius: '50%',
                  background: '#fff',
                  transition: 'left 0.3s',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                }} />
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Final */}
        {step === 5 && (
          <div style={{ textAlign: 'center' }}>
            <img
              src={LOGO}
              alt="Spidi Clicker"
              style={{
                width: 120,
                height: 120,
                objectFit: 'cover',
                borderRadius: 28,
                margin: '0 auto 20px',
                boxShadow: '0 12px 40px rgba(59,130,246,0.3)',
                animation: 'bounceIn 0.6s ease',
              }}
            />
            <h2 style={{ fontSize: 26, fontWeight: 900, color: '#1e293b', marginBottom: 8 }}>Всё готово! 🎉</h2>
            <p style={{ color: '#64748b', fontSize: 14, marginBottom: 8, lineHeight: 1.6 }}>
              Ваши настройки сохранены.<br />
              Добро пожаловать в <strong>Spidi Clicker v3.0</strong>!
            </p>
            <div style={{ display: 'flex', gap: 16, justifyContent: 'center', flexWrap: 'wrap', marginBottom: 24, marginTop: 16 }}>
              <div style={{ padding: '8px 16px', background: 'rgba(59,130,246,0.1)', borderRadius: 12, fontSize: 13, color: '#3b82f6', fontWeight: 600 }}>
                {deviceType === 'phone' ? '📱' : deviceType === 'tablet' ? '📲' : '💻'} {deviceType === 'phone' ? 'Телефон' : deviceType === 'tablet' ? 'Планшет' : 'Компьютер'}
              </div>
              <div style={{ padding: '8px 16px', background: 'rgba(59,130,246,0.1)', borderRadius: 12, fontSize: 13, color: '#3b82f6', fontWeight: 600 }}>
                🎵 {musicEnabled ? 'Музыка вкл' : 'Музыка выкл'}
              </div>
            </div>
            <button
              onClick={handleComplete}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: 20,
                background: 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: '#fff',
                border: 'none',
                fontSize: 18,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 8px 32px rgba(59,130,246,0.4)',
                transition: 'transform 0.2s',
                letterSpacing: 0.5,
              }}
              onMouseOver={e => (e.currentTarget.style.transform = 'scale(1.03)')}
              onMouseOut={e => (e.currentTarget.style.transform = 'scale(1)')}
            >
              🚀 Начать игру!
            </button>
          </div>
        )}

        {/* Navigation buttons */}
        {step < 5 && (
          <div style={{ display: 'flex', gap: 12, marginTop: 28 }}>
            {step > 1 && (
              <button
                onClick={goPrev}
                style={{
                  flex: 1,
                  padding: '13px',
                  borderRadius: 16,
                  border: '2px solid #e2e8f0',
                  background: 'rgba(255,255,255,0.8)',
                  color: '#64748b',
                  fontSize: 15,
                  fontWeight: 700,
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                }}
              >
                ← Назад
              </button>
            )}
            <button
              onClick={goNext}
              disabled={step === 1 && !deviceType}
              style={{
                flex: 2,
                padding: '13px',
                borderRadius: 16,
                background: step === 1 && !deviceType ? '#e2e8f0' : 'linear-gradient(135deg, #3b82f6, #2563eb)',
                color: step === 1 && !deviceType ? '#94a3b8' : '#fff',
                border: 'none',
                fontSize: 15,
                fontWeight: 700,
                cursor: step === 1 && !deviceType ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s',
                boxShadow: step === 1 && !deviceType ? 'none' : '0 4px 16px rgba(59,130,246,0.3)',
              }}
            >
              {step === 4 ? 'Готово →' : 'Далее →'}
            </button>
          </div>
        )}

        {/* Step indicator */}
        <p style={{ textAlign: 'center', marginTop: 16, color: '#94a3b8', fontSize: 12 }}>
          Шаг {step} из {totalSteps}
        </p>
      </div>

      <style>{`
        @keyframes bounceIn {
          0% { transform: scale(0.5); opacity: 0; }
          60% { transform: scale(1.1); opacity: 1; }
          100% { transform: scale(1); }
        }
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
