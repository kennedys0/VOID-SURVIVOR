
import { Enemy, Player, Projectile, Loot, Particle, Hazard, DamageIndicator, GameMap } from '../types';
import { playSound } from '../services/audioService';
import { ORC_SPRITES, SKELETON_SPRITES, WIZARD_SPRITES, KNIGHT_SPRITES } from './RenderSystem';

// --- CONSTANTS & HELPERS ---
type WaveConfig = {
    spawnInterval: number;
    weights: { basic: number; rusher: number; swarmer: number; goliath: number };
};

const getWaveConfig = (minutes: number, seconds: number): WaveConfig => {
    const totalSeconds = minutes * 60 + seconds;
    const cycleSeconds = totalSeconds % 180; 

    // Boss Phase: First 30s of every 3rd minute
    const isBossPhase = totalSeconds > 60 && cycleSeconds >= 0 && cycleSeconds < 30;
    // Surge Phase: Next 20s
    const isSurgePhase = totalSeconds > 60 && cycleSeconds >= 30 && cycleSeconds < 50;

    if (isBossPhase) return { spawnInterval: 80, weights: { basic: 0, rusher: 0, swarmer: 100, goliath: 0 } };
    if (isSurgePhase) return { spawnInterval: 12, weights: { basic: 40, rusher: 30, swarmer: 20, goliath: 10 } };

    if (minutes === 0) return { spawnInterval: 50, weights: { basic: 80, swarmer: 20, rusher: 0, goliath: 0 } };
    if (minutes === 1) return { spawnInterval: 40, weights: { basic: 50, swarmer: 30, rusher: 20, goliath: 0 } };
    if (minutes === 2) return { spawnInterval: 30, weights: { basic: 40, swarmer: 20, rusher: 20, goliath: 20 } };
    
    const extraDiff = Math.min(20, (minutes - 3) * 5);
    return { spawnInterval: Math.max(10, 25 - extraDiff), weights: { basic: 30, swarmer: 30, rusher: 30, goliath: 10 } };
};

// --- CORE UPDATE FUNCTION ---

interface UpdateParams {
    canvasWidth: number;
    canvasHeight: number;
    currentMap: GameMap;
    // Refs
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[];
    loot: Loot[];
    particles: Particle[];
    hazards: Hazard[];
    damageIndicators: DamageIndicator[];
    // Input
    keysPressed: { [key: string]: boolean };
    joystick: { active: boolean, originX: number, originY: number, currentX: number, currentY: number };
    // State Vars
    timeState: { totalTime: number; spawnTimer: number; spawnRate: number; enemySpeedMult: number; difficultyMult: number };
    shakeRef: { current: number };
    damageFeedbackTimerRef: { current: number };
    scoreRef: { current: number };
    killsRef: { current: number };
    facingRef: { current: number };
    // Callbacks
    callbacks: {
        setVoidMessage: (msg: any) => void;
        triggerVoidEvent: () => void;
        onLevelUp: (p: Player) => void;
        onGameOver: (s: number, k: number) => void;
    };
}

