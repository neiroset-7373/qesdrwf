// Reset OOBE for Spidi Clicker v3.0
// This is the same OOBE flow shown after reset

import OOBEWintozo from './OOBE-wintozo-SpidiClicker';
import { GameState } from '../game/gameState';

interface ResetOOBEProps {
  onComplete: (settings: Partial<GameState>) => void;
}

export default function ResetOOBE({ onComplete }: ResetOOBEProps) {
  return <OOBEWintozo onComplete={onComplete} />;
}
