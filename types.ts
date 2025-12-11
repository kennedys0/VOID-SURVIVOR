
export enum GameState {
  MENU = 'MENU',
  PREPARATION = 'PREPARATION',
  PLAYING = 'PLAYING',
  PAUSED = 'PAUSED',
  LEVEL_UP = 'LEVEL_UP',
  GAME_OVER = 'GAME_OVER',
  SHOP = 'SHOP'
}

export interface Position {
  x: number;
  y: number;
}

export interface Entity extends Position {
  id: string;
  radius: number;
  color: string;
  markedForDeletion: boolean;
}

export interface Particle extends Entity {
  vx: number;
  vy: number;
  life: number;
  decay: number;
}

export interface DamageIndicator extends Position {
  id: string;
  value: number;
  life: number; // 0 to 1
  vx: number;
  vy: number;
  color: string;
  scale: number;
  isCrit: boolean;
}

export type AbilityType = 'dash' | 'shield' | 'nova';
export type WeaponType = 'pistol' | 'shotgun' | 'orbital' | 'boomerang' | 'molotov' | 'lightning';
export type UpgradeCategory = 'stat' | 'weapon' | 'ability';
export type MapId = 'void' | 'neon_city' | 'crimson_waste';

export interface GameMap {
  id: MapId;
  name: string;
  description: string;
  difficulty: string;
  theme: {
    bg: string;
    grid: string;
    accent: string;
  };
  hazardType: 'none' | 'electric_walls' | 'lava_pools';
}

export interface Hazard extends Entity {
  type: 'lava';
  damage: number;
}

export interface Weapon {
  id: string;
  type: WeaponType;
  name: string;
  rank: number; // Current upgrade level (1-5)
  cooldown: number;
  timer: number;
  damage: number;
  projectileCount: number;
  projectileSpeed: number;
  duration: number; // Life of projectile
  color: string;
  active: boolean;
}

export interface Player extends Entity {
  hp: number;
  maxHp: number;
  speed: number;
  level: number;
  xp: number;
  xpToNextLevel: number;
  pickupRange: number;
  
  // Global Stat Modifiers (accumulated from upgrades)
  statModifiers: {
    damage: number;
    cooldown: number;
    xpMultiplier: number; // New for meta progression
  };
  
  // Weapons System
  weapons: Weapon[];
  
  // Active Ability
  activeAbility: AbilityType;
  abilityCooldown: number; // Max frames
  abilityTimer: number;    // Current frames until ready
  abilityActiveTimer: number; // How long the ability is currently active (e.g. dashing duration)
}

export interface Enemy extends Entity {
  hp: number;
  maxHp: number; // Added for health bar rendering if needed, or visual damage calc
  speed: number;
  damage: number;
  value: number; // XP Value
  type: 'basic' | 'rusher' | 'goliath' | 'swarmer' | 'boss';
  knockbackResist: number; // 0 to 1 (1 = immovable)
}

export interface Projectile extends Entity {
  vx: number;
  vy: number;
  damage: number;
  duration: number;
  pierce: number;
  behavior: 'straight' | 'orbital' | 'boomerang' | 'lob' | 'hazard' | 'lightning';
  orbitAngle?: number; // For orbitals
  orbitRadius?: number; // For orbitals
  returnSpeed?: number; // For boomerang
  aoeRadius?: number; // For hazard/explosions
  isMaxRank?: boolean; // Visual flair for maxed weapons
}

export interface Loot extends Entity {
  value: number;
  type: 'xp' | 'health';
}

export interface VoidEvent {
  title: string;
  message: string;
  modifier: {
    enemySpeedMultiplier?: number;
    enemySpawnRateMultiplier?: number;
    enemyHpMultiplier?: number;
    bossSpawn?: boolean;
  };
}

export interface UpgradeOption {
  id: string;
  name: string;
  description: string;
  apply: (player: Player) => void;
  rarity: 'common' | 'rare' | 'legendary';
  category: UpgradeCategory;
  maxRank: number;
}

// Interface for UI display which knows the current rank status
export interface UpgradeDisplay extends UpgradeOption {
  currentRank: number;
  isMax: boolean; // Indicates if this upgrade will reach max rank
}

export interface LeaderboardEntry {
  name: string;
  score: number;
  wave: number;
  mapId: MapId;
  mapName: string;
  date: string;
  weapon: WeaponType;
}

// --- META PROGRESSION ---
export interface UserProfile {
  credits: number;
  upgrades: {
    health: number;
    damage: number;
    speed: number;
    xp: number;
    magnet: number;
  };
}

export type MetaUpgradeId = keyof UserProfile['upgrades'];

export interface MetaUpgradeConfig {
  id: MetaUpgradeId;
  name: string;
  description: string;
  baseCost: number;
  costScale: number; // Multiplier per rank
  maxRank: number;
  statPerRank: number; // e.g. 10 HP or 0.05 (5%)
  format: 'flat' | 'percent';
}
