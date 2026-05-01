// Game State Types and Logic for Spidi Clicker v3.0

export interface GameState {
  coins: number;
  totalClicks: number;
  clickPower: number;
  baseClickPower: number; // Base power without multipliers
  autoClickerLevel: number;
  autoClickerActive: boolean;
  multipliers: Multiplier[];
  lastDailyGiftDate: string | null;
  dailyGiftDay: number;
  claimedDays: number[];
  medal100k: boolean;
  selectedWallpaper: number;
  customWallpaper: string | null;
  selectedIconPack: 'new' | null;
  musicEnabled: boolean;
  selectedTrack: number;
  completedOnboarding: boolean;
  deviceType: 'phone' | 'tablet' | 'pc' | null;
  activeMultiplier: {
    id: string;
    multiplier: number;
    expiresAt: string;
  } | null;
  hasGoldenSpidi: boolean;
  selectedClickButton: 'default' | 'golden_spidi';
}

export interface Multiplier {
  id: string;
  name: string;
  description: string;
  cost: number;
  multiplierValue: number;
  purchased: boolean;
  level: number;
  maxLevel: number;
}

export const WALLPAPERS = [
  'https://imgfy.ru/ib/Es100C1zaVZdm1Z_1775727486.webp',
  'https://imgfy.ru/ib/hNDLBKPvzB3XRdJ_1775727498.webp',
  'https://imgfy.ru/ib/58mSMpwqgKyc2bv_1775727499.webp',
  'https://imgfy.ru/ib/k1k7x1HIEvj4OZO_1775727498.webp',
  'https://imgfy.ru/ib/vWDp69bLejOVlvE_1775727499.webp',
  'https://imgfy.ru/ib/8tTCTZQjXOq7iZw_1776351253.webp',
  'https://imgfy.ru/ib/dgxAmb468GFFs2E_1776351253.webp',
  'https://imgfy.ru/ib/BZbPPQFZNmv3qrd_1777051453.webp',
];

export const DAILY_GIFTS = [
  { day: 1, reward: 100, type: 'coins' as const },
  { day: 2, reward: 1000, type: 'coins' as const },
  { day: 3, reward: 5000, type: 'coins' as const },
  { day: 4, reward: 10000, type: 'coins' as const },
  { day: 5, reward: 50, type: 'golden_spidi' as const },
];

export const CLICK_BUTTON_IMAGES = {
  default: 'https://i.ibb.co/GQ1C2zFz/df81b79e-82c7-4e35-b2cd-8a69abe58eb5.jpg',
  golden_spidi: 'https://i.ibb.co/gppjW5R/1775898076670.jpg',
};

export const INITIAL_MULTIPLIERS: Multiplier[] = [
  {
    id: 'mult_x2',
    name: 'Множитель x2',
    description: 'Удваивает монеты на 24 часа',
    cost: 250,
    multiplierValue: 2,
    purchased: false,
    level: 0,
    maxLevel: 1,
  },
  {
    id: 'mult_x3',
    name: 'Множитель x3',
    description: 'Утраивает монеты на 24 часа',
    cost: 450,
    multiplierValue: 3,
    purchased: false,
    level: 0,
    maxLevel: 1,
  },
  {
    id: 'mult_x4',
    name: 'Множитель x4',
    description: 'Учетверяет монеты на 24 часа',
    cost: 760,
    multiplierValue: 4,
    purchased: false,
    level: 0,
    maxLevel: 1,
  },
  {
    id: 'mult_x5',
    name: 'Множитель x5',
    description: 'x5 монет на 24 часа',
    cost: 1000,
    multiplierValue: 5,
    purchased: false,
    level: 0,
    maxLevel: 1,
  },
  {
    id: 'mult_x10',
    name: 'Множитель x10',
    description: 'x10 монет на 24 часа',
    cost: 10500,
    multiplierValue: 10,
    purchased: false,
    level: 0,
    maxLevel: 1,
  },
  {
    id: 'mult_x100',
    name: 'Множитель x100',
    description: 'x100 монет на 24 часа',
    cost: 11500,
    multiplierValue: 100,
    purchased: false,
    level: 0,
    maxLevel: 1,
  },
  {
    id: 'mult_x1000',
    name: 'Множитель x1000',
    description: 'x1000 монет на 24 часа',
    cost: 13000,
    multiplierValue: 1000,
    purchased: false,
    level: 0,
    maxLevel: 1,
  },
];

export const AUTO_CLICKER_UPGRADES = [
  { level: 1, coinsPerSec: 1, cost: 100, name: 'Авто-кликер I' },
  { level: 2, coinsPerSec: 3, cost: 500, name: 'Авто-кликер II' },
  { level: 3, coinsPerSec: 8, cost: 2000, name: 'Авто-кликер III' },
  { level: 4, coinsPerSec: 20, cost: 8000, name: 'Авто-кликер IV' },
  { level: 5, coinsPerSec: 50, cost: 25000, name: 'Авто-кликер V' },
];

export const DEFAULT_STATE: GameState = {
  coins: 0,
  totalClicks: 0,
  clickPower: 1,
  baseClickPower: 1, // Base power (1 + permanent bonuses like Golden Spidi)
  autoClickerLevel: 0,
  autoClickerActive: false,
  multipliers: INITIAL_MULTIPLIERS,
  lastDailyGiftDate: null,
  dailyGiftDay: 0,
  claimedDays: [],
  medal100k: false,
  selectedWallpaper: 0,
  customWallpaper: null,
  selectedIconPack: 'new',
  musicEnabled: true,
  selectedTrack: 0,
  completedOnboarding: false,
  deviceType: null,
  activeMultiplier: null,
  hasGoldenSpidi: false,
  selectedClickButton: 'default',
};

const SAVE_KEY = 'spidi_clicker_v3_save';

export function loadState(): GameState {
  try {
    const saved = localStorage.getItem(SAVE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      return { ...DEFAULT_STATE, ...parsed };
    }
  } catch (e) {
    console.error('Failed to load state', e);
  }
  return { ...DEFAULT_STATE };
}

export function saveState(state: GameState): void {
  try {
    localStorage.setItem(SAVE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save state', e);
  }
}

export function resetState(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function getAutoClickerCoinsPerSec(level: number): number {
  if (level === 0) return 0;
  const upgrade = AUTO_CLICKER_UPGRADES.find(u => u.level === level);
  return upgrade?.coinsPerSec ?? 0;
}

export function getNextAutoClickerUpgrade(level: number) {
  return AUTO_CLICKER_UPGRADES.find(u => u.level === level + 1) ?? null;
}

export function canClaimDailyGift(state: GameState): boolean {
  if (!state.lastDailyGiftDate) return true;
  const last = new Date(state.lastDailyGiftDate);
  const now = new Date();
  return now.toDateString() !== last.toDateString();
}

export function getNextDay(state: GameState): number {
  const nextDay = (state.dailyGiftDay % 5) + 1;
  return nextDay;
}

export function formatNumber(n: number): string {
  if (n >= 1_000_000_000) return (n / 1_000_000_000).toFixed(1) + 'B';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'K';
  return Math.floor(n).toString();
}