export const updateGame = (params: UpdateParams) => {
    const { 
        canvasWidth, canvasHeight, currentMap, player, enemies, projectiles, loot, particles, hazards, damageIndicators,
        keysPressed, joystick, timeState, shakeRef, damageFeedbackTimerRef, scoreRef, killsRef, facingRef, callbacks
    } = params;

    timeState.totalTime++;

    // --- DIFFICULTY & SPAWNING ---
    if (timeState.totalTime % 1800 === 0) { // Every 30s
        timeState.difficultyMult += 0.1;
        callbacks.triggerVoidEvent();
    }

    if (timeState.totalTime > 0 && timeState.totalTime % 10800 === 0) {
        spawnEnemy('boss', params);
        shakeRef.current = 50;
    }

    const minutes = Math.floor(timeState.totalTime / 3600);
    const seconds = Math.floor((timeState.totalTime % 3600) / 60);
    const waveConfig = getWaveConfig(minutes, seconds);
    
    let spawnInterval = waveConfig.spawnInterval;
    if (currentMap.id === 'crimson_waste') spawnInterval = Math.max(2, Math.floor(spawnInterval * 0.7));
    timeState.spawnRate = spawnInterval;

    timeState.spawnTimer++;
    if (timeState.spawnTimer >= timeState.spawnRate) {
        timeState.spawnTimer = 0;
        const rand = Math.random() * 100;
        const w = waveConfig.weights;
        let type: any = 'basic'; // Default
        
        if (rand < w.swarmer) type = 'swarmer';
        else if (rand < w.swarmer + w.rusher) type = 'rusher';
        else if (rand < w.swarmer + w.rusher + w.goliath) type = 'goliath';
        
        const xpMult = 1 + (minutes * 0.1); 
        spawnEnemy(type, params, xpMult);
        if (type === 'swarmer') {
             spawnEnemy('swarmer', params, xpMult);
             spawnEnemy('swarmer', params, xpMult);
        }
    }

    // --- PLAYER MOVEMENT & ANIMATION ---
    let dx = 0, dy = 0;
    if (keysPressed['KeyW'] || keysPressed['ArrowUp']) dy -= 1;
    if (keysPressed['KeyS'] || keysPressed['ArrowDown']) dy += 1;
    if (keysPressed['KeyA'] || keysPressed['ArrowLeft']) dx -= 1;
    if (keysPressed['KeyD'] || keysPressed['ArrowRight']) dx += 1;

    if (joystick.active) {
        const jdx = joystick.currentX - joystick.originX;
        const jdy = joystick.currentY - joystick.originY;
        const dist = Math.sqrt(jdx*jdx + jdy*jdy);
        if (dist > 5) { dx = jdx; dy = jdy; }
    }

    if (dx !== 0 || dy !== 0) {
        const len = Math.sqrt(dx*dx + dy*dy);
        dx /= len;
        dy /= len;
    }

    const moveSpeed = player.activeAbility === 'dash' && player.abilityActiveTimer > 0 ? player.speed * 3 : player.speed;
    player.x = Math.max(player.radius, Math.min(canvasWidth - player.radius, player.x + dx * moveSpeed));
    player.y = Math.max(player.radius, Math.min(canvasHeight - player.radius, player.y + dy * moveSpeed));

    if (dx > 0) player.facing = 1;
    if (dx < 0) player.facing = -1;
    facingRef.current = player.facing; // Sync ref for rendering if needed elsewhere

    // Update Player Animation State
    player.frameTimer++;
    const animSpeed = 5;
    
    // Priority: Death > Hurt > Attack > Walk/Idle
    if (player.hp <= 0 && player.state !== 'death') {
        player.state = 'death';
        player.frame = 0;
    }

    // State Transitions
    if (player.state === 'death') {
        if (player.frameTimer > animSpeed) {
            player.frameTimer = 0;
            if (player.frame < KNIGHT_SPRITES.death.frames - 1) player.frame++;
        }
    } else if (player.state === 'hurt') {
        if (player.frameTimer > animSpeed) {
            player.frameTimer = 0;
            if (player.frame < KNIGHT_SPRITES.hurt.frames - 1) {
                player.frame++;
            } else {
                player.state = 'idle'; // Reset after hurt
                player.frame = 0;
            }
        }
    } else if (player.state === 'attack') {
        // Attack duration should match sprite frames roughly
        // Fast attack for responsiveness
        const attackSpeed = 4;
        if (player.frameTimer > attackSpeed) {
            player.frameTimer = 0;
            if (player.frame < KNIGHT_SPRITES.attack.frames - 1) {
                player.frame++;
            } else {
                player.state = 'idle';
                player.frame = 0;
            }
        }
    } else {
        // Walk or Idle
        const isMoving = dx !== 0 || dy !== 0;
        if (isMoving) {
            if (player.state !== 'walk') {
                player.state = 'walk';
                player.frame = 0;
            }
            if (player.frameTimer > animSpeed) {
                player.frameTimer = 0;
                player.frame = (player.frame + 1) % KNIGHT_SPRITES.walk.frames;
            }
        } else {
            if (player.state !== 'idle') {
                player.state = 'idle';
                player.frame = 0;
            }
            if (player.frameTimer > animSpeed) {
                player.frameTimer = 0;
                player.frame = (player.frame + 1) % KNIGHT_SPRITES.idle.frames;
            }
        }
    }


    // --- ABILITIES & WEAPONS ---
    if (keysPressed['Space']) triggerAbility(player, enemies, particles, damageIndicators, shakeRef);
    if (player.abilityTimer > 0) player.abilityTimer--;
    if (player.abilityActiveTimer > 0) player.abilityActiveTimer--;

    updateWeapons(player, enemies, projectiles, timeState.totalTime);

    // --- ENTITY UPDATES ---
    updateProjectiles(projectiles, enemies, player, particles, damageIndicators, shakeRef, damageFeedbackTimerRef, callbacks.onGameOver, scoreRef, killsRef, canvasWidth, canvasHeight);
    updateEnemies(enemies, player, projectiles, particles, hazards, damageIndicators, currentMap, timeState, shakeRef, damageFeedbackTimerRef, callbacks.onGameOver, scoreRef, killsRef, loot, canvasWidth, canvasHeight);
    updateLoot(loot, player, callbacks.onLevelUp, particles, damageIndicators);
    updateParticles(particles);
    updateDamageIndicators(damageIndicators);
    updateHazards(hazards, player, damageIndicators, particles, shakeRef, timeState.totalTime, currentMap, canvasWidth, canvasHeight);
};

// --- LOGIC HELPERS ---

