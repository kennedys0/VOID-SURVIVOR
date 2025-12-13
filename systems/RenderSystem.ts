
import { Enemy, Player, Projectile, Loot, Particle, Hazard, DamageIndicator, GameMap } from '../types';

// Asset Paths
const GRASS_TEXTURE_URL = "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Texture/Grass/Grass_01_Green_2.png";
const NEON_TEXTURE_URL = "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Texture/Dirt/Dirt_Rocks_01_Brown_2.png";
const CRIMSON_TEXTURE_URL = "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Texture/Stones/Stones_Loose_01_Orange_1.png";

export const KNIGHT_SPRITES = {
    idle: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Hero/Idle.png", frames: 11, width: 180 },
    walk: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Hero/Run.png", frames: 8, width: 180 },
    attack: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Hero/Attack1.png", frames: 7, width: 180 },
    hurt: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Hero/Take%20Hit.png", frames: 4, width: 180 },
    death: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Hero/Death.png", frames: 11, width: 180 }
};

// Config for Enemy Sprite Sheets
export const ORC_SPRITES = {
    walk: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Orc/Orc-Walk.png", frames: 8, width: 100 },
    attack: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Orc/Orc-Attack01.png", frames: 6, width: 100 },
    hurt: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Orc/Orc-Hurt.png", frames: 4, width: 100 },
    death: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Orc/Orc-Death.png", frames: 4, width: 100 }
};

export const SKELETON_SPRITES = {
    walk: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Skeleton/Skeleton_01_White_Walk.png", frames: 10, width: 96 },
    attack: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Skeleton/Skeleton_01_White_Attack1.png", frames: 9, width: 96 },
    hurt: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Skeleton/Skeleton_01_White_Hurt.png", frames: 5, width: 96 },
    death: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Skeleton/Skeleton_01_White_Die.png", frames: 13, width: 96 }
};

