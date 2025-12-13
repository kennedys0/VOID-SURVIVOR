
import React, { useRef, useEffect, useCallback } from 'react';
import { Player, Enemy, Projectile, Loot, GameState, VoidEvent, Particle, GameMap, Hazard, DamageIndicator } from '../types';
import { generateVoidEvent } from '../services/geminiService';
import { useGameInput } from '../hooks/useGameInput';
import { loadGameAssets, drawGame, AssetRefs } from '../systems/RenderSystem';
import { updateGame } from '../systems/GameLoop';

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
  
  // Game Entities Refs
  const enemiesRef = useRef<Enemy[]>([]);
  const projectilesRef = useRef<Projectile[]>([]);
  const lootRef = useRef<Loot[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const hazardsRef = useRef<Hazard[]>([]);
  const damageIndicatorsRef = useRef<DamageIndicator[]>([]);
  
  // Assets Ref
  // Added knightSprites initialization to match AssetRefs interface
  const assetsRef = useRef<AssetRefs>({ 
    playerImage: null, 
    enemyImages: {}, 
    orcSprites: {}, 
    skeletonSprites: {}, 
    wizardSprites: {}, 
    knightSprites: {},
    grassTexture: null,
    neonTexture: null,
    crimsonTexture: null
  });

  // Input Hook
  const { keysPressed, joystickRef, bindTouchEvents } = useGameInput(gameState, setGameState);

  // Mutable Game State (Things that change every frame but aren't React state)
  const shakeRef = useRef(0);
  const damageFeedbackTimerRef = useRef(0);
  const scoreRef = useRef(0);
  const killsRef = useRef(0);
  const facingRef = useRef(1); // 1 = Right, -1 = Left
  
  // Time & Logic State
  const timeState = useRef({
      totalTime: 0,
      spawnTimer: 0,
      spawnRate: 60,
      enemySpeedMult: 1,
      difficultyMult: 1
  });

  // --- INITIALIZATION ---

  // Load Assets
  useEffect(() => {
    loadGameAssets(assetsRef);
  }, []);

  // Initialize Map Hazards
  useEffect(() => {
    hazardsRef.current = [];
    if (currentMap.hazardType === 'lava_pools') {
        const w = window.innerWidth;
        const h = window.innerHeight;
        for(let i = 0; i < 5; i++) {
            hazardsRef.current.push({
                id: `lava_${i}`, x: Math.random() * w, y: Math.random() * h, radius: 60 + Math.random() * 40, color: '#ff4400', markedForDeletion: false, type: 'lava', damage: 0.2
            });
        }
    }
    // Reset Game Loop State on map change
    timeState.current = { totalTime: 0, spawnTimer: 0, spawnRate: 60, enemySpeedMult: 1, difficultyMult: 1 };
    enemiesRef.current = [];
    projectilesRef.current = [];
    lootRef.current = [];
    particlesRef.current = [];
    damageIndicatorsRef.current = [];
    scoreRef.current = 0;
    killsRef.current = 0;
  }, [currentMap]);

  // Bind Touch Inputs
  useEffect(() => {
      if (canvasRef.current) return bindTouchEvents(canvasRef.current);
  }, [bindTouchEvents]);

  // AI Trigger
  const triggerVoidEvent = useCallback(async () => {
    if (gameState !== GameState.PLAYING) return;
    const event = await generateVoidEvent(playerRef.current.level, scoreRef.current, playerRef.current.hp / playerRef.current.maxHp);
    setVoidMessage(event);
    if (event.modifier.enemySpeedMultiplier) timeState.current.enemySpeedMult = event.modifier.enemySpeedMultiplier;
    setTimeout(() => setVoidMessage(null), 5000);
  }, [gameState, playerRef, setVoidMessage]);


  // --- MAIN LOOP ---

  const animate = useCallback(() => {
    requestRef.current = requestAnimationFrame(animate);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (gameState !== GameState.PLAYING) {
        if (gameState !== GameState.PAUSED && gameState !== GameState.LEVEL_UP && gameState !== GameState.GAME_OVER) {
             // Clear screen for menu/prep
             ctx.clearRect(0, 0, canvas.width, canvas.height);
        }
        // If paused/gameover, we keep drawing the last frame (or overlay handles opacity)
        if (gameState === GameState.PAUSED) {
            // Optional: Draw pause effect here if not handled by UI Overlay
        }
        return;
    }

    // 1. UPDATE LOGIC
    updateGame({
        canvasWidth: canvas.width,
        canvasHeight: canvas.height,
        currentMap,
        player: playerRef.current,
        enemies: enemiesRef.current,
        projectiles: projectilesRef.current,
        loot: lootRef.current,
        particles: particlesRef.current,
        hazards: hazardsRef.current,
        damageIndicators: damageIndicatorsRef.current,
        keysPressed: keysPressed.current,
        joystick: joystickRef.current,
        timeState: timeState.current,
        shakeRef,
        damageFeedbackTimerRef,
        scoreRef,
        killsRef,
        facingRef,
        callbacks: {
            setVoidMessage,
            triggerVoidEvent,
            onLevelUp,
            onGameOver
        }
    });

    // 2. CLEANUP
    enemiesRef.current = enemiesRef.current.filter(e => !e.markedForDeletion);
    projectilesRef.current = projectilesRef.current.filter(p => !p.markedForDeletion);
    lootRef.current = lootRef.current.filter(l => !l.markedForDeletion);
    particlesRef.current = particlesRef.current.filter(p => !p.markedForDeletion);
    damageIndicatorsRef.current = damageIndicatorsRef.current.filter(d => d.life > 0);

    // 3. UI SYNC (Throttle to 30 frames for performance)
    if (timeState.current.totalTime % 30 === 0) {
        const minutes = Math.floor(timeState.current.totalTime / 3600);
        const seconds = Math.floor((timeState.current.totalTime % 3600) / 60);
        setGameTime(`${minutes}:${seconds < 10 ? '0' : ''}${seconds}`);
        setWave(minutes + 1);
        setScore(scoreRef.current); // Sync visual score
        setPlayerStats(playerRef.current.xp, playerRef.current.xpToNextLevel, playerRef.current.activeAbility, playerRef.current.abilityTimer, playerRef.current.abilityCooldown);
        setPlayerHp(playerRef.current.hp);
        setPlayerMaxHp(playerRef.current.maxHp);
    }

    // 4. RENDER
    drawGame({
        ctx,
        canvas,
        currentMap,
        player: playerRef.current,
        enemies: enemiesRef.current,
        projectiles: projectilesRef.current,
        loot: lootRef.current,
        particles: particlesRef.current,
        hazards: hazardsRef.current,
        damageIndicators: damageIndicatorsRef.current,
        assets: assetsRef.current,
        totalTime: timeState.current.totalTime,
        shake: shakeRef.current,
        joystick: joystickRef.current,
        facing: facingRef.current
    });

    // Reduce shake decay
    if (shakeRef.current > 0) {
        shakeRef.current *= 0.9;
        if (shakeRef.current < 0.5) shakeRef.current = 0;
    }
    if (damageFeedbackTimerRef.current > 0) damageFeedbackTimerRef.current--;

  }, [gameState, currentMap, onLevelUp, onGameOver, setGameTime, setScore, setPlayerHp, setPlayerMaxHp, setPlayerStats, setWave, setVoidMessage, triggerVoidEvent, keysPressed]); // dependencies

  // Resize Handler
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
      
      // Start Loop
      requestRef.current = requestAnimationFrame(animate);
      
      return () => {
          window.removeEventListener('resize', handleResize);
          cancelAnimationFrame(requestRef.current);
      }
    }
  }, [animate]);

  // Special Event Listeners (Ability Trigger from UI)
  useEffect(() => {
      const handleTriggerAbility = () => {
          // We trigger it via keyboard simulation or direct call
          // Since logic is in updateGame via keys, let's simulate key press or modify ref directly
          // Best way: check if space was pressed in update, OR set a flag.
          // Let's simulate spacebar press for one frame via key ref
          keysPressed.current['Space'] = true;
          setTimeout(() => keysPressed.current['Space'] = false, 100);
      };
      window.addEventListener('trigger-ability', handleTriggerAbility);
      return () => window.removeEventListener('trigger-ability', handleTriggerAbility);
  }, []);

  return <canvas ref={canvasRef} className="block touch-none" />;
};

export default GameCanvas;