const spawnEnemy = (type: any, params: UpdateParams, xpMult: number = 1.0) => {
    const { canvasWidth, canvasHeight, currentMap, timeState, player } = params;
    const mult = timeState.difficultyMult;
    
    const edge = Math.floor(Math.random() * 4);
    let ex = 0, ey = 0, buffer = 50;
    if (edge === 0) { ex = Math.random() * canvasWidth; ey = -buffer; }
    else if (edge === 1) { ex = canvasWidth + buffer; ey = Math.random() * canvasHeight; }
    else if (edge === 2) { ex = Math.random() * canvasWidth; ey = canvasHeight + buffer; }
    else { ex = -buffer; ey = Math.random() * canvasHeight; }

    const speedMult = timeState.enemySpeedMult;
    const currentWaveIndex = Math.floor(timeState.totalTime / 3600);
    const wavePower = 1 + (currentWaveIndex * 0.2);
    
    let mapHpMod = 1.0, mapDmgMod = 1.0, mapSpeedMod = 1.0;
    if (currentMap.id === 'void') { mapHpMod = 0.8; mapDmgMod = 0.6; mapSpeedMod = 0.9; }
    else if (currentMap.id === 'crimson_waste') { mapHpMod = 1.4; mapDmgMod = 1.5; mapSpeedMod = 1.15; }
    else { mapHpMod = 1.1; }

    const finalHpMult = mult * wavePower * mapHpMod;
    const finalDmgMult = wavePower * mapDmgMod;

    let stats = { hp: 10, maxHp: 10, speed: 2, radius: 10, color: '#ff00ff', damage: 10, value: 10, knockbackResist: 0 };
    
    // Initial velocity calculation
    let initVx = 0;
    let initVy = 0;

    if (type === 'boss') {
        params.callbacks.setVoidMessage({ title: "WARNING", message: "A LEVIATHAN APPROACHES", modifier: {} });
        setTimeout(() => params.callbacks.setVoidMessage(null), 3000);
        stats = { hp: 5000 * finalHpMult, maxHp: 5000 * finalHpMult, speed: 1.0 * speedMult * mapSpeedMod, radius: 45, color: '#ff0000', damage: 50 * finalDmgMult, value: 2000 * xpMult, knockbackResist: 0.95 };
    } else if (type === 'rusher') {
        // Rusher is now an Arrow that moves straight
        stats = { hp: 8 * finalHpMult, maxHp: 8 * finalHpMult, speed: 6.0 * speedMult * mapSpeedMod, radius: 15, color: '#ffeb3b', damage: 15 * finalDmgMult, value: 25 * xpMult, knockbackResist: 0.9 };
        // Calculate velocity vector ONCE aiming at player
        const angle = Math.atan2(player.y - ey, player.x - ex);
        initVx = Math.cos(angle) * stats.speed;
        initVy = Math.sin(angle) * stats.speed;
    } else if (type === 'goliath') {
        // Goliath / Wizard - Slower, but tanky and ranged
        stats = { hp: 80 * finalHpMult, maxHp: 80 * finalHpMult, speed: 0.8 * speedMult * mapSpeedMod, radius: 20, color: '#ff4444', damage: 30 * finalDmgMult, value: 100 * xpMult, knockbackResist: 0.9 };
    } else if (type === 'swarmer') {
        // Swarmer / Skeleton
        stats = { hp: 4 * finalHpMult, maxHp: 4 * finalHpMult, speed: 3 * speedMult * mapSpeedMod, radius: 6, color: '#00ffaa', damage: 5 * finalDmgMult, value: 2 * xpMult, knockbackResist: 0 };
        ex += (Math.random() - 0.5) * 40; ey += (Math.random() - 0.5) * 40;
    } else {
        // Basic Enemy (Orc) - INCREASED RADIUS to 16
        stats = { hp: 15 * finalHpMult, maxHp: 15 * finalHpMult, speed: 2 * speedMult * mapSpeedMod, radius: 16, color: '#8800ff', damage: 10 * finalDmgMult, value: 10 * xpMult, knockbackResist: 0 };
    }

    params.enemies.push({
        id: Math.random().toString(), x: ex, y: ey, markedForDeletion: false, type: type, ...stats, vx: initVx, vy: initVy, state: 'walk', frame: 0, frameTimer: 0
    });
};

const triggerAbility = (p: Player, enemies: Enemy[], particles: Particle[], indicators: DamageIndicator[], shakeRef: any) => {
    if (p.abilityTimer > 0) return;
    p.abilityTimer = p.abilityCooldown;

    if (p.activeAbility === 'dash') {
        p.abilityActiveTimer = 15; 
        spawnParticles(particles, p.x, p.y, '#00ffcc', 10, 2);
        playSound.dash();
    } else if (p.activeAbility === 'shield') {
        p.abilityActiveTimer = 180;
        spawnParticles(particles, p.x, p.y, '#0088ff', 10, 1);
        playSound.shield();
    } else if (p.activeAbility === 'nova') {
        p.abilityActiveTimer = 10;
        shakeRef.current = 30;
        playSound.nova();
        const dmg = p.weapons[0].damage * 20;
        enemies.filter(e => e.hp > 0).forEach(enemy => {
            enemy.hp -= dmg;
            if (enemy.hp > 0 && (enemy.type === 'basic' || enemy.type === 'swarmer' || enemy.type === 'goliath')) { enemy.state = 'hurt'; enemy.frame = 0; }
            else if (enemy.hp <= 0 && (enemy.type === 'basic' || enemy.type === 'swarmer' || enemy.type === 'goliath') && enemy.state !== 'death') { enemy.state = 'death'; enemy.frame = 0; }
            
            spawnDamageIndicator(indicators, enemy.x, enemy.y, dmg, false, true);
            const angle = Math.atan2(enemy.y - p.y, enemy.x - p.x);
            const force = 150 * (1 - enemy.knockbackResist);
            enemy.vx += Math.cos(angle) * (force * 0.1); 
            enemy.vy += Math.sin(angle) * (force * 0.1);
            spawnParticles(particles, enemy.x, enemy.y, '#aa00ff', 5, 5);
        });
        spawnParticles(particles, p.x, p.y, '#aa00ff', 50, 10);
    }
};

