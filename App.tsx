
import React, { useState, useRef, useCallback, useEffect } from 'react';
import GameCanvas from './components/GameCanvas';
import UIOverlay from './components/UIOverlay';
import { GameState, Player, UpgradeOption, UpgradeDisplay, VoidEvent, Weapon, WeaponType, GameMap, MapId, LeaderboardEntry, UserProfile, MetaUpgradeConfig, MetaUpgradeId } from './types';
import { initAudio } from './services/audioService';
import { getMapLeaderboard, isHighScore, saveScore, getUserProfile, saveUserProfile } from './services/storageService';

// Meta Upgrade Configurations
// Adjusted for Rank 50 cap with INCREASED costs based on user feedback
const META_UPGRADES: MetaUpgradeConfig[] = [
    { id: 'health', name: 'Hull Reinforcement', description: 'Increases Base Health by 5 per rank.', baseCost: 250, costScale: 1.15, maxRank: 50, statPerRank: 5, format: 'flat' },
    { id: 'armor', name: 'Plating Armor', description: 'Reduces incoming damage by 0.5 per rank.', baseCost: 1000, costScale: 1.20, maxRank: 50, statPerRank: 0.5, format: 'flat' },
    { id: 'damage', name: 'Weapon Overdrive', description: 'Increases Damage by 2% per rank.', baseCost: 500, costScale: 1.15, maxRank: 50, statPerRank: 0.02, format: 'percent' },
    { id: 'speed', name: 'Engine Tuning', description: 'Increases Speed by 1% per rank.', baseCost: 400, costScale: 1.15, maxRank: 50, statPerRank: 0.01, format: 'percent' },
    { id: 'xp', name: 'Data Mining', description: 'Increases XP Gain by 2% per rank.', baseCost: 600, costScale: 1.15, maxRank: 50, statPerRank: 0.02, format: 'percent' },
    { id: 'magnet', name: 'Attractor Beam', description: 'Increases Pickup Range by 2% per rank.', baseCost: 300, costScale: 1.12, maxRank: 50, statPerRank: 0.02, format: 'percent' }
];

const MAP_CONFIGS: GameMap[] = [
  {
    id: 'grass_lands',
    name: 'Verdant Plains',
    description: 'Ancient organic terrain. Overgrown, but potentially dangerous.',
    difficulty: 'NORMAL',
    creditsMultiplier: 1.0,
    theme: { bg: '#2d4c1e', grid: '#3a5f27', accent: '#76ff03', textureId: 'grass' },
    hazardType: 'none'
  },
  {
    id: 'neon_city',
    name: 'Neon City',
    description: 'A confined cyber-arena. WARNING: Perimeter walls are electrified.',
    difficulty: 'HARD',
    creditsMultiplier: 1.5,
    theme: { bg: '#050a14', grid: '#2a0a3b', accent: '#ff00ff', textureId: 'neon_dirt' },
    hazardType: 'electric_walls'
  },
  {
    id: 'crimson_waste',
    name: 'Crimson Waste',
    description: 'Hostile terrain. Avoid the magma pools that slow and damage units.',
    difficulty: 'EXTREME',
    creditsMultiplier: 3.0,
    theme: { bg: '#1a0505', grid: '#3b0a0a', accent: '#ff4400', textureId: 'crimson_stones' },
    hazardType: 'lava_pools'
  }
];

