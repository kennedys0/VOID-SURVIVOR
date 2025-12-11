import React, { useRef, useEffect, useCallback } from 'react';
import { Player, Enemy, Projectile, Loot, GameState, VoidEvent, Particle, GameMap, Hazard, DamageIndicator } from '../types';
import { generateVoidEvent } from '../services/geminiService';
import { playSound } from '../services/audioService';

interface GameCanvasProps {
  gameState: GameState;
  setGameState: (state: GameState) => void;
  onLevelUp: (player: Player) => void;
  onGameOver: (score: number, kills: number) => void;
  playerRef: React.MutableRefObject<Player>;
  setScore: (score: number) => void;
  setPlayerHp: (hp: number) => void;
  setPlayerMaxHp: (hp: number) => void;
  setPlayerStats: (xp: number, maxXp: number, abType: string, abTimer: number, abMax: number) => void;
  setVoidMessage: (msg: VoidEvent | null) => void;
  setGameTime: (time: string) => void;
  setWave: (wave: number) => void;
  currentMap: GameMap;
}

// WAVE CONFIGURATION
type WaveConfig = {
    spawnInterval: number;
    weights: { basic: number; rusher: number; swarmer: number; goliath: number };
};

const getWaveConfig = (minutes: number, seconds: number): WaveConfig => {
    const totalSeconds = minutes * 60 + seconds;
    const cycleSeconds = totalSeconds % 180; // 3 minute cycle for bosses

    // PHASE 1: BOSS PHASE (First 30s of every 3rd minute)
    // 3:00-3:30, 6:00-6:30. Low spawn rate to focus on boss.
    const isBossPhase = totalSeconds > 60 && cycleSeconds >= 0 && cycleSeconds < 30;
    
    // PHASE 2: POST-BOSS SURGE (Next 20s after Boss Phase)
    // 3:30-3:50, 6:30-6:50. INSANE spawn rate.
    const isSurgePhase = totalSeconds > 60 && cycleSeconds >= 30 && cycleSeconds < 50;

    if (isBossPhase) {
        return { 
            spawnInterval: 80, 
            weights: { basic: 0, rusher: 0, swarmer: 100, goliath: 0 } 
        };
    }

    if (isSurgePhase) {
        return {
            spawnInterval: 5, // Spawn every 5 frames (approx 12 enemies per second)
            weights: { basic: 40, rusher: 30, swarmer: 20, goliath: 10 }
        };
    }

    // NORMAL WAVE PROGRESSION
    if (minutes === 0) { 
        return { spawnInterval: 50, weights: { basic: 80, swarmer: 20, rusher: 0, goliath: 0 } };
    } else if (minutes === 1) { 
        return { spawnInterval: 40, weights: { basic: 50, swarmer: 30, rusher: 20, goliath: 0 } };
    } else if (minutes === 2) { 
        return { spawnInterval: 30, weights: { basic: 40, swarmer: 20, rusher: 20, goliath: 20 } };
    } else { 
        // Late game scaling (minutes 3+) - if not in boss/surge phase
        const extraDiff = Math.min(20, (minutes - 3) * 5);
        return { spawnInterval: Math.max(10, 25 - extraDiff), weights: { basic: 30, swarmer: 30, rusher: 30, goliath: 10 } };
    }
};