const updateWeapons = (p: Player, enemies: Enemy[], projectiles: Projectile[], totalTime: number) => {
    p.weapons.forEach(weapon => {
        if (!weapon.active) return;
        weapon.timer--;
        
        if (weapon.type === 'orbital') {
            const orbitalProjs = projectiles.filter(proj => proj.behavior === 'orbital' && proj.id.startsWith(weapon.id));
            const needed = weapon.projectileCount;
            const isMax = weapon.rank >= 5;
            if (orbitalProjs.length < needed) {
                for (let i = 0; i < needed - orbitalProjs.length; i++) {
                    projectiles.push({
                        id: `${weapon.id}_${Math.random()}`, x: p.x, y: p.y, vx: 0, vy: 0, radius: 8, color: weapon.color, damage: weapon.damage, duration: weapon.duration, pierce: 999, behavior: 'orbital', orbitRadius: 80, orbitAngle: 0, markedForDeletion: false, isMaxRank: isMax
                    });
                }
            }
            const speed = 0.05 + (weapon.rank * 0.01);
            orbitalProjs.forEach((proj, idx) => {
                 const offset = (idx / needed) * Math.PI * 2;
                 const globalAngle = (totalTime * speed) + offset;
                 proj.x = p.x + Math.cos(globalAngle) * 80;
                 proj.y = p.y + Math.sin(globalAngle) * 80;
                 proj.damage = weapon.damage;
                 proj.isMaxRank = isMax;
            });
            return; 
        }
        
        if (weapon.timer <= 0) {
            const targets = enemies.filter(e => e.hp > 0);
            const isMax = weapon.rank >= 5;

            if (weapon.type === 'lightning') {
                 const range = 250;
                 const inRange = targets.map(e => ({ e, dist: Math.hypot(e.x - p.x, e.y - p.y) })).filter(item => item.dist < range).sort((a, b) => a.dist - b.dist);
                 for (let i = 0; i < Math.min(weapon.projectileCount, inRange.length); i++) {
                     const target = inRange[i].e;
                     target.hp -= weapon.damage;
                     if (target.hp > 0 && (target.type === 'basic' || target.type === 'swarmer' || target.type === 'goliath')) { target.state = 'hurt'; target.frame = 0; }
                     else if (target.hp <= 0 && (target.type === 'basic' || target.type === 'swarmer' || target.type === 'goliath') && target.state !== 'death') { target.state = 'death'; target.frame = 0; }
                     projectiles.push({ id: Math.random().toString(), x: p.x, y: p.y, vx: target.x, vy: target.y, radius: 1, color: weapon.color, damage: 0, duration: 5, pierce: 0, behavior: 'lightning', markedForDeletion: false, isMaxRank: isMax });
                     playSound.shootLightning();
                 }
                 weapon.timer = weapon.cooldown;
                 return;
            }

            if (weapon.type === 'sword') {
                // Find nearby enemy to attack
                const swordRange = 150;
                let closestInRange: Enemy | null = null;
                let minDist = swordRange;

                targets.forEach(e => {
                    const d = Math.hypot(e.x - p.x, e.y - p.y);
                    if (d < minDist) {
                        minDist = d;
                        closestInRange = e;
                    }
                });

                // If no enemy is close, do not attack, keep timer ready
                if (!closestInRange) {
                    weapon.timer = 0;
                    return;
                }

                // Auto-face the enemy
                const dx = closestInRange.x - p.x;
                if (dx > 0) p.facing = 1;
                if (dx < 0) p.facing = -1;

                // Trigger Attack Animation
                p.state = 'attack';
                p.frame = 0;
                playSound.shootSword();
                
                // Spawn Melee Projectile
                // It stays attached to player position generally, or acts as a stationary slash zone for its duration
                const offset = 40 * p.facing;
                projectiles.push({
                    id: `${weapon.id}_${Math.random()}`,
                    x: p.x + offset,
                    y: p.y,
                    vx: p.facing, // Store facing info in vx
                    vy: 0,
                    radius: 60, // Large Hitbox
                    color: '#00ffff',
                    damage: weapon.damage,
                    duration: 15, // Lasts 15 frames
                    pierce: 999, // Infinite pierce
                    behavior: 'melee',
                    markedForDeletion: false,
                    isMaxRank: isMax
                });
                
                weapon.timer = weapon.cooldown;
                return;
            }

            let closest: Enemy | null = null;
            let minDist = Infinity;
            targets.forEach(e => { const d = Math.hypot(e.x - p.x, e.y - p.y); if (d < minDist) { minDist = d; closest = e; } });

            if (closest || ['shotgun','molotov','boomerang'].includes(weapon.type)) {
                let angle = closest ? Math.atan2(closest.y - p.y, closest.x - p.x) : Math.random() * Math.PI * 2;
                if (weapon.type === 'shotgun') {
                    for(let i=0; i<weapon.projectileCount; i++) {
                        const spread = (Math.random() - 0.5) * 0.8; 
                        const speed = weapon.projectileSpeed * (0.8 + Math.random() * 0.4);
                        projectiles.push({ id: Math.random().toString(), x: p.x, y: p.y, vx: Math.cos(angle + spread) * speed, vy: Math.sin(angle + spread) * speed, radius: 4, color: weapon.color, damage: weapon.damage, duration: weapon.duration, pierce: 2, behavior: 'straight', markedForDeletion: false, isMaxRank: isMax });
                    }
                    playSound.shootShotgun();
                } else if (weapon.type === 'boomerang') {
                    const count = weapon.rank === 5 ? 2 : 1;
                    for(let i=0; i<count; i++) {
                        const offset = i === 1 ? Math.PI : 0;
                        projectiles.push({ id: Math.random().toString(), x: p.x, y: p.y, vx: Math.cos(angle + offset) * weapon.projectileSpeed, vy: Math.sin(angle + offset) * weapon.projectileSpeed, radius: 6, color: weapon.color, damage: weapon.damage, duration: weapon.duration, pierce: 999, behavior: 'boomerang', returnSpeed: 0.5, markedForDeletion: false, isMaxRank: isMax });
                    }
                    playSound.shootBoomerang();
                } else if (weapon.type === 'molotov') {
                    const tx = closest ? closest.x + (Math.random()-0.5)*50 : p.x + (Math.random()-0.5)*200;
                    const ty = closest ? closest.y + (Math.random()-0.5)*50 : p.y + (Math.random()-0.5)*200;
                    projectiles.push({ id: Math.random().toString(), x: p.x, y: p.y, vx: (tx - p.x) / 30, vy: (ty - p.y) / 30, radius: 6, color: weapon.color, damage: weapon.damage, duration: 30, pierce: 0, behavior: 'lob', aoeRadius: 40 + (weapon.rank * 10), markedForDeletion: false, isMaxRank: isMax });
                } else {
                    projectiles.push({ id: Math.random().toString(), x: p.x, y: p.y, vx: Math.cos(angle) * weapon.projectileSpeed, vy: Math.sin(angle) * weapon.projectileSpeed, radius: 5, color: weapon.color, damage: weapon.damage, duration: weapon.duration, pierce: 1, behavior: 'straight', markedForDeletion: false, isMaxRank: isMax });
                    playSound.shootPistol();
                }
                weapon.timer = weapon.cooldown;
            }
        }
    });
};