export const WIZARD_SPRITES = {
    walk: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Wizard/Move.png", frames: 8, width: 150 },
    attack: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Wizard/Attack.png", frames: 8, width: 150 },
    hurt: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Wizard/Take%20Hit.png", frames: 4, width: 150 },
    death: { src: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Wizard/Death.png", frames: 5, width: 150 }
};

export const ENEMY_SPRITES_URLS: Record<string, string> = {
    rusher: "https://raw.githubusercontent.com/kennedys0/assets/refs/heads/main/Arrow(Projectile)/Arrow01(100x100).png",
    // swarmer: "https://raw.githubusercontent.com/kennedys0/VOID-SURVIVOR/refs/heads/main/assets/swarmer.png", // Using Sprite
    // goliath: "https://raw.githubusercontent.com/kennedys0/VOID-SURVIVOR/refs/heads/main/assets/goliath.png", // Using Sprite
    boss: "https://raw.githubusercontent.com/kennedys0/VOID-SURVIVOR/refs/heads/main/assets/boss.png"
};

export interface AssetRefs {
    playerImage: HTMLImageElement | null;
    enemyImages: Record<string, HTMLImageElement>;
    knightSprites: Record<string, HTMLImageElement>;
    orcSprites: Record<string, HTMLImageElement>;
    skeletonSprites: Record<string, HTMLImageElement>;
    wizardSprites: Record<string, HTMLImageElement>;
    grassTexture: HTMLImageElement | null;
    neonTexture: HTMLImageElement | null;
    crimsonTexture: HTMLImageElement | null;
}

export const loadGameAssets = (assetsRef: React.MutableRefObject<AssetRefs>) => {
    // Deprecated static player image
    // const pImg = new Image(); pImg.src = PLAYER_SPRITE_URL; pImg.crossOrigin = "anonymous"; pImg.onload = () => { assetsRef.current.playerImage = pImg; };

    // Load Grass Texture
    const grassImg = new Image();
    grassImg.src = GRASS_TEXTURE_URL;
    grassImg.crossOrigin = "anonymous";
    grassImg.onload = () => { assetsRef.current.grassTexture = grassImg; };

    // Load Neon Dirt Texture
    const neonImg = new Image();
    neonImg.src = NEON_TEXTURE_URL;
    neonImg.crossOrigin = "anonymous";
    neonImg.onload = () => { assetsRef.current.neonTexture = neonImg; };

    // Load Crimson Stones Texture
    const crimsonImg = new Image();
    crimsonImg.src = CRIMSON_TEXTURE_URL;
    crimsonImg.crossOrigin = "anonymous";
    crimsonImg.onload = () => { assetsRef.current.crimsonTexture = crimsonImg; };

    // Load Knight Sprites
    Object.entries(KNIGHT_SPRITES).forEach(([key, config]) => {
        const img = new Image();
        img.src = config.src;
        img.crossOrigin = "anonymous"; 
        img.onload = () => { 
            if (!assetsRef.current.knightSprites) assetsRef.current.knightSprites = {};
            assetsRef.current.knightSprites[key] = img; 
        };
    });

    // Load Other Enemies
    Object.entries(ENEMY_SPRITES_URLS).forEach(([key, src]) => {
        const img = new Image();
        img.src = src;
        img.crossOrigin = "anonymous";
        img.onload = () => { assetsRef.current.enemyImages[key] = img; };
    });

    // Load Orc Sprites
    Object.entries(ORC_SPRITES).forEach(([key, config]) => {
        const img = new Image();
        img.src = config.src;
        img.crossOrigin = "anonymous"; 
        img.onload = () => { assetsRef.current.orcSprites[key] = img; };
    });

    // Load Skeleton Sprites
    Object.entries(SKELETON_SPRITES).forEach(([key, config]) => {
        const img = new Image();
        img.src = config.src;
        img.crossOrigin = "anonymous"; 
        img.onload = () => { 
            if (!assetsRef.current.skeletonSprites) assetsRef.current.skeletonSprites = {};
            assetsRef.current.skeletonSprites[key] = img; 
        };
    });

    // Load Wizard Sprites
    Object.entries(WIZARD_SPRITES).forEach(([key, config]) => {
        const img = new Image();
        img.src = config.src;
        img.crossOrigin = "anonymous"; 
        img.onload = () => { 
            if (!assetsRef.current.wizardSprites) assetsRef.current.wizardSprites = {};
            assetsRef.current.wizardSprites[key] = img; 
        };
    });
};

interface DrawParams {
    ctx: CanvasRenderingContext2D;
    canvas: HTMLCanvasElement;
    currentMap: GameMap;
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[];
    loot: Loot[];
    particles: Particle[];
    hazards: Hazard[];
    damageIndicators: DamageIndicator[];
    assets: AssetRefs;
    totalTime: number;
    shake: number;
    joystick: { active: boolean, originX: number, originY: number, currentX: number, currentY: number };
    facing: number;
}

export const drawGame = ({
    ctx, canvas, currentMap, player, enemies, projectiles, loot, particles, hazards, damageIndicators, assets, totalTime, shake, joystick, facing
}: DrawParams) => {
    
    // Background Rendering Logic
    let bgTexture: HTMLImageElement | null = null;
    
    if (currentMap.theme.textureId === 'grass') bgTexture = assets.grassTexture;
    else if (currentMap.theme.textureId === 'neon_dirt') bgTexture = assets.neonTexture;
    else if (currentMap.theme.textureId === 'crimson_stones') bgTexture = assets.crimsonTexture;
    
    if (bgTexture) {
        // Create Pattern for tiling
        const pattern = ctx.createPattern(bgTexture, 'repeat');
        if (pattern) {
            ctx.fillStyle = pattern;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            
            // Optional tint overlay if needed for color matching theme
            if (currentMap.theme.textureId !== 'grass') {
                 // Darken neon/crimson slightly to make sprites pop
                 ctx.fillStyle = 'rgba(0, 0, 0, 0.3)';
                 ctx.fillRect(0, 0, canvas.width, canvas.height);
            }
        } else {
            // Fallback
            ctx.fillStyle = currentMap.theme.bg;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
        }
    } else {
        ctx.fillStyle = currentMap.theme.bg;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    
    // Grid
    ctx.strokeStyle = currentMap.theme.grid;
    ctx.lineWidth = 1;
    const gridSize = 50;
    
    // Shake effect
    ctx.save();
    if (shake > 0) {
        const dx = (Math.random() - 0.5) * shake;
        const dy = (Math.random() - 0.5) * shake;
        ctx.translate(dx, dy);
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
    hazards.forEach(lava => {
        ctx.beginPath();
        ctx.arc(lava.x, lava.y, lava.radius, 0, Math.PI*2);
        ctx.fillStyle = `rgba(255, 68, 0, ${0.4 + Math.sin(totalTime * 0.1) * 0.1})`;
        ctx.fill();
    });

    // Draw Particles
    particles.forEach(part => {
        ctx.globalAlpha = part.life;
        ctx.fillStyle = part.color;
        ctx.beginPath();
        ctx.arc(part.x, part.y, part.radius, 0, Math.PI * 2);
        ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw Loot
    loot.forEach(l => {
        let r = l.radius;
        let c = l.color;
        
        if (l.type === 'xp') {
            if (l.value < 5) { r=3; c='#ffffcc'; }
            else if (l.value < 20) { r=5; c='#ffff00'; }
            else if (l.value < 80) { r=7; c='#00ffff'; }
            else if (l.value < 500) { r=10; c='#ff00ff'; }
            else { r=16; c='#ffaa00'; }
        }

        ctx.fillStyle = c;
        ctx.beginPath();
        ctx.arc(l.x, l.y, r, 0, Math.PI * 2);
        ctx.fill();
        
        if (l.type === 'health') {
            ctx.fillStyle = 'white';
            ctx.fillRect(l.x-2, l.y-6, 4, 12);
            ctx.fillRect(l.x-6, l.y-2, 12, 4);
        }
    });

    // Draw Enemies (MOVED BEFORE PLAYER)
    enemies.forEach(enemy => {
        ctx.save();
        ctx.translate(enemy.x, enemy.y);
        
        const dx = player.x - enemy.x;
        const isFacingLeft = dx < 0;

        if (enemy.type === 'basic' || enemy.type === 'swarmer' || enemy.type === 'goliath') {
            const anim = enemy.state || 'walk';
            // Determine which sprite set to use
            let spriteSet = assets.orcSprites;
            let configSet: any = ORC_SPRITES;

            if (enemy.type === 'swarmer') {
                spriteSet = assets.skeletonSprites;
                configSet = SKELETON_SPRITES;
            } else if (enemy.type === 'goliath') {
                spriteSet = assets.wizardSprites;
                configSet = WIZARD_SPRITES;
            }
            
            const spriteSheet = spriteSet ? spriteSet[anim] : null;
            
            if (spriteSheet) {
                const cfg = configSet[anim as keyof typeof configSet];
                const frameW = cfg.width;
                const frameH = spriteSheet.height; 
                const sx = Math.floor(enemy.frame) * frameW;
                
                if (isFacingLeft) ctx.scale(-1, 1);

                let size;
                if (enemy.type === 'swarmer') {
                    // Skeletons are smaller radius, so we need a bigger multiplier to see the sprite detail
                    size = enemy.radius * 14; 
                } else if (enemy.type === 'goliath') {
                    // Wizards are large
                    size = enemy.radius * 12;
                } else {
                    // Orcs
                    const ORC_SCALE = 3;
                    size = enemy.radius * 7 * ORC_SCALE;
                }
                
                ctx.imageSmoothingEnabled = false;
                ctx.drawImage(spriteSheet, sx, 0, frameW, frameH, -size/2, -size/2, size, size);
            } else {
                ctx.fillStyle = enemy.color;
                ctx.beginPath();
                ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
                ctx.fill();
            }
        } else {
            const img = assets.enemyImages[enemy.type];
            if (img) {
                const size = enemy.radius * 3.5;
                if (enemy.type === 'rusher') {
                    // Arrow / Rusher: Rotate based on movement direction (velocity)
                    const angle = Math.atan2(enemy.vy, enemy.vx);
                    // Add PI/4 (45deg) if the arrow sprite is diagonal, or PI/2 if Up.
                    // Assuming the arrow sprite points right (0 deg) by default.
                    ctx.rotate(angle);
                } else {
                    if (isFacingLeft) ctx.scale(-1, 1);
                }
                ctx.drawImage(img, -size/2, -size/2, size, size);
                if (enemy.type !== 'rusher' && isFacingLeft) ctx.scale(-1, 1); 
            } else {
                // Fallback Shapes
                ctx.fillStyle = enemy.color;
                ctx.beginPath();
                if (enemy.type === 'rusher') {
                    const angle = Math.atan2(enemy.vy, enemy.vx);
                    ctx.rotate(angle);
                    ctx.moveTo(enemy.radius, 0);
                    ctx.lineTo(-enemy.radius, enemy.radius/1.5);
                    ctx.lineTo(-enemy.radius, -enemy.radius/1.5);
                } else {
                    ctx.arc(0, 0, enemy.radius, 0, Math.PI * 2);
                }
                ctx.fill();
            }
        }

        // Boss Health Bar
        if (enemy.type === 'boss') {
            ctx.fillStyle = 'red';
            ctx.fillRect(-30, -60, 60, 8);
            ctx.fillStyle = '#00ff00';
            ctx.fillRect(-30, -60, 60 * (enemy.hp / enemy.maxHp), 8);
        }

        ctx.restore();
    });

    // Draw Player
    ctx.save();
    ctx.translate(player.x, player.y);
    if (player.activeAbility === 'dash' && player.abilityActiveTimer > 0) {
        ctx.globalAlpha = 0.5; // Ghost effect
    }
    
    // Shield Visual
    if (player.activeAbility === 'shield' && player.abilityActiveTimer > 0) {
        ctx.beginPath();
        ctx.arc(0, 0, player.radius + 10, 0, Math.PI*2);
        ctx.strokeStyle = `rgba(0, 136, 255, ${0.5 + Math.sin(totalTime * 0.2)*0.3})`;
        ctx.lineWidth = 3;
        ctx.stroke();
    }
    
    // DRAW KNIGHT SPRITE
    const animState = player.state;
    const spriteSheet = assets.knightSprites ? assets.knightSprites[animState] : null;

    if (spriteSheet) {
        const config = KNIGHT_SPRITES[animState as keyof typeof KNIGHT_SPRITES];
        if (config) {
            const frameW = config.width;
            const frameH = spriteSheet.height;
            // Ensure frame is within bounds
            const currentFrame = Math.floor(player.frame) % config.frames;
            const sx = currentFrame * frameW;
            
            // Knight sprites are quite large and centered, need scaling
            const scale = 1.5; 
            
            ctx.scale(player.facing, 1); // Flip if facing left
            // The sprite pivot is usually center bottom, adjust offset
            // Hero sprites are 180x180, char is roughly in middle
            ctx.drawImage(spriteSheet, sx, 0, frameW, frameH, -(frameW * scale)/2, -(frameH * scale)/2 - 15, frameW * scale, frameH * scale);
        }
    } else {
        // Fallback Circle
        ctx.fillStyle = player.color;
        ctx.beginPath();
        ctx.arc(0, 0, player.radius, 0, Math.PI * 2);
        ctx.fill();
    }
    ctx.restore();

    // Draw Projectiles
    projectiles.forEach(proj => {
        ctx.save();
        if (proj.isMaxRank) {
            ctx.shadowBlur = 15;
            ctx.shadowColor = proj.color;
        }

        if (proj.behavior === 'hazard') {
            const alpha = Math.min(1, proj.duration / 30);
            ctx.globalAlpha = alpha;
            ctx.fillStyle = proj.color; 
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.aoeRadius || 40, 0, Math.PI*2);
            ctx.fill();
        } else if (proj.behavior === 'lightning') {
            ctx.strokeStyle = proj.isMaxRank ? '#ffffff' : proj.color;
            ctx.lineWidth = proj.isMaxRank ? 6 : 3;
            ctx.beginPath();
            ctx.moveTo(proj.x, proj.y);
            const midX = (proj.x + proj.vx)/2 + (Math.random()-0.5)*20;
            const midY = (proj.y + proj.vy)/2 + (Math.random()-0.5)*20;
            ctx.lineTo(midX, midY);
            ctx.lineTo(proj.vx, proj.vy);
            ctx.stroke();
        } else if (proj.behavior === 'melee') {
            // Melee Slash Effect
            // Visual depends on player facing stored in App or simpler: determine from projectile velocity if any?
            // Actually melee sticks to player usually, but let's draw a slash arc at proj.x, proj.y
            const lifePercent = proj.duration / 15; // Assuming 15 frame duration
            ctx.translate(proj.x, proj.y);
            // Flip based on facing relative to player? simpler: assume proj.vx stores facing direction for melee
            const dir = Math.sign(proj.vx) || 1; 
            ctx.scale(dir, 1);
            
            ctx.globalAlpha = lifePercent;
            ctx.strokeStyle = proj.color; // Cyan or White
            ctx.lineWidth = 4;
            ctx.beginPath();
            // Draw an arc slash
            ctx.arc(0, 0, 40, -Math.PI/2, Math.PI/2, false);
            ctx.stroke();
            
            // Add a glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = proj.color;
            ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.fill();

            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1.0;
        } else {
            ctx.fillStyle = proj.color;
            ctx.beginPath();
            ctx.arc(proj.x, proj.y, proj.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    });

    // Draw Damage Indicators
    damageIndicators.forEach(dmg => {
        ctx.save();
        ctx.globalAlpha = Math.max(0, dmg.life);
        ctx.fillStyle = dmg.color;
        ctx.strokeStyle = 'black';
        ctx.lineWidth = 2;
        ctx.font = `${dmg.scale * (dmg.color === '#ff0000' ? 24 : 16)}px 'Segoe UI', sans-serif`;
        ctx.textAlign = 'center';
        
        const shakeX = dmg.color === '#ff0000' || dmg.isCrit ? (Math.random()-0.5)*2 : 0;
        ctx.strokeText(dmg.value.toString(), dmg.x + shakeX, dmg.y);
        ctx.fillText(dmg.value.toString(), dmg.x + shakeX, dmg.y);
        ctx.restore();
    });

    ctx.restore(); // Restore main shake

    // Joystick Overlay
    if (joystick.active) {
        ctx.save();
        ctx.beginPath();
        ctx.arc(joystick.originX, joystick.originY, 40, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.beginPath();
        ctx.arc(joystick.currentX, joystick.currentY, 20, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
        ctx.fill();
        ctx.restore();
    }
};
