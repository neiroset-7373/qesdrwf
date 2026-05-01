import { useState, useEffect, lazy, Suspense } from 'react';
import { loadState, saveState, resetState, GameState, DEFAULT_STATE } from './wintozo/game/gameState';
import { initAudio } from './wintozo/game/audioManager';

// Lazy load OOBE components
const OOBEFirst = lazy(() => import('./wintozo/ui-wintozo/OOBE-wintozo-SpidiClicker'));

// Lazy load game components
const PCGame = lazy(() => import('./wintozo/game/game-pc'));
const AndroidGame = lazy(() => import('./wintozo/game/android-game'));

function detectMobile(): boolean {
  return /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
    (window.innerWidth < 768);
}

function LoadingScreen() {
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #dbeafe, #eff6ff, #e0f2fe)',
      fontFamily: 'Inter, sans-serif',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.9)',
        backdropFilter: 'blur(20px)',
        borderRadius: 28,
        padding: '40px 48px',
        textAlign: 'center',
        boxShadow: '0 20px 60px rgba(59,130,246,0.15)',
        animation: 'fadeInUp 0.5s ease',
      }}>
        <img
          src="https://i.ibb.co/x8tjVJBT/9a537f7d-5259-44cd-b818-dff5f504aca3.jpg"
          alt="Spidi Clicker"
          style={{
            width: 96,
            height: 96,
            borderRadius: 24,
            objectFit: 'cover',
            boxShadow: '0 12px 40px rgba(59,130,246,0.3)',
            marginBottom: 20,
            animation: 'breathe 2s ease infinite',
          }}
        />
        <h1 style={{ fontSize: 26, fontWeight: 900, color: '#1e293b', marginBottom: 6 }}>Spidi Clicker</h1>
        <p style={{ color: '#64748b', fontSize: 14, marginBottom: 24, fontWeight: 500 }}>v3.0 · Загрузка...</p>
        <div style={{
          display: 'flex',
          gap: 8,
          justifyContent: 'center',
        }}>
          {[0, 1, 2].map(i => (
            <div key={i} style={{
              width: 10,
              height: 10,
              borderRadius: '50%',
              background: '#3b82f6',
              animation: `bounce 1.2s ease infinite ${i * 0.15}s`,
            }} />
          ))}
        </div>
      </div>
      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(24px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes breathe {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50% { transform: translateY(-10px); opacity: 1; }
        }
      `}</style>
    </div>
  );
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => loadState());
  const [isResetting, setIsResetting] = useState(false);
  const [isMobile] = useState(() => detectMobile());
  const [audioStarted, setAudioStarted] = useState(false);

  // Initialize audio once onboarding is complete
  useEffect(() => {
    if (gameState.completedOnboarding && !audioStarted) {
      initAudio(gameState.selectedTrack, gameState.musicEnabled);
      setAudioStarted(true);
    }
  }, [gameState.completedOnboarding, audioStarted, gameState.selectedTrack, gameState.musicEnabled]);

  const handleOOBEComplete = (settings: Partial<GameState>) => {
    const newState: GameState = {
      ...DEFAULT_STATE,
      ...settings,
      completedOnboarding: true,
    };
    // If device not set in settings, detect it
    if (!newState.deviceType) {
      newState.deviceType = isMobile ? 'phone' : 'pc';
    }
    saveState(newState);
    setGameState(newState);
    // Start audio after OOBE
    initAudio(newState.selectedTrack, newState.musicEnabled);
    setAudioStarted(true);
  };

  const handleReset = () => {
    if (!window.confirm('Сбросить весь прогресс? Это действие нельзя отменить.')) return;
    resetState();
    setIsResetting(true);
    setAudioStarted(false);
    setTimeout(() => {
      setGameState({ ...DEFAULT_STATE });
      setIsResetting(false);
    }, 300);
  };

  // Show loading during reset
  if (isResetting) {
    return <LoadingScreen />;
  }

  // Show OOBE if not completed
  if (!gameState.completedOnboarding) {
    return (
      <Suspense fallback={<LoadingScreen />}>
        <OOBEFirst onComplete={handleOOBEComplete} />
      </Suspense>
    );
  }

  // If was reset (completedOnboarding = false after reset), show reset OOBE
  // This is handled by the same OOBEFirst component

  // Determine which game to show
  const deviceType = gameState.deviceType;
  const showMobile = deviceType === 'phone' || (deviceType === null && isMobile);

  return (
    <Suspense fallback={<LoadingScreen />}>
      {showMobile ? (
        <AndroidGame
          state={gameState}
          setState={setGameState}
          onReset={handleReset}
        />
      ) : (
        <PCGame
          state={gameState}
          setState={setGameState}
          onReset={handleReset}
        />
      )}
    </Suspense>
  );
}