const updateProjectiles = (projectiles: Projectile[], enemies: Enemy[], p: Player, particles: Particle[], indicators: DamageIndicator[], shakeRef: any, damageFeedbackTimerRef: any, onGameOver: any, scoreRef: any, killsRef: any, w: number, h: number) => {
    projectiles.forEach(proj => {
        // ENEMY PROJECTILES (Damage Player)
        if (proj.ownerId === 'enemy') {
            proj.x += proj.vx; proj.y += proj.vy; proj.duration--;
            if (proj.duration <= 0) proj.markedForDeletion = true;

            // Collision with Player
            if (Math.hypot(p.x - proj.x, p.y - proj.y) < p.radius + proj.radius) {
                if (p.hp > 0 && !(p.activeAbility === 'dash' && p.abilityActiveTimer > 0)) {
                    if (p.activeAbility === 'shield' && p.abilityActiveTimer > 0) {
                        p.abilityActiveTimer = 0; 
                        spawnParticles(particles, p.x, p.y, '#0088ff', 15, 3);
                        damageFeedbackTimerRef.current = 30; 
                        spawnDamageIndicator(indicators, p.x, p.y, 0, false);
                    } else {
                        const dmg = Math.max(1, proj.damage - (p.armor || 0));
                        p.hp -= dmg; 
                        p.state = 'hurt'; p.frame = 0;
                        spawnDamageIndicator(indicators, p.x, p.y, dmg, true);
                        playSound.playerHit(); 
                        shakeRef.current = 10; 
                        damageFeedbackTimerRef.current = 30;
                        spawnParticles(particles, p.x, p.y, '#ff0000', 10, 3);
                        if (p.hp <= 0) onGameOver(scoreRef.current, killsRef.current);
                    }
                    proj.markedForDeletion = true;
                }
            }
            // Enemy projectiles don't hit other enemies, so we return early for this projectile iteration
            return;
        }

        // PLAYER PROJECTILES (Existing Logic)
        if (proj.behavior === 'orbital' || proj.behavior === 'lightning') {
            if (proj.behavior === 'lightning' && --proj.duration <= 0) proj.markedForDeletion = true;
            return;
        }

        if (proj.behavior === 'melee') {
            proj.duration--;
            // Stick to player
            const offset = 40 * p.facing;
            proj.x = p.x + offset;
            proj.y = p.y;
            proj.vx = p.facing; // Update facing visual

            // Hitbox check
            enemies.forEach(e => {
                 if (e.hp <= 0) return;
                 if (Math.hypot(e.x - proj.x, e.y - proj.y) < proj.radius + e.radius) {
                     const tickDmg = Math.ceil(proj.damage / 5);
                     e.hp -= tickDmg;
                     
                     if (e.type === 'basic' || e.type === 'swarmer' || e.type === 'goliath') {
                         if (e.hp > 0 && e.state !== 'hurt') { e.state = 'hurt'; e.frame = 0; }
                         else if (e.hp <= 0 && e.state !== 'death') { e.state = 'death'; e.frame = 0; }
                     }
                     if (Math.random() < 0.2) spawnDamageIndicator(indicators, e.x, e.y, tickDmg, false, proj.isMaxRank);
                     
                     // Knockback away from player
                     const angle = Math.atan2(e.y - p.y, e.x - p.x);
                     e.vx += Math.cos(angle) * 2;
                     e.vy += Math.sin(angle) * 2;
                 }
            });

            if (proj.duration <= 0) proj.markedForDeletion = true;
            return;
        }

        if (proj.behavior === 'hazard') {
            proj.duration--;
            if (proj.duration % 10 === 0) {
                 enemies.forEach(e => {
                     if (e.hp <= 0) return;
                     if (Math.hypot(e.x - proj.x, e.y - proj.y) < (proj.aoeRadius || 40)) {
                         e.hp -= proj.damage * 0.2; 
                         if (e.hp > 0 && (e.type === 'basic' || e.type === 'swarmer' || e.type === 'goliath') && e.state !== 'hurt') { e.state = 'hurt'; e.frame = 0; }
                         else if (e.hp <= 0 && (e.type === 'basic' || e.type === 'swarmer' || e.type === 'goliath') && e.state !== 'death') { e.state = 'death'; e.frame = 0; }
                         if (Math.random() < 0.3) spawnDamageIndicator(indicators, e.x, e.y, proj.damage * 0.2, false);
                     }
                 });
            }
            if (proj.duration <= 0) proj.markedForDeletion = true;
            return;
        }

        proj.x += proj.vx; proj.y += proj.vy; proj.duration--;

        if (proj.behavior === 'boomerang') {
             proj.vx *= 0.95; proj.vy *= 0.95;
             if (proj.duration < 60) {
                 const angle = Math.atan2(p.y - proj.y, p.x - proj.x);
                 proj.vx = Math.cos(angle) * 8; proj.vy = Math.sin(angle) * 8;
                 if (Math.hypot(p.x - proj.x, p.y - proj.y) < 20) proj.markedForDeletion = true;
             }
             spawnParticles(particles, proj.x, proj.y, proj.color, 1, 0.5);
        } else if (proj.behavior === 'lob') {
             if (proj.duration <= 0) {
                 proj.markedForDeletion = true;
                 playSound.explosionMolotov();
                 const voidColor = '#d946ef';
                 projectiles.push({ id: `hazard_${Math.random()}`, x: proj.x, y: proj.y, vx: 0, vy: 0, radius: proj.aoeRadius || 40, color: proj.isMaxRank ? voidColor : '#ff4400', damage: proj.damage, duration: 180, pierce: 999, behavior: 'hazard', aoeRadius: proj.aoeRadius, markedForDeletion: false, isMaxRank: proj.isMaxRank });
                 spawnParticles(particles, proj.x, proj.y, proj.isMaxRank ? voidColor : '#ffaa00', 20, 3);
             }
        } else if (proj.behavior === 'straight') {
             if (proj.duration <= 0) proj.markedForDeletion = true;
        }
        
        if (proj.x < -100 || proj.x > w + 100 || proj.y < -100 || proj.y > h + 100) proj.markedForDeletion = true;
    });
};