const GameCanvas: React.FC<GameCanvasProps> = ({
  gameState,
  setGameState,
  onLevelUp,
  onGameOver,
  playerRef,
  setScore,
  setPlayerHp,
  setPlayerMaxHp,
  setPlayerStats,
  setVoidMessage,
  setGameTime,
  setWave,
  currentMap
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(0);
  
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const lootRef = useRef<Loot[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const hazardsRef = useRef<Hazard[]>([]);
  const damageIndicatorsRef = useRef<DamageIndicator[]>([]);

  const keysPressed = useRef<{ [key: string]: boolean }>({});
  const mousePos = useRef<{x: number, y: number}>({x: 0, y: 0});
  
  const shakeRef = useRef(0);
  const damageFeedbackTimer = useRef(0);
  const scoreRef = useRef(0);
  const killsRef = useRef(0); // Track kills for meta currency
  const spawnTimerRef = useRef(0);
  const totalTimeRef = useRef(0);
  
  const spawnRateRef = useRef(60);
  const enemySpeedMultRef = useRef(1);
  const difficultyMultiplierRef = useRef(1);

  // Initialize Map Hazards
  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = canvasRef.current;
    
    hazardsRef.current = [];
    if (currentMap.hazardType === 'lava_pools') {
        for(let i = 0; i < 5; i++) {
            hazardsRef.current.push({
                id: `lava_${i}`,
                x: Math.random() * canvas.width,
                y: Math.random() * canvas.height,
                radius: 60 + Math.random() * 40,
                color: '#ff4400',
                markedForDeletion: false,
                type: 'lava',
                damage: 0.2
            });
        }
    }
  }, [currentMap]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => { 
        keysPressed.current[e.code] = true; 
        
        if (e.code === 'Escape') {
            if (gameState === GameState.PLAYING) {
                setGameState(GameState.PAUSED);
            } else if (gameState === GameState.PAUSED) {
                setGameState(GameState.PLAYING);
            }
        }
    };
    const handleKeyUp = (e: KeyboardEvent) => { keysPressed.current[e.code] = false; };
    const handleMouseMove = (e: MouseEvent) => { mousePos.current = { x: e.clientX, y: e.clientY }; };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, [gameState, setGameState]);

  const triggerVoidEvent = useCallback(async () => {
    if (gameState !== GameState.PLAYING) return;
    const event = await generateVoidEvent(playerRef.current.level, scoreRef.current, playerRef.current.hp / playerRef.current.maxHp);
    setVoidMessage(event);
    if (event.modifier.enemySpeedMultiplier) enemySpeedMultRef.current = event.modifier.enemySpeedMultiplier;
    setTimeout(() => setVoidMessage(null), 5000);
  }, [gameState, playerRef, setVoidMessage]);

  const spawnParticles = (x: number, y: number, color: string, count: number, speed: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * speed;
      particlesRef.current.push({
        id: Math.random().toString(),
        x,
        y,
        vx: Math.cos(angle) * velocity,
        vy: Math.sin(angle) * velocity,
        life: 1.0,
        decay: 0.02 + Math.random() * 0.03,
        color,
        radius: Math.random() * 2 + 1,
        markedForDeletion: false
      });
    }
  };

  const spawnDamageIndicator = (x: number, y: number, value: number, isPlayerDamage: boolean, isCrit: boolean = false) => {
      damageIndicatorsRef.current.push({
          id: Math.random().toString(),
          x: x + (Math.random() - 0.5) * 20,
          y: y - 10,
          value: Math.ceil(value),
          life: 1.0,
          vx: (Math.random() - 0.5) * 1,
          vy: -1.5, // Float up
          color: isPlayerDamage ? '#ff0000' : (isCrit ? '#ffff00' : '#ffffff'),
          scale: 1,
          isCrit
      });
  };

  const triggerAbility = () => {
    const p = playerRef.current;
    if (p.abilityTimer > 0) return;
    p.abilityTimer = p.abilityCooldown;

    if (p.activeAbility === 'dash') {
        p.abilityActiveTimer = 15; 
        spawnParticles(p.x, p.y, '#00ffcc', 10, 2);
        playSound.dash();
    } else if (p.activeAbility === 'shield') {
        p.abilityActiveTimer = 180;
        spawnParticles(p.x, p.y, '#0088ff', 10, 1);
        playSound.shield();
    } else if (p.activeAbility === 'nova') {
        p.abilityActiveTimer = 10;
        shakeRef.current = 30;
        playSound.nova();
        const dmg = p.weapons[0].damage * 20;
        enemiesRef.current.forEach(enemy => {
            enemy.hp -= dmg;
            spawnDamageIndicator(enemy.x, enemy.y, dmg, false, true);
            const angle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
            const force = 150 * (1 - enemy.knockbackResist);
            enemy.x += Math.cos(angle) * force;
            enemy.y += Math.sin(angle) * force;
            spawnParticles(enemy.x, enemy.y, '#aa00ff', 5, 5);
        });
        spawnParticles(p.x, p.y, '#aa00ff', 50, 10);
    }
  };

  const spawnEnemyUnit = (type: 'basic' | 'rusher' | 'goliath' | 'swarmer' | 'boss', canvas: HTMLCanvasElement, xpMult: number = 1.0) => {
      const edge = Math.floor(Math.random() * 4);
      let ex = 0, ey = 0;
      const buffer = 50;
      switch(edge) {
        case 0: ex = Math.random() * canvas.width; ey = -buffer; break;
        case 1: ex = canvas.width + buffer; ey = Math.random() * canvas.height; break;
        case 2: ex = Math.random() * canvas.width; ey = canvas.height + buffer; break;
        case 3: ex = -buffer; ey = Math.random() * canvas.height; break;
      }

      // GLOBAL SCALING
      const mult = difficultyMultiplierRef.current;
      const speedMult = enemySpeedMultRef.current;
      
      // WAVE SCALING: Enemies get 20% stronger HP/DMG per wave
      const currentWaveIndex = Math.floor(totalTimeRef.current / 3600); // 0 = Wave 1, 1 = Wave 2
      const wavePower = 1 + (currentWaveIndex * 0.2);
      
      // MAP SCALING (Difficulty Adjustment)
      let mapHpMod = 1.0;
      let mapDmgMod = 1.0;
      let mapSpeedMod = 1.0;

      if (currentMap.id === 'void') {
          // NERF: Easier start
          mapHpMod = 0.8;
          mapDmgMod = 0.6; 
          mapSpeedMod = 0.9;
      } else if (currentMap.id === 'crimson_waste') {
          // BUFF: Extreme
          mapHpMod = 1.4;
          mapDmgMod = 1.5;
          mapSpeedMod = 1.15;
      } else {
          // Neon City (Baseline)
          mapHpMod = 1.1;
          mapDmgMod = 1.0;
      }

      const finalHpMult = mult * wavePower * mapHpMod;
      const finalDmgMult = wavePower * mapDmgMod;

      let stats = { hp: 10, maxHp: 10, speed: 2, radius: 10, color: '#ff00ff', damage: 10, value: 10, knockbackResist: 0 };

      if (type === 'boss') {
          playSound.bossSpawn();
          setVoidMessage({ title: "WARNING", message: "A LEVIATHAN APPROACHES", modifier: {} });
          setTimeout(() => setVoidMessage(null), 3000);
          stats = { hp: 5000 * finalHpMult, maxHp: 5000 * finalHpMult, speed: 1.0 * speedMult * mapSpeedMod, radius: 45, color: '#ff0000', damage: 50 * finalDmgMult, value: 2000 * xpMult, knockbackResist: 1 };
      } else if (type === 'rusher') {
          stats = { hp: 8 * finalHpMult, maxHp: 8 * finalHpMult, speed: 4.5 * speedMult * mapSpeedMod, radius: 9, color: '#ffeb3b', damage: 15 * finalDmgMult, value: 25 * xpMult, knockbackResist: 0.2 };
      } else if (type === 'goliath') {
          stats = { hp: 80 * finalHpMult, maxHp: 80 * finalHpMult, speed: 0.8 * speedMult * mapSpeedMod, radius: 20, color: '#ff4444', damage: 30 * finalDmgMult, value: 100 * xpMult, knockbackResist: 0.9 };
      } else if (type === 'swarmer') {
          stats = { hp: 4 * finalHpMult, maxHp: 4 * finalHpMult, speed: 3 * speedMult * mapSpeedMod, radius: 6, color: '#00ffaa', damage: 5 * finalDmgMult, value: 2 * xpMult, knockbackResist: 0 };
          ex += (Math.random() - 0.5) * 40;
          ey += (Math.random() - 0.5) * 40;
      } else {
          stats = { hp: 15 * finalHpMult, maxHp: 15 * finalHpMult, speed: 2 * speedMult * mapSpeedMod, radius: 12, color: '#8800ff', damage: 10 * finalDmgMult, value: 10 * xpMult, knockbackResist: 0 };
      }

      enemiesRef.current.push({
          id: Math.random().toString(),
          x: ex,
          y: ey,
          markedForDeletion: false,
          type: type,
          ...stats
      });
  };

  const animate = (time: number) => {
    requestRef.current = requestAnimationFrame(animate);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gameState === GameState.PREPARATION || gameState === GameState.MENU || gameState === GameState.SHOP) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        return;
    }

    if (gameState === GameState.PAUSED || gameState === GameState.LEVEL_UP || gameState === GameState.GAME_OVER) {
        return;
    }

    totalTimeRef.current++;

    // --- GAME LOGIC ---

    // Timer & Wave Logic (Update UI every 30 frames)
    if (totalTimeRef.current % 30 === 0) {
        const seconds = Math.floor(totalTimeRef.current / 60);
        const minutes = Math.floor(seconds / 60);
        const dispSeconds = seconds % 60;
        setGameTime(`${minutes}:${dispSeconds < 10 ? '0' : ''}${dispSeconds}`);
        
        // Update Wave
        const wave = minutes + 1;
        setWave(wave);

        // Sync Stats to App state
        setPlayerStats(
          playerRef.current.xp, 
          playerRef.current.xpToNextLevel,
          playerRef.current.activeAbility,
          playerRef.current.abilityTimer,
          playerRef.current.abilityCooldown
        );
        setPlayerHp(playerRef.current.hp);
        setPlayerMaxHp(playerRef.current.maxHp);
    }
    
    // Difficulty Scaling (Time Based)
    if (totalTimeRef.current % 1800 === 0) { // Every 30s
        difficultyMultiplierRef.current += 0.1;
        triggerVoidEvent();
    }

    // Boss Spawn (Every 3 mins: 3:00, 6:00, etc.)
    if (totalTimeRef.current > 0 && totalTimeRef.current % 10800 === 0) {
        spawnEnemyUnit('boss', canvas);
        shakeRef.current = 50;
    }

    const minutes = Math.floor(totalTimeRef.current / 3600);
    const seconds = Math.floor((totalTimeRef.current % 3600) / 60);
    const waveConfig = getWaveConfig(minutes, seconds);
    
    // MAP SPAWN RATE MODIFIERS
    let spawnInterval = waveConfig.spawnInterval;
    if (currentMap.id === 'crimson_waste') {
        spawnInterval = Math.max(2, Math.floor(spawnInterval * 0.7)); // 30% faster spawns for extreme map
    }
    spawnRateRef.current = spawnInterval;

    // Spawning Enemies
    spawnTimerRef.current++;
    if (spawnTimerRef.current >= spawnRateRef.current) {
        spawnTimerRef.current = 0;
        const rand = Math.random() * 100;
        const w = waveConfig.weights;
        let type: 'basic' | 'rusher' | 'swarmer' | 'goliath' = 'basic';
        
        if (rand < w.swarmer) type = 'swarmer';
        else if (rand < w.swarmer + w.rusher) type = 'rusher';
        else if (rand < w.swarmer + w.rusher + w.goliath) type = 'goliath';
        
        // XP Multiplier increases over time
        const xpMult = 1 + (minutes * 0.1); 
        spawnEnemyUnit(type, canvas, xpMult);
        if (type === 'swarmer') {
             spawnEnemyUnit('swarmer', canvas, xpMult);
             spawnEnemyUnit('swarmer', canvas, xpMult);
        }
    }

    // Player Movement
    const p = playerRef.current;
    let dx = 0, dy = 0;
    if (keysPressed.current['KeyW'] || keysPressed.current['ArrowUp']) dy -= 1;
    if (keysPressed.current['KeyS'] || keysPressed.current['ArrowDown']) dy += 1;
    if (keysPressed.current['KeyA'] || keysPressed.current['ArrowLeft']) dx -= 1;
    if (keysPressed.current['KeyD'] || keysPressed.current['ArrowRight']) dx += 1;

    // Normalize diagonal
    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx*dx + dy*dy);
        dx /= len;
        dy /= len;
    }

    const moveSpeed = p.activeAbility === 'dash' && p.abilityActiveTimer > 0 ? p.speed * 3 : p.speed;
    p.x = Math.max(p.radius, Math.min(canvas.width - p.radius, p.x + dx * moveSpeed));
    p.y = Math.max(p.radius, Math.min(canvas.height - p.radius, p.y + dy * moveSpeed));

    // Map Hazards Logic
    if (currentMap.hazardType === 'electric_walls') {
        const margin = 20;
        if (p.x <= margin || p.x >= canvas.width - margin || p.y <= margin || p.y >= canvas.height - margin) {
             if (totalTimeRef.current % 30 === 0) {
                 const dmg = 5;
                 p.hp -= dmg;
                 spawnDamageIndicator(p.x, p.y, dmg, true);
                 shakeRef.current += 5;
                 playSound.playerHit();
                 spawnParticles(p.x, p.y, '#ffff00', 5, 5);
             }
        }
    }
    
    // Lava Pools Logic
    hazardsRef.current.forEach(lava => {
        const dist = Math.hypot(p.x - lava.x, p.y - lava.y);
        if (dist < lava.radius) {
            if (totalTimeRef.current % 20 === 0) {
                 const dmg = 2;
                 p.hp -= dmg;
                 spawnDamageIndicator(p.x, p.y, dmg, true);
                 spawnParticles(p.x, p.y, '#ff4400', 2, 2);
            }
        }
    });

    // Ability Logic
    if (keysPressed.current['Space']) triggerAbility();
    if (p.abilityTimer > 0) p.abilityTimer--;
    if (p.abilityActiveTimer > 0) p.abilityActiveTimer--;

    // Weapon Logic
    p.weapons.forEach(weapon => {
        if (!weapon.active) return;
        weapon.timer--;
        
        // Sync Orbitals (Positioning)
        if (weapon.type === 'orbital') {
            const orbitalProjs = projectilesRef.current.filter(proj => proj.behavior === 'orbital' && proj.id.startsWith(weapon.id));
            const needed = weapon.projectileCount;
            const current = orbitalProjs.length;
            const isMax = weapon.rank >= 5;

            // Spawn missing
            if (current < needed) {
                for (let i = 0; i < needed - current; i++) {
                    projectilesRef.current.push({
                        id: `${weapon.id}_${Math.random()}`,
                        x: p.x, y: p.y,
                        vx: 0, vy: 0,
                        radius: 8,
                        color: weapon.color,
                        damage: weapon.damage,
                        duration: weapon.duration,
                        pierce: 999,
                        behavior: 'orbital',
                        orbitRadius: 80,
                        orbitAngle: (i / needed) * Math.PI * 2,
                        markedForDeletion: false,
                        isMaxRank: isMax
                    });
                }
            }

            // Update positions and visual state
            const speed = 0.05 + (weapon.rank * 0.01);
            orbitalProjs.forEach((proj, idx) => {
                 // Even spacing
                 const offset = (idx / needed) * Math.PI * 2;
                 const globalAngle = (totalTimeRef.current * speed) + offset;
                 proj.x = p.x + Math.cos(globalAngle) * 80;
                 proj.y = p.y + Math.sin(globalAngle) * 80;
                 // Update stats in case of upgrade
                 proj.damage = weapon.damage;
                 proj.isMaxRank = isMax;
            });
            return; // Orbitals handled
        }
        
        // Fire other weapons
        if (weapon.timer <= 0) {
            const targets = enemiesRef.current;
            const isMax = weapon.rank >= 5;

            if (weapon.type === 'lightning') {
                 // Hitscan logic
                 const range = 250;
                 let hits = 0;
                 // Sort by distance
                 const inRange = targets
                    .map(e => ({ e, dist: Math.hypot(e.x - p.x, e.y - p.y) }))
                    .filter(item => item.dist < range)
                    .sort((a, b) => a.dist - b.dist);
                 
                 for (let i = 0; i < Math.min(weapon.projectileCount, inRange.length); i++) {
                     const target = inRange[i].e;
                     target.hp -= weapon.damage;
                     spawnDamageIndicator(target.x, target.y, weapon.damage, false, isMax);
                     spawnParticles(target.x, target.y, weapon.color, 3, 3);
                     // Visual Beam
                     projectilesRef.current.push({
                         id: Math.random().toString(), x: p.x, y: p.y, vx: target.x, vy: target.y, // vx/vy used as end point for line
                         radius: 1, color: weapon.color, damage: 0, duration: 5, pierce: 0, behavior: 'lightning', markedForDeletion: false, isMaxRank: isMax
                     });
                     playSound.shootLightning();
                 }
                 weapon.timer = weapon.cooldown;
                 return;
            }

            let closest: Enemy | null = null;
            let minDist = Infinity;
            targets.forEach(e => {
                const d = Math.hypot(e.x - p.x, e.y - p.y);
                if (d < minDist) { minDist = d; closest = e; }
            });

            if (closest || weapon.type === 'shotgun' || weapon.type === 'molotov' || weapon.type === 'boomerang') {
                let angle = closest ? Math.atan2(closest.y - p.y, closest.x - p.x) : Math.random() * Math.PI * 2;
                
                if (weapon.type === 'shotgun') {
                    for(let i=0; i<weapon.projectileCount; i++) {
                        const spread = (Math.random() - 0.5) * 0.8; 
                        const speed = weapon.projectileSpeed * (0.8 + Math.random() * 0.4);
                        projectilesRef.current.push({
                            id: Math.random().toString(),
                            x: p.x, y: p.y,
                            vx: Math.cos(angle + spread) * speed,
                            vy: Math.sin(angle + spread) * speed,
                            radius: 4, color: weapon.color, damage: weapon.damage, duration: weapon.duration, pierce: 2, behavior: 'straight', markedForDeletion: false,
                            isMaxRank: isMax
                        });
                    }
                    playSound.shootShotgun();
                } 
                else if (weapon.type === 'boomerang') {
                    const count = weapon.rank === 5 ? 2 : 1;
                    for(let i=0; i<count; i++) {
                        const offset = i === 1 ? Math.PI : 0;
                        projectilesRef.current.push({
                            id: Math.random().toString(),
                            x: p.x, y: p.y,
                            vx: Math.cos(angle + offset) * weapon.projectileSpeed,
                            vy: Math.sin(angle + offset) * weapon.projectileSpeed,
                            radius: 6, color: weapon.color, damage: weapon.damage, duration: weapon.duration, pierce: 999, behavior: 'boomerang', returnSpeed: 0.5, markedForDeletion: false,
                            isMaxRank: isMax
                        });
                    }
                    playSound.shootBoomerang();
                }
                else if (weapon.type === 'molotov') {
                    // Lob to a random position near closest enemy or random
                    const targetX = closest ? closest.x + (Math.random()-0.5)*50 : p.x + (Math.random()-0.5)*200;
                    const targetY = closest ? closest.y + (Math.random()-0.5)*50 : p.y + (Math.random()-0.5)*200;
                    // Calculate velocity to reach target in fixed frames (e.g. 30)
                    const frames = 30;
                    const vx = (targetX - p.x) / frames;
                    const vy = (targetY - p.y) / frames;
                    
                    projectilesRef.current.push({
                        id: Math.random().toString(),
                        x: p.x, y: p.y,
                        vx: vx, vy: vy,
                        radius: 6, color: weapon.color, damage: weapon.damage, duration: frames, pierce: 0, behavior: 'lob', aoeRadius: 40 + (weapon.rank * 10), markedForDeletion: false,
                        isMaxRank: isMax
                    });
                }
                else { // Pistol
                    projectilesRef.current.push({
                        id: Math.random().toString(),
                        x: p.x, y: p.y,
                        vx: Math.cos(angle) * weapon.projectileSpeed,
                        vy: Math.sin(angle) * weapon.projectileSpeed,
                        radius: 5, color: weapon.color, damage: weapon.damage, duration: weapon.duration, pierce: 1, behavior: 'straight', markedForDeletion: false,
                        isMaxRank: isMax
                    });
                    playSound.shootPistol();
                }
                weapon.timer = weapon.cooldown;
            }
        }
    });

    // Update Projectiles
    projectilesRef.current.forEach(proj => {
        if (proj.behavior === 'orbital') {
            spawnParticles(proj.x, proj.y, proj.color, 1, 0.5);
            return; // Movement handled in weapon loop
        }
        
        if (proj.behavior === 'lightning') {
            proj.duration--;
            if (proj.duration <= 0) proj.markedForDeletion = true;
            return;
        }

        if (proj.behavior === 'hazard') {
            proj.duration--;
            // AOE Damage tick
            if (proj.duration % 10 === 0) {
                 enemiesRef.current.forEach(e => {
                     const d = Math.hypot(e.x - proj.x, e.y - proj.y);
                     if (d < (proj.aoeRadius || 40)) {
                         e.hp -= proj.damage * 0.2; // Dot damage
                         // Don't spawn numbers for every tick of DOT, too spammy
                         if (Math.random() < 0.3) spawnDamageIndicator(e.x, e.y, proj.damage * 0.2, false);
                     }
                 });
            }
            if (proj.duration <= 0) proj.markedForDeletion = true;
            return;
        }

        proj.x += proj.vx;
        proj.y += proj.vy;
        proj.duration--;

        if (proj.behavior === 'boomerang') {
             // Slow down then return
             proj.vx *= 0.95;
             proj.vy *= 0.95;
             if (proj.duration < 60) { // Returning phase
                 const angle = Math.atan2(p.y - proj.y, p.x - proj.x);
                 const speed = 8;
                 proj.vx = Math.cos(angle) * speed;
                 proj.vy = Math.sin(angle) * speed;
                 if (Math.hypot(p.x - proj.x, p.y - proj.y) < 20) proj.markedForDeletion = true;
             }
             // Rotation visual
             spawnParticles(proj.x, proj.y, proj.color, 1, 0.5);
        }
        else if (proj.behavior === 'lob') {
             if (proj.duration <= 0) {
                 proj.markedForDeletion = true;
                 // Spawn Hazard
                 playSound.explosionMolotov();
                 const isMax = proj.isMaxRank;
                 const voidColor = '#d946ef'; // Purple Void Fire
                 projectilesRef.current.push({
                     id: `hazard_${Math.random()}`,
                     x: proj.x, y: proj.y,
                     vx: 0, vy: 0,
                     radius: proj.aoeRadius || 40,
                     color: isMax ? voidColor : '#ff4400',
                     damage: proj.damage,
                     duration: 180, // 3 seconds
                     pierce: 999,
                     behavior: 'hazard',
                     aoeRadius: proj.aoeRadius,
                     markedForDeletion: false,
                     isMaxRank: isMax
                 });
                 // Explosion particles
                 spawnParticles(proj.x, proj.y, isMax ? voidColor : '#ffaa00', 20, 3);
             }
             // Arc effect visual (scale based on duration mid-point)
        }
        else if (proj.behavior === 'straight') {
             if (proj.duration <= 0) proj.markedForDeletion = true;
        }
        
        // Remove if off screen (padding 100)
        if (proj.x < -100 || proj.x > canvas.width + 100 || proj.y < -100 || proj.y > canvas.height + 100) {
            proj.markedForDeletion = true;
        }
    });

    // Update Enemies
    enemiesRef.current.forEach(enemy => {
        // Move towards player
        const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
        
        // Wall repulsion
        let pushX = 0;
        let pushY = 0;
        
        // Basic flocking/separation (optional optimization)
        enemiesRef.current.forEach(other => {
            if (enemy === other) return;
            const dx = enemy.x - other.x;
            const dy = enemy.y - other.y;
            const dist = Math.hypot(dx, dy);
            if (dist < enemy.radius + other.radius) {
                pushX += dx / dist;
                pushY += dy / dist;
            }
        });

        enemy.x += (Math.cos(angle) * enemy.speed) + (pushX * 0.1);
        enemy.y += (Math.sin(angle) * enemy.speed) + (pushY * 0.1);
        
        // Hazard Collision (Lava/Electric)
        if (currentMap.hazardType === 'electric_walls') {
            const margin = 20;
            if (enemy.x <= margin || enemy.x >= canvas.width - margin || enemy.y <= margin || enemy.y >= canvas.height - margin) {
                 // Push towards center
                 enemy.x += (canvas.width/2 - enemy.x) * 0.05; 
                 enemy.y += (canvas.height/2 - enemy.y) * 0.05;
            }
        }
        hazardsRef.current.forEach(lava => {
             if (Math.hypot(enemy.x - lava.x, enemy.y - lava.y) < lava.radius) {
                 enemy.x -= Math.cos(angle) * enemy.speed * 0.5; // Slow down
                 enemy.hp -= lava.damage;
                 if (Math.random() < 0.1) spawnDamageIndicator(enemy.x, enemy.y, lava.damage, false);
             }
        });

        // Collision with Projectiles
        projectilesRef.current.forEach(proj => {
            if (proj.markedForDeletion || proj.behavior === 'lob') return; // Lobs don't hit until land
            if (proj.behavior === 'hazard') return; // Hazards handled in tick
            if (proj.behavior === 'lightning') return; // Handled instantly

            const dist = Math.hypot(enemy.x - proj.x, enemy.y - proj.y);
            const hitDist = enemy.radius + proj.radius;
            
            if (dist < hitDist) {
                enemy.hp -= proj.damage;
                spawnDamageIndicator(enemy.x, enemy.y, proj.damage, false, proj.isMaxRank);
                playSound.hit();
                spawnParticles(enemy.x, enemy.y, '#ffffff', 2, 2);
                
                // Knockback
                if (enemy.knockbackResist < 1) {
                    const kb = 5 * (1 - enemy.knockbackResist);
                    enemy.x += proj.vx * kb;
                    enemy.y += proj.vy * kb;
                }

                if (proj.pierce > 0) {
                    proj.pierce--;
                    if (proj.pierce <= 0) proj.markedForDeletion = true;
                }
            }
        });

        // Collision with Player
        const distToPlayer = Math.hypot(p.x - enemy.x, p.y - enemy.y);
        if (distToPlayer < p.radius + enemy.radius) {
            // Damage
            const isDashing = p.activeAbility === 'dash' && p.abilityActiveTimer > 0;
            
            if (damageFeedbackTimer.current <= 0 && !isDashing) {
                if (p.activeAbility === 'shield' && p.abilityActiveTimer > 0) {
                     // Blocked
                     p.abilityActiveTimer = 0; // Shield breaks
                     spawnParticles(p.x, p.y, '#0088ff', 15, 3);
                     damageFeedbackTimer.current = 30; // IFrames
                     spawnDamageIndicator(p.x, p.y, 0, false); // Blocked
                } else {
                    p.hp -= enemy.damage;
                    spawnDamageIndicator(p.x, p.y, enemy.damage, true);
                    playSound.playerHit();
                    shakeRef.current = 10;
                    damageFeedbackTimer.current = 30; // IFrames
                    spawnParticles(p.x, p.y, '#ff0000', 10, 3);
                }
            }
        }

        if (enemy.hp <= 0) {
            enemy.markedForDeletion = true;
            scoreRef.current += 10;
            killsRef.current += 1; // Increment Kills
            setScore(scoreRef.current);
            spawnParticles(enemy.x, enemy.y, enemy.color, 8, 3);
            shakeRef.current = 2;
            
            if (enemy.type === 'boss') {
                playSound.dieBoss();
                shakeRef.current = 50;
            } else {
                playSound.die();
            }

            // Drop Loot
            let lootType: 'xp' | 'health' = 'xp';
            // Chance for Health Drop
            let hpChance = 0.005; // 0.5%
            if (enemy.type === 'goliath') hpChance = 0.1; // 10%
            if (enemy.type === 'boss') hpChance = 1.0; // 100%

            if (Math.random() < hpChance) lootType = 'health';
            
            lootRef.current.push({
                id: Math.random().toString(),
                x: enemy.x, y: enemy.y,
                value: enemy.value * p.statModifiers.xpMultiplier, // Apply Meta XP Multiplier
                radius: lootType === 'health' ? 8 : 4,
                color: lootType === 'health' ? '#ff0000' : '#ffff00',
                markedForDeletion: false,
                type: lootType
            });
        }
    });

    if (damageFeedbackTimer.current > 0) damageFeedbackTimer.current--;

    // Update Loot
    lootRef.current.forEach(loot => {
        const dist = Math.hypot(p.x - loot.x, p.y - loot.y);
        if (dist < p.pickupRange) {
            loot.x += (p.x - loot.x) * 0.15;
            loot.y += (p.y - loot.y) * 0.15;
            if (dist < p.radius + 10) {
                loot.markedForDeletion = true;
                if (loot.type === 'xp') {
                    p.xp += loot.value;
                    if (p.xp >= p.xpToNextLevel) {
                        playSound.levelUp();
                        onLevelUp(p);
                        p.xp -= p.xpToNextLevel;
                        p.xpToNextLevel = Math.floor(p.xpToNextLevel * 1.5);
                        p.level++;
                    }
                } else {
                    // Health
                    p.hp = Math.min(p.maxHp, p.hp + 25);
                    playSound.heal();
                    spawnParticles(p.x, p.y, '#00ff00', 15, 2);
                    spawnDamageIndicator(p.x, p.y, 25, false, true); // Heal text (green handled by logic below)
                }
            }
        }
    });

    // Cleanup and Update Particles/Damage Text
    enemiesRef.current = enemiesRef.current.filter(e => !e.markedForDeletion);
    projectilesRef.current = projectilesRef.current.filter(p => !p.markedForDeletion);
    lootRef.current = lootRef.current.filter(l => !l.markedForDeletion);
    
    particlesRef.current.forEach(part => {
        part.x += part.vx;
        part.y += part.vy;
        part.life -= part.decay;
        if (part.life <= 0) part.markedForDeletion = true;
    });
    particlesRef.current = particlesRef.current.filter(p => !p.markedForDeletion);

    // Update Damage Indicators
    damageIndicatorsRef.current.forEach(dmg => {
        dmg.x += dmg.vx;
        dmg.y += dmg.vy;
        dmg.life -= 0.02;
    });
    damageIndicatorsRef.current = damageIndicatorsRef.current.filter(d => d.life > 0);


    if (p.hp <= 0) {
        onGameOver(scoreRef.current, killsRef.current);
    }

    // --- DRAW ---
    
    // Background
    ctx.fillStyle = currentMap.theme.bg;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Grid
    ctx.strokeStyle = currentMap.theme.grid;
    ctx.lineWidth = 1;
    const gridSize = 50;
    // Shake effect
    ctx.save();
    if (shakeRef.current > 0) {
        const dx = (Math.random() - 0.5) * shakeRef.current;
        const dy = (Math.random() - 0.5) * shakeRef.current;
        ctx.translate(dx, dy);
        shakeRef.current *= 0.9;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    ctx.beginPath();
    for (let x=0; x<canvas.width; x+=gridSize) { ctx.moveTo(x,0); ctx.lineTo(x,canvas.height); }
    for (let y=0; y<canvas.height; y+=gridSize) { ctx.moveTo(0,y); ctx.lineTo(canvas.width,y); }
    ctx.stroke();

    // Draw Hazards
    if (currentMap.hazardType === 'electric_walls') {
        ctx.strokeStyle = `rgba(0, 255, 255, ${0.5 + Math.random()*0.5})`;
        ctx.lineWidth = 4;
        ctx.strokeRect(10, 10, canvas.width-20, canvas.height-20);
    }
    hazardsRef.current.forEach(lava => {
        ctx.beginPath();
        ctx.arc(lava.x, lava.y, lava.radius, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255, 68, 0, ${0.4 + Math.sin(totalTimeRef.current * 0.1) * 0.1})`;
        ctx.fill();
    });

    // Draw Particles
    particlesRef.current.forEach(part => {
        ctx.globalAlpha = part.life;
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw Loot
    lootRef.current.forEach(loot => {
        let r = loot.radius;
        let c = loot.color;
        
        // Dynamic XP styling
        if (loot.type === 'xp') {
            if (loot.value < 5) { r=3; c='#ffffcc'; }
            else if (loot.value < 20) { r=5; c='#ffff00'; }
            else if (loot.value < 80) { r=7; c='#00ffff'; }
            else if (loot.value < 500) { r=10; c='#ff00ff'; }
            else { r=16; c='#ffaa00'; }
        }

        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(loot.x, loot.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        if (loot.type === 'health') {
            ctx.fillStyle = 'white';
            ctx.fillRect(loot.x-2, loot.y-6, 4, 12);
            ctx.fillRect(loot.x-6, loot.y-2, 12, 4);
        }
    });

    // Draw Player
    ctx.save();
    ctx.translate(p.x, p.y);
    if (p.activeAbility === 'dash' && p.abilityActiveTimer > 0) {
        ctx.globalAlpha = 0.5; // Ghost effect
    }
    
    // Shield Visual
    if (p.activeAbility === 'shield' && p.abilityActiveTimer > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, p.radius + 10, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(0, 136, 255, ${0.5 + Math.sin(totalTimeRef.current * 0.2)*0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    ctx.fillStyle = p.color;
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    // Draw Enemies
    enemiesRef.current.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        ctx.fillStyle = enemy.color;
        ctx.beginPath();
        
        if (enemy.type === 'rusher') {
            // Triangle pointing to player roughly (or velocity)
            const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
            ctx.rotate(angle);
            ctx.moveTo(enemy.radius, 0);
            ctx.lineTo(-enemy.radius, enemy.radius/1.5);
            ctx.lineTo(-enemy.radius, -enemy.radius/1.5);
        } else if (enemy.type === 'goliath') {
            ctx.fillRect(-enemy.radius, -enemy.radius, enemy.radius*2, enemy.radius*2);
        } else if (enemy.type === 'boss') {
             // Hexagon rotating
             ctx.rotate(totalTimeRef.current * 0.02);
             for(let i=0; i<6; i++) {
                 const theta = (i/6) * Math.PI*2;
                 ctx.lineTo(Math.cos(theta)*enemy.radius, Math.sin(theta)*enemy.radius);
             }
        } else if (enemy.type === 'swarmer') {
             ctx.rotate(Math.PI/4);
             ctx.fillRect(-enemy.radius/2, -enemy.radius/2, enemy.radius, enemy.radius);
        } else {
            ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
        }
        ctx.fill();

        // Boss Health Bar
        if (enemy.type === 'boss') {
            ctx.rotate(-totalTimeRef.current * 0.02); // Reset rotation
            ctx.fillStyle = 'red';
            ctx.fillRect(-30, -60, 60, 8);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(-30, -60, 60 * (enemy.hp / enemy.maxHp), 8);
        }

        ctx.restore();
    });

    // Draw Projectiles
    projectilesRef.current.forEach(proj => {
        ctx.save();
        
        // MAX RANK GLOW
        if (proj.isMaxRank) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = proj.color;
        }

        if (proj.behavior === 'hazard') {
            // Fire Pool
            const alpha = Math.min(1, proj.duration / 30);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = proj.color; // Is set to purple if max rank
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.aoeRadius || 40, 0, Math.PI*2);
            ctx.fill();
            
            // Core
            if (proj.isMaxRank) {
                ctx.beginPath();
                ctx.arc(proj.x, proj.y, (proj.aoeRadius || 40) * 0.5, 0, Math.PI*2);
                ctx.fillStyle = '#ffffff';
                ctx.globalAlpha = alpha * 0.3;
                ctx.fill();
            }
        } else if (proj.behavior === 'lightning') {
            ctx.strokeStyle = proj.isMaxRank ? '#ffffff' : proj.color;
            ctx.lineWidth = proj.isMaxRank ? 6 : 3;
            if (proj.isMaxRank) {
                ctx.shadowColor = '#00ffff';
                ctx.shadowBlur = 20;
            }
            ctx.beginPath();
            ctx.moveTo(proj.x, proj.y);
            // Zigzag effect
            const midX = (proj.x + proj.vx)/2 + (Math.random()-0.5)*20;
            const midY = (proj.y + proj.vy)/2 + (Math.random()-0.5)*20;
            ctx.lineTo(midX, midY);
            ctx.lineTo(proj.vx, proj.vy);
            ctx.stroke();
        } else {
            // Standard Bullet
            if (proj.isMaxRank) {
                 // Plasma Core Effect
                 ctx.fillStyle = '#ffffff';
                 ctx.strokeStyle = proj.color;
                 ctx.lineWidth = 2;
            } else {
                 ctx.fillStyle = proj.color;
            }
            
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            ctx.fill();
            
            if (proj.isMaxRank) ctx.stroke();
        }
        ctx.restore();
    });

    // Draw Damage Indicators
    damageIndicatorsRef.current.forEach(dmg => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, dmg.life);
        ctx.fillStyle = dmg.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.font = `${dmg.scale * (dmg.color === '#ff0000' ? 24 : 16)}px 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        
        // Critical or Player Hit shake
        const shakeX = dmg.color === '#ff0000' || dmg.isCrit ? (Math.random()-0.5)*2 : 0;
        
        ctx.strokeText(dmg.value.toString(), dmg.x + shakeX, dmg.y);
        ctx.fillText(dmg.value.toString(), dmg.x + shakeX, dmg.y);
        ctx.restore();
    });

    ctx.restore();
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const handleResize = () => {
         canvas.width = window.innerWidth;
         canvas.height = window.innerHeight;
      };
      window.addEventListener('resize', handleResize);
      requestRef.current = requestAnimationFrame(animate);
      return () => {
          window.removeEventListener('resize', handleResize);
          cancelAnimationFrame(requestRef.current);
      }
    }
  }, [gameState, currentMap]); // Re-init on map change or game state

  return <canvas ref={canvasRef} className="block" />;
};

export default GameCanvas;