const getStarterWeapon = (type: WeaponType): Weapon => {
    switch(type) {
        case 'sword':
            return {
                id: 'sword_starter', type: 'sword', name: 'Rune Blade', rank: 1,
                cooldown: 40, timer: 0, damage: 30, projectileCount: 1, projectileSpeed: 0, duration: 15, color: '#00ffff', active: true
            };
        case 'shotgun':
            return {
                id: 'shotgun_starter', type: 'shotgun', name: 'Void Shotgun', rank: 1,
                cooldown: 55, timer: 0, damage: 12, projectileCount: 3, projectileSpeed: 12, duration: 25, color: '#ffaa00', active: true
            };
        case 'boomerang':
            return {
                id: 'boomerang_starter', type: 'boomerang', name: 'Plasma Boomerang', rank: 1,
                cooldown: 150, timer: 0, damage: 20, projectileCount: 1, projectileSpeed: 12, duration: 120, color: '#00ff66', active: true
            };
        case 'pistol':
        default:
            return {
                id: 'pistol_starter', type: 'pistol', name: 'Pulse Pistol', rank: 1,
                cooldown: 25, timer: 0, damage: 15, projectileCount: 1, projectileSpeed: 10, duration: 60, color: '#00ffff', active: true
            };
    }
};

const UPGRADES_POOL: UpgradeOption[] = [
  // STAT UPGRADES (PASSIVE)
  {
    id: 'atk_spd',
    name: 'Rapid Fire',
    description: 'Increases attack speed of all weapons by 15%.',
    rarity: 'common',
    category: 'stat',
    maxRank: 5,
    apply: (p) => { 
        p.statModifiers.cooldown *= 0.85; 
        p.weapons.forEach(w => w.cooldown = Math.max(2, w.cooldown * 0.85)); 
    }
  },
  {
    id: 'dmg_up',
    name: 'High Caliber',
    description: 'Increases damage of all weapons by 20%.',
    rarity: 'common',
    category: 'stat',
    maxRank: 5,
    apply: (p) => { 
        p.statModifiers.damage *= 1.2; 
        p.weapons.forEach(w => w.damage *= 1.2); 
    }
  },
  {
    id: 'speed',
    name: 'Overclock',
    description: 'Increases movement speed by 10%.',
    rarity: 'common',
    category: 'stat',
    maxRank: 5,
    apply: (p) => { p.speed *= 1.1; }
  },
  {
    id: 'health',
    name: 'Nano-Repair',
    description: 'Heals 30 HP and increases Max HP by 20.',
    rarity: 'common',
    category: 'stat',
    maxRank: 10,
    apply: (p) => { p.maxHp += 20; p.hp = Math.min(p.maxHp, p.hp + 30); }
  },
  {
    id: 'range',
    name: 'Magnetism',
    description: 'Greatly increases XP pickup range.',
    rarity: 'rare',
    category: 'stat',
    maxRank: 3,
    apply: (p) => { p.pickupRange *= 1.5; }
  },
  {
    id: 'ability_cdr',
    name: 'Flux Capacitor',
    description: 'Reduces Active Ability cooldown by 20%.',
    rarity: 'rare',
    category: 'stat',
    maxRank: 3,
    apply: (p) => { p.abilityCooldown *= 0.8; }
  },

  // WEAPONS (ACTIVE) - Rank 1 Unlocks, Rank 2-5 Upgrades
  {
    id: 'weapon_sword',
    name: 'Rune Blade',
    description: 'Unlocks Sword or increases damage and attack speed.',
    rarity: 'rare',
    category: 'weapon',
    maxRank: 5,
    apply: (p) => {
      const existing = p.weapons.find(w => w.type === 'sword');
      if (!existing) {
        const w = getStarterWeapon('sword');
        w.damage *= p.statModifiers.damage;
        w.cooldown *= p.statModifiers.cooldown;
        p.weapons.push(w);
      } else {
        existing.rank++;
        existing.damage *= 1.3;
        existing.cooldown = Math.max(10, existing.cooldown * 0.9);
      }
    }
  },
  {
    id: 'weapon_shotgun',
    name: 'Void Shotgun',
    description: 'Unlocks Shotgun or upgrades projectile count and speed.',
    rarity: 'legendary',
    category: 'weapon',
    maxRank: 5,
    apply: (p) => {
      const existing = p.weapons.find(w => w.type === 'shotgun');
      if (!existing) {
        // Unlock: Apply global stats
        const w = getStarterWeapon('shotgun');
        w.damage *= p.statModifiers.damage;
        w.cooldown *= p.statModifiers.cooldown;
        p.weapons.push(w);
      } else {
        // Upgrade
        existing.rank++;
        existing.damage *= 1.2;
        existing.projectileCount += 1; // +1 bullet per rank
        existing.cooldown = Math.max(10, existing.cooldown - 5);
        if (existing.rank === 5) existing.projectileCount += 2; // Bonus for max
      }
    }
  },
  {
    id: 'weapon_orbital',
    name: 'Graviton Orbs',
    description: 'Unlocks Orbs or adds more orbs and increases rotation.',
    rarity: 'legendary',
    category: 'weapon',
    maxRank: 5,
    apply: (p) => {
      const existing = p.weapons.find(w => w.type === 'orbital');
      if (!existing) {
        p.weapons.push({
          id: `orbital_${Date.now()}`,
          type: 'orbital',
          name: 'Orbs',
          rank: 1,
          cooldown: 180 * p.statModifiers.cooldown,
          timer: 0,
          damage: 8 * p.statModifiers.damage,
          projectileCount: 2,
          projectileSpeed: 0,
          duration: 99999,
          color: '#ff00ff',
          active: true
        });
      } else {
        existing.rank++;
        existing.damage += 3;
        existing.projectileCount += 1; // +1 orb per rank
      }
    }
  },
  {
    id: 'weapon_boomerang',
    name: 'Plasma Boomerang',
    description: 'Unlocks Boomerang or reduces cooldown drastically.',
    rarity: 'rare',
    category: 'weapon',
    maxRank: 5,
    apply: (p) => {
      const existing = p.weapons.find(w => w.type === 'boomerang');
      if (!existing) {
        const w = getStarterWeapon('boomerang');
        w.damage *= p.statModifiers.damage;
        w.cooldown *= p.statModifiers.cooldown;
        p.weapons.push(w);
      } else {
        existing.rank++;
        existing.damage += 5;
        existing.cooldown = Math.max(30, existing.cooldown - 20); // Significant CD reduction
        if (existing.rank === 5) existing.projectileCount = 2; // Dual boomerangs at max
      }
    }
  },
  {
    id: 'weapon_molotov',
    name: 'Inferno Cocktail',
    description: 'Unlocks Molotov or increases fire duration and area size.',
    rarity: 'rare',
    category: 'weapon',
    maxRank: 5,
    apply: (p) => {
      const existing = p.weapons.find(w => w.type === 'molotov');
      if (!existing) {
        p.weapons.push({
          id: `molotov_${Date.now()}`,
          type: 'molotov',
          name: 'Molotov',
          rank: 1,
          cooldown: 120 * p.statModifiers.cooldown,
          timer: 0,
          damage: 5 * p.statModifiers.damage,
          projectileCount: 1,
          projectileSpeed: 8,
          duration: 40,
          color: '#ff4400',
          active: true
        });
      } else {
        existing.rank++;
        existing.damage += 2;
        existing.cooldown -= 10;
      }
    }
  },
  {
    id: 'weapon_lightning',
    name: 'Tesla Coil',
    description: 'Strikes enemies with lightning. Rank 3 & 5 add more bolts.',
    rarity: 'legendary',
    category: 'weapon',
    maxRank: 5,
    apply: (p) => {
       const existing = p.weapons.find(w => w.type === 'lightning');
       if (!existing) {
        // RANK 1: 2 Petir
        p.weapons.push({
          id: `lightning_${Date.now()}`,
          type: 'lightning',
          name: 'Tesla',
          rank: 1,
          cooldown: 45 * p.statModifiers.cooldown,
          timer: 0,
          damage: 30 * p.statModifiers.damage,
          projectileCount: 2, // Rank 1 = 2 petir
          projectileSpeed: 0,
          duration: 0,
          color: '#ccffff',
          active: true
        });
       } else {
         existing.rank++;
         if (existing.rank === 2) {
             existing.damage *= 1.5; // Rank 2: Damage Up
         } else if (existing.rank === 3) {
             existing.projectileCount = 3; // Rank 3: 3 Petir
         } else if (existing.rank === 4) {
             existing.damage *= 1.5; // Rank 4: Damage Up
         } else if (existing.rank === 5) {
             existing.projectileCount = 4; // Rank 5: 4 Petir
         }
       }
    }
  },
  
  // ABILITIES
  {
    id: 'ability_shield',
    name: 'Tech Shield',
    description: 'Ability: Swap Dash for a temporary Shield that absorbs damage.',
    rarity: 'legendary',
    category: 'ability',
    maxRank: 1,
    apply: (p) => { 
      p.activeAbility = 'shield'; 
      p.abilityCooldown = 300; 
      p.abilityTimer = 0;
    }
  },
  {
    id: 'ability_nova',
    name: 'Void Nova',
    description: 'Ability: Swap Dash for a massive screen-clearing explosion.',
    rarity: 'legendary',
    category: 'ability',
    maxRank: 1,
    apply: (p) => { 
      p.activeAbility = 'nova'; 
      p.abilityCooldown = 600; 
      p.abilityTimer = 0;
    }
  }
];

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.MENU);
  const [score, setScore] = useState(0);
  const [earnedCredits, setEarnedCredits] = useState(0);
  
  // Player Stats State
  const [playerHp, setPlayerHp] = useState(100);
  const [playerMaxHp, setPlayerMaxHp] = useState(100);
  const [playerXp, setPlayerXp] = useState(0);
  const [playerMaxXp, setPlayerMaxXp] = useState(100);
  const [playerLevel, setPlayerLevel] = useState(1);
  const [voidMessage, setVoidMessage] = useState<VoidEvent | null>(null);
  
  // Game Logic State
  const [currentUpgrades, setCurrentUpgrades] = useState<UpgradeDisplay[]>([]);
  const [upgradeCounts, setUpgradeCounts] = useState<Record<string, number>>({});
  const [gameSessionId, setGameSessionId] = useState(0); // Used to reset canvas
  const [gameTime, setGameTime] = useState("00:00");
  const [currentWave, setCurrentWave] = useState(1);
  const [currentMap, setCurrentMap] = useState<GameMap>(MAP_CONFIGS[0]);
  
  // Leaderboard & Profile State
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [isNewHighScore, setIsNewHighScore] = useState(false);
  const [startWeapon, setStartWeapon] = useState<WeaponType>('sword'); // Default to Sword
  const [userProfile, setUserProfile] = useState<UserProfile>(getUserProfile());

  // UI State for Ability
  const [abilityData, setAbilityData] = useState({ type: 'dash', cooldown: 100, maxCooldown: 100 });

  // Initial player reference
  const playerRef = useRef<Player>({ 
      id: 'p1', x: 0, y: 0, radius: 24, color: '#00ffcc', hp: 100, maxHp: 100, speed: 4, armor: 0, level: 1, xp: 0, xpToNextLevel: 100, pickupRange: 100, markedForDeletion: false, activeAbility: 'dash', abilityCooldown: 120, abilityTimer: 0, abilityActiveTimer: 0, 
      statModifiers: { damage: 1, cooldown: 1, xpMultiplier: 1 }, weapons: [],
      state: 'idle', frame: 0, frameTimer: 0, facing: 1
  });

  // Load Leaderboard on Menu
  useEffect(() => {
    if (gameState === GameState.MENU) {
        setLeaderboard(getMapLeaderboard(currentMap.id));
        setUserProfile(getUserProfile()); // Refresh profile
    }
  }, [gameState, currentMap]);

  const enterPreparation = () => {
      initAudio();
      setGameState(GameState.PREPARATION);
  };

  const launchGame = (starterWeaponType: WeaponType) => {
    setStartWeapon(starterWeaponType);
    
    // Calculate Stats based on Meta Upgrades
    const upgrades = userProfile.upgrades;
    const baseHp = 100 + (upgrades.health * 5); // 5 HP per rank
    const baseSpeed = 4 * (1 + (upgrades.speed * 0.01)); // 1% per rank
    const pickupRange = 100 * (1 + (upgrades.magnet * 0.02)); // 2% per rank
    const dmgMult = 1 + (upgrades.damage * 0.02); // 2% per rank
    const xpMult = 1 + (upgrades.xp * 0.02); // 2% per rank
    const armor = upgrades.armor * 0.5; // 0.5 flat damage reduction per rank

    // Initialize Player with chosen weapon and Meta Stats
    const starterWeapon = getStarterWeapon(starterWeaponType);
    starterWeapon.damage *= dmgMult; // Apply meta damage
    
    playerRef.current = { 
      id: 'player',
      x: window.innerWidth / 2, 
      y: window.innerHeight / 2,
      radius: 24,
      color: '#00ffcc',
      hp: baseHp,
      maxHp: baseHp,
      speed: baseSpeed,
      armor: armor,
      level: 1,
      xp: 0,
      xpToNextLevel: 100,
      pickupRange: pickupRange,
      markedForDeletion: false,
      activeAbility: 'dash',
      abilityCooldown: 120,
      abilityTimer: 0,
      abilityActiveTimer: 0,
      statModifiers: {
        damage: dmgMult,
        cooldown: 1,
        xpMultiplier: xpMult
      },
      weapons: [starterWeapon],
      state: 'idle',
      frame: 0,
      frameTimer: 0,
      facing: 1
    };
    
    // Seed upgrade counts
    const counts: Record<string, number> = {};
    if (starterWeaponType === 'sword') counts['weapon_sword'] = 1;
    if (starterWeaponType === 'shotgun') counts['weapon_shotgun'] = 1;
    if (starterWeaponType === 'boomerang') counts['weapon_boomerang'] = 1;

    setUpgradeCounts(counts);
    setScore(0);
    setPlayerLevel(1);
    setPlayerXp(0);
    setVoidMessage(null);
    setGameTime("00:00");
    setCurrentWave(1);
    setGameSessionId(prev => prev + 1); // Triggers remount of GameCanvas
    setGameState(GameState.PLAYING);
  };

  const handleLevelUp = useCallback((player: Player) => {
    // Filter upgrades: Current count < Max Rank
    const available = UPGRADES_POOL.filter(opt => {
        const count = upgradeCounts[opt.id] || 0;
        return count < opt.maxRank;
    });

    // Select 3 random valid upgrades
    const shuffled = [...available].sort(() => 0.5 - Math.random());
    const selected = shuffled.slice(0, 3);
    
    // Map to Display object
    const displayOptions = selected.map(opt => {
        const currentRank = upgradeCounts[opt.id] || 0;
        return {
            ...opt,
            currentRank,
            // Visually indicate if this is the final upgrade
            isMax: currentRank + 1 >= opt.maxRank
        };
    });

    setCurrentUpgrades(displayOptions);
    setGameState(GameState.LEVEL_UP);
    setPlayerLevel(player.level);
  }, [upgradeCounts]);

  const handleSelectUpgrade = (opt: UpgradeOption) => {
    opt.apply(playerRef.current);
    
    // Update Counts
    setUpgradeCounts(prev => ({
        ...prev,
        [opt.id]: (prev[opt.id] || 0) + 1
    }));

    setGameState(GameState.PLAYING);
  };

  const handleGameOver = (finalScore: number, kills: number) => {
    setScore(finalScore);
    const newRecord = isHighScore(finalScore, currentMap.id);
    setIsNewHighScore(newRecord);
    
    // Calculate Credits (1 Enemy Kill = 50 Points BASE * Map Multiplier)
    const basePoints = 50;
    const credits = Math.floor(kills * basePoints * currentMap.creditsMultiplier);
    setEarnedCredits(credits);

    // Save Meta Progression
    const currentProfile = getUserProfile();
    currentProfile.credits += credits;
    saveUserProfile(currentProfile);
    setUserProfile(currentProfile); // Sync state

    setGameState(GameState.GAME_OVER);
  };

  const handleQuitGame = () => {
    setGameState(GameState.MENU);
  };

  const handleSaveScore = (name: string) => {
      saveScore({
          name: name || "Survivor",
          score: score,
          wave: currentWave,
          mapId: currentMap.id,
          mapName: currentMap.name,
          date: new Date().toLocaleDateString(),
          weapon: startWeapon
      });
      // Refresh leaderboard for menu
      setLeaderboard(getMapLeaderboard(currentMap.id));
  };

  // Helper to update React state from Canvas loop
  const syncPlayerStats = (xp: number, maxXp: number, abilityType: string, abTimer: number, abMax: number) => {
      setPlayerXp(xp);
      setPlayerMaxXp(maxXp);
      setAbilityData({
        type: abilityType,
        cooldown: abTimer,
        maxCooldown: abMax
      });
  };

  // --- META SHOP HANDLERS ---
  const handleBuyMetaUpgrade = (id: MetaUpgradeId) => {
      const config = META_UPGRADES.find(u => u.id === id);
      if (!config) return;
      
      const currentRank = userProfile.upgrades[id];
      if (currentRank >= config.maxRank) return;

      const cost = Math.floor(config.baseCost * Math.pow(config.costScale, currentRank));
      if (userProfile.credits >= cost) {
          const newProfile = { ...userProfile };
          newProfile.credits -= cost;
          newProfile.upgrades[id]++;
          saveUserProfile(newProfile);
          setUserProfile(newProfile);
      }
  };

  return (
    <div className="relative w-full h-screen bg-gray-900 overflow-hidden">
      <GameCanvas 
        key={gameSessionId}
        gameState={gameState}
        setGameState={setGameState}
        onLevelUp={handleLevelUp}
        onGameOver={handleGameOver}
        playerRef={playerRef}
        setScore={setScore}
        setPlayerHp={setPlayerHp}
        setPlayerMaxHp={setPlayerMaxHp}
        setPlayerStats={syncPlayerStats}
        setVoidMessage={setVoidMessage}
        setGameTime={setGameTime}
        setWave={setCurrentWave}
        currentMap={currentMap}
      />
      <UIOverlay 
        gameState={gameState}
        score={score}
        hp={playerHp}
        maxHp={playerMaxHp}
        xp={playerXp}
        maxXp={playerMaxXp}
        level={playerLevel}
        abilityType={abilityData.type}
        abilityCooldown={abilityData.cooldown}
        abilityMaxCooldown={abilityData.maxCooldown}
        voidMessage={voidMessage}
        upgradeOptions={currentUpgrades}
        onSelectUpgrade={handleSelectUpgrade}
        onRestart={enterPreparation}
        onStart={enterPreparation}
        onLaunch={launchGame}
        onResume={() => setGameState(GameState.PLAYING)}
        onQuit={handleQuitGame}
        gameTime={gameTime}
        wave={currentWave}
        maps={MAP_CONFIGS}
        onSelectMap={(map) => { setCurrentMap(map); setLeaderboard(getMapLeaderboard(map.id)); }}
        currentMap={currentMap}
        leaderboard={leaderboard}
        isNewHighScore={isNewHighScore}
        onSaveScore={handleSaveScore}
        // Meta Shop
        userProfile={userProfile}
        metaUpgrades={META_UPGRADES}
        onBuyMetaUpgrade={handleBuyMetaUpgrade}
        onCloseShop={() => setGameState(GameState.MENU)}
        onOpenShop={() => setGameState(GameState.SHOP)}
        earnedCredits={earnedCredits}
      />
    </div>
  );
};

export default App;