const updateEnemies = (enemies: Enemy[], p: Player, projectiles: Projectile[], particles: Particle[], hazards: Hazard[], indicators: DamageIndicator[], map: GameMap, timeState: any, shakeRef: any, damageFeedbackTimerRef: any, onGameOver: any, scoreRef: any, killsRef: any, loot: Loot[], w: number, h: number) => {
    enemies.forEach(enemy => {
        const isAnimated = enemy.type === 'basic' || enemy.type === 'swarmer' || enemy.type === 'goliath';

        // Animation for Basic (Orc), Swarmer (Skeleton), and Goliath (Wizard)
        if (isAnimated) {
            enemy.frameTimer++;
            const animSpeed = 5;
            const attackAnimSpeed = 2; // Faster attack animation
            
            // Select correct config
            let config = ORC_SPRITES;
            if (enemy.type === 'swarmer') config = SKELETON_SPRITES;
            else if (enemy.type === 'goliath') config = WIZARD_SPRITES;
            
            if (enemy.state === 'death') {
                // Ensure loot drops if killed by external source (like sword) before this loop ran
                if (!(enemy as any).rewardsProcessed) {
                    (enemy as any).rewardsProcessed = true;
                    scoreRef.current += 10; killsRef.current += 1;
                    shakeRef.current = 2;
                    playSound.die();
                    // No extra particles for animated enemies as they have death sprites
                    
                    let lootType: any = 'xp';
                    let hpChance = 0.005;
                    if (enemy.type === 'goliath') hpChance = 0.1;
                    if (Math.random() < hpChance) lootType = 'health';
                    loot.push({ id: Math.random().toString(), x: enemy.x, y: enemy.y, value: enemy.value * p.statModifiers.xpMultiplier, radius: lootType === 'health' ? 8 : 4, color: lootType === 'health' ? '#ff0000' : '#ffff00', markedForDeletion: false, type: lootType });
                }

                if (enemy.frameTimer > animSpeed) {
                    enemy.frameTimer = 0;
                    if (enemy.frame < config.death.frames - 1) enemy.frame++;
                    else enemy.markedForDeletion = true;
                }
                return;
            }
            // Other states
            if (enemy.state === 'hurt' && enemy.frameTimer > animSpeed) {
                enemy.frameTimer = 0;
                if (enemy.frame < config.hurt.frames - 1) enemy.frame++; else { enemy.state = 'walk'; enemy.frame = 0; }
            } else if (enemy.state === 'attack') {
                // DEAL DAMAGE on Specific Frame
                const hitFrame = Math.floor(config.attack.frames / 2); // Hit roughly in middle of animation
                // FIX: frameTimer is incremented at top of loop, so checking for 0 always fails. Use 1.
                if (enemy.frame === hitFrame && enemy.frameTimer === 1) {
                     // Check if Wizard
                     if (enemy.type === 'goliath') {
                         // SHOOT FIREBALL
                         const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
                         playSound.explosionMolotov(); // Reusing fire sound
                         projectiles.push({
                            id: `enemy_fire_${Math.random()}`,
                            ownerId: 'enemy',
                            x: enemy.x, y: enemy.y,
                            vx: Math.cos(angle) * 5,
                            vy: Math.sin(angle) * 5,
                            radius: 10,
                            color: '#ff4400',
                            damage: enemy.damage,
                            duration: 120, // 2 seconds
                            pierce: 1,
                            behavior: 'straight',
                            markedForDeletion: false
                         });
                     } 
                     
                     // MELEE ATTACK (Orc/Skeleton) AND Wizard Close-Range Hit
                     // Allow a bit more range so they don't have to be inside the player to hit
                     const attackRange = enemy.type === 'goliath' ? 100 : (p.radius + enemy.radius + 35);
                     
                     if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < attackRange) {
                         if (p.hp > 0 && damageFeedbackTimerRef.current <= 0 && !(p.activeAbility === 'dash' && p.activeAbility === 'dash' && p.abilityActiveTimer > 0)) {
                             if (p.activeAbility === 'shield' && p.abilityActiveTimer > 0) {
                                p.abilityActiveTimer = 0; spawnParticles(particles, p.x, p.y, '#0088ff', 15, 3);
                                damageFeedbackTimerRef.current = 30; spawnDamageIndicator(indicators, p.x, p.y, 0, false);
                            } else {
                                const dmg = Math.max(1, enemy.damage - (p.armor || 0));
                                p.hp -= dmg; 
                                p.state = 'hurt'; p.frame = 0;
                                spawnDamageIndicator(indicators, p.x, p.y, dmg, true);
                                playSound.playerHit(); shakeRef.current = 10; damageFeedbackTimerRef.current = 30;
                                spawnParticles(particles, p.x, p.y, '#ff0000', 10, 3);
                                if (p.hp <= 0) onGameOver(scoreRef.current, killsRef.current);
                            }
                         }
                     }
                }

                if (enemy.frameTimer > attackAnimSpeed) {
                    enemy.frameTimer = 0;
                    if (enemy.frame < config.attack.frames - 1) enemy.frame++; else { enemy.state = 'walk'; enemy.frame = 0; }
                }
            } else if (enemy.state === 'walk' && enemy.frameTimer > animSpeed) {
                enemy.frameTimer = 0; enemy.frame = (enemy.frame + 1) % config.walk.frames;
                
                // Attack Range Logic
                // Increase distance so they don't overlap player too much
                const attackDist = enemy.type === 'goliath' ? 200 : 55; 
                
                if (Math.hypot(p.x - enemy.x, p.y - enemy.y) < attackDist) { enemy.state = 'attack'; enemy.frame = 0; }
            }
        }

        if (enemy.type === 'rusher') {
             // Linear Movement Logic for Rusher (Arrow)
             // Moves straight based on initial velocity set at spawn
             enemy.x += enemy.vx;
             enemy.y += enemy.vy;
             
             // If it goes too far off screen, delete it
             if (enemy.x < -200 || enemy.x > w + 200 || enemy.y < -200 || enemy.y > h + 200) {
                 enemy.markedForDeletion = true;
             }
        } else {
            // Standard Enemy Movement Logic
            enemy.x += enemy.vx; enemy.y += enemy.vy;
            enemy.vx *= 0.85; enemy.vy *= 0.85; // Friction

            const angle = Math.atan2(p.y - enemy.y, p.x - enemy.x);
            let pushX = 0, pushY = 0;
            
            enemies.forEach(other => {
                if (enemy === other || (other.hp <= 0 && other.state === 'death')) return;
                const dx = enemy.x - other.x, dy = enemy.y - other.y, dist = Math.hypot(dx, dy);
                if (dist < enemy.radius + other.radius) { pushX += dx / dist; pushY += dy / dist; }
            });

            const canMove = enemy.state !== 'death' && enemy.state !== 'hurt' && enemy.state !== 'attack';
            
            if (Math.hypot(enemy.vx, enemy.vy) < 2.0 && canMove) {
                enemy.x += (Math.cos(angle) * enemy.speed) + (pushX * 0.1);
                enemy.y += (Math.sin(angle) * enemy.speed) + (pushY * 0.1);
            }
        }

        // Map Hazards
        if (map.hazardType === 'electric_walls') {
            const m = 20;
            if (enemy.x <= m || enemy.x >= w - m || enemy.y <= m || enemy.y >= h - m) {
                 enemy.x += (w/2 - enemy.x) * 0.05; enemy.y += (h/2 - enemy.y) * 0.05;
            }
        }
        hazards.forEach(lava => {
             if (Math.hypot(enemy.x - lava.x, enemy.y - lava.y) < lava.radius) {
                 const angleToPlayer = Math.atan2(p.y - enemy.y, p.x - enemy.x);
                 enemy.x -= Math.cos(angleToPlayer) * enemy.speed * 0.5; 
                 enemy.y -= Math.sin(angleToPlayer) * enemy.speed * 0.5;
                 enemy.hp -= lava.damage;
                 if (Math.random() < 0.1) spawnDamageIndicator(indicators, enemy.x, enemy.y, lava.damage, false);
             }
        });

        // Hit by Projectile
        projectiles.forEach(proj => {
            if (proj.markedForDeletion || proj.behavior === 'lob' || proj.behavior === 'hazard' || proj.behavior === 'lightning') return;
            // Ignore Enemy Projectiles
            if (proj.ownerId === 'enemy') return;

            if (Math.hypot(enemy.x - proj.x, enemy.y - proj.y) < enemy.radius + proj.radius) {
                // If it's a melee projectile, damage is handled in updateProjectiles to support ticks
                if (proj.behavior === 'melee') return; 

                enemy.hp -= proj.damage;
                if (enemy.type === 'basic' || enemy.type === 'swarmer' || enemy.type === 'goliath') {
                    if (enemy.hp > 0 && enemy.state !== 'hurt') { enemy.state = 'hurt'; enemy.frame = 0; }
                    else if (enemy.hp <= 0 && enemy.state !== 'death') { enemy.state = 'death'; enemy.frame = 0; }
                }
                spawnDamageIndicator(indicators, enemy.x, enemy.y, proj.damage, false, proj.isMaxRank);
                playSound.hit();
                spawnParticles(particles, enemy.x, enemy.y, '#ffffff', 2, 2);
                
                // Only apply knockback if NOT a Rusher (they have high momentum/ignore friction anyway)
                if (enemy.type !== 'rusher' && enemy.knockbackResist < 1) {
                    const k = (1 - enemy.knockbackResist) * 0.3 * 3.0;
                    enemy.vx += proj.vx * k; enemy.vy += proj.vy * k;
                }
                if (proj.pierce > 0) { proj.pierce--; if (proj.pierce <= 0) proj.markedForDeletion = true; }
            }
        });

        // Hit Player (Only for non-animated enemies like Rusher/Boss)
        if (!isAnimated && Math.hypot(p.x - enemy.x, p.y - enemy.y) < p.radius + enemy.radius) {
            if (enemy.hp > 0 && damageFeedbackTimerRef.current <= 0 && !(p.activeAbility === 'dash' && p.activeAbility === 'dash' && p.abilityActiveTimer > 0)) {
                if (p.activeAbility === 'shield' && p.abilityActiveTimer > 0) {
                    p.abilityActiveTimer = 0; spawnParticles(particles, p.x, p.y, '#0088ff', 15, 3);
                    damageFeedbackTimerRef.current = 30; spawnDamageIndicator(indicators, p.x, p.y, 0, false);
                } else {
                    const dmg = Math.max(1, enemy.damage - (p.armor || 0));
                    p.hp -= dmg; 
                    p.state = 'hurt'; p.frame = 0; // Trigger hurt animation
                    spawnDamageIndicator(indicators, p.x, p.y, dmg, true);
                    playSound.playerHit(); shakeRef.current = 10; damageFeedbackTimerRef.current = 30;
                    spawnParticles(particles, p.x, p.y, '#ff0000', 10, 3);
                    if (p.hp <= 0) onGameOver(scoreRef.current, killsRef.current);
                }
            }
        }
        
        // Death Rewards
        if (enemy.hp <= 0) {
            if (enemy.type !== 'basic' && enemy.type !== 'swarmer' && enemy.type !== 'goliath') enemy.markedForDeletion = true;
            if (!(enemy as any).rewardsProcessed) {
                (enemy as any).rewardsProcessed = true;
                scoreRef.current += 10; killsRef.current += 1;
                shakeRef.current = 2;
                if (enemy.type === 'boss') { playSound.dieBoss(); shakeRef.current = 50; } else playSound.die();
                if (enemy.type !== 'basic' && enemy.type !== 'swarmer' && enemy.type !== 'goliath') spawnParticles(particles, enemy.x, enemy.y, enemy.color, 8, 3);
                
                let lootType: any = 'xp';
                let hpChance = 0.005;
                if (enemy.type === 'goliath') hpChance = 0.1; if (enemy.type === 'boss') hpChance = 1.0;
                if (Math.random() < hpChance) lootType = 'health';
                loot.push({ id: Math.random().toString(), x: enemy.x, y: enemy.y, value: enemy.value * p.statModifiers.xpMultiplier, radius: lootType === 'health' ? 8 : 4, color: lootType === 'health' ? '#ff0000' : '#ffff00', markedForDeletion: false, type: lootType });
            }
        }
    });
};

const updateLoot = (loot: Loot[], p: Player, onLevelUp: any, particles: Particle[], indicators: DamageIndicator[]) => {
    loot.forEach(l => {
        const d = Math.hypot(p.x - l.x, p.y - l.y);
        if (d < p.pickupRange) {
            l.x += (p.x - l.x) * 0.15; l.y += (p.y - l.y) * 0.15;
            if (d < p.radius + 10) {
                l.markedForDeletion = true;
                if (l.type === 'xp') {
                    p.xp += l.value;
                    if (p.xp >= p.xpToNextLevel) { playSound.levelUp(); onLevelUp(p); p.xp -= p.xpToNextLevel; p.xpToNextLevel = Math.floor(p.xpToNextLevel * 1.5); p.level++; }
                } else {
                    p.hp = Math.min(p.maxHp, p.hp + 25); playSound.heal();
                    spawnParticles(particles, p.x, p.y, '#00ff00', 15, 2);
                    spawnDamageIndicator(indicators, p.x, p.y, 25, false, true);
                }
            }
        }
    });
};

const updateParticles = (particles: Particle[]) => {
    particles.forEach(p => { p.x += p.vx; p.y += p.vy; p.life -= p.decay; if (p.life <= 0) p.markedForDeletion = true; });
};

const updateDamageIndicators = (list: DamageIndicator[]) => {
    list.forEach(d => {
        d.x += d.vx;
        d.y += d.vy;
        d.life -= 0.02; 
    });
};

const updateHazards = (hazards: Hazard[], p: Player, indicators: DamageIndicator[], particles: Particle[], shakeRef: any, totalTime: number, map: GameMap, w: number, h: number) => {
    if (map.hazardType === 'electric_walls') {
        const m = 20;
        if ((p.x <= m || p.x >= w - m || p.y <= m || p.y >= h - m) && totalTime % 30 === 0) {
             const dmg = Math.max(1, 5 - (p.armor || 0)); p.hp -= dmg;
             spawnDamageIndicator(indicators, p.x, p.y, dmg, true); shakeRef.current += 5;
             playSound.playerHit(); spawnParticles(particles, p.x, p.y, '#ffff00', 5, 5);
        }
    }
    hazards.forEach(lava => {
        if (Math.hypot(p.x - lava.x, p.y - lava.y) < lava.radius && totalTime % 20 === 0) {
             const dmg = Math.max(1, 2 - (p.armor || 0)); p.hp -= dmg;
             spawnDamageIndicator(indicators, p.x, p.y, dmg, true); spawnParticles(particles, p.x, p.y, '#ff4400', 2, 2);
        }
    });
};

const spawnParticles = (list: Particle[], x: number, y: number, color: string, count: number, speed: number) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const velocity = Math.random() * speed;
      list.push({
        id: Math.random().toString(), x, y, vx: Math.cos(angle) * velocity, vy: Math.sin(angle) * velocity, life: 1.0, decay: 0.02 + Math.random() * 0.03, color, radius: Math.random() * 2 + 1, markedForDeletion: false
      });
    }
};

const spawnDamageIndicator = (list: DamageIndicator[], x: number, y: number, value: number, isPlayer: boolean, isCrit: boolean = false) => {
    list.push({
          id: Math.random().toString(), x: x + (Math.random() - 0.5) * 20, y: y - 10, value: Math.ceil(value), life: 1.0, vx: (Math.random() - 0.5) * 1, vy: -1.5, color: isPlayer ? '#ff0000' : (isCrit ? '#ffff00' : '#ffffff'), scale: 1, isCrit
    });
};
