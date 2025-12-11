
import React, { useState, useEffect } from 'react';
import { UpgradeDisplay, GameState, VoidEvent, WeaponType, GameMap, LeaderboardEntry, UserProfile, MetaUpgradeConfig, MetaUpgradeId } from '../types';

interface UIOverlayProps {
  gameState: GameState;
  score: number;
  hp: number;
  maxHp: number;
  xp: number;
  maxXp: number;
  level: number;
  abilityType: string;
  abilityCooldown: number;
  abilityMaxCooldown: number;
  voidMessage: VoidEvent | null;
  upgradeOptions: UpgradeDisplay[];
  onSelectUpgrade: (opt: UpgradeDisplay) => void;
  onRestart: () => void;
  onStart: () => void;
  onLaunch: (weapon: WeaponType) => void;
  onResume: () => void;
  onQuit: () => void;
  gameTime: string;
  wave: number;
  maps: GameMap[];
  onSelectMap: (map: GameMap) => void;
  currentMap: GameMap;
  leaderboard: LeaderboardEntry[];
  isNewHighScore: boolean;
  onSaveScore: (name: string) => void;
  
  // Meta Progression
  userProfile: UserProfile;
  metaUpgrades: MetaUpgradeConfig[];
  onBuyMetaUpgrade: (id: MetaUpgradeId) => void;
  onCloseShop: () => void;
  onOpenShop: () => void;
  earnedCredits: number;
}

const UIOverlay: React.FC<UIOverlayProps> = ({
  gameState,
  score,
  hp,
  maxHp,
  xp,
  maxXp,
  level,
  abilityType,
  abilityCooldown,
  abilityMaxCooldown,
  voidMessage,
  upgradeOptions,
  onSelectUpgrade,
  onRestart,
  onStart,
  onLaunch,
  onResume,
  onQuit,
  gameTime,
  wave,
  maps,
  onSelectMap,
  currentMap,
  leaderboard,
  isNewHighScore,
  onSaveScore,
  userProfile,
  metaUpgrades,
  onBuyMetaUpgrade,
  onCloseShop,
  onOpenShop,
  earnedCredits
}) => {
  const [prepStage, setPrepStage] = useState<'map' | 'weapon'>('map');
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('pistol');
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState("Survivor");
  const [scoreSaved, setScoreSaved] = useState(false);

  // Reset internal states on new game
  useEffect(() => {
    if (gameState === GameState.MENU) {
        setScoreSaved(false);
        setPlayerName("Survivor");
        setPrepStage('map');
    }
  }, [gameState]);

  const hpPercent = Math.max(0, (hp / maxHp) * 100);
  const xpPercent = Math.min(100, (xp / maxXp) * 100);
  
  // Calculate Ability Cooldown % (0 is ready)
  const cooldownPercent = Math.max(0, (abilityCooldown / abilityMaxCooldown) * 100);
  const isAbilityReady = abilityCooldown <= 0;
  
  // Wave 4 is Boss Wave (Min 3)
  const isBossWave = wave === 4;

  const abilityName = {
    'dash': 'DASH',
    'shield': 'SHIELD',
    'nova': 'NOVA'
  }[abilityType] || 'ABILITY';

  const getAbilityTheme = () => {
      switch(abilityType) {
          case 'shield': return { icon: '🛡️', color: 'text-blue-400', border: 'border-blue-500', shadow: 'shadow-blue-500/50', bg: 'bg-blue-900/80' };
          case 'nova': return { icon: '💥', color: 'text-purple-400', border: 'border-purple-500', shadow: 'shadow-purple-500/50', bg: 'bg-purple-900/80' };
          default: return { icon: '⚡', color: 'text-cyan-400', border: 'border-cyan-500', shadow: 'shadow-cyan-500/50', bg: 'bg-cyan-900/80' };
      }
  };
  const theme = getAbilityTheme();

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6 overflow-hidden select-none font-sans">
      
      {/* --- HUD (Visible during Gameplay) --- */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <>
        <div className="flex justify-between items-start pointer-events-auto w-full z-10">
            {/* LEFT: Player Vitality */}
            <div className="flex flex-col gap-1 w-80 filter drop-shadow-md">
                <div className="flex items-center gap-2 mb-1">
                    <span className="bg-gray-800 text-white font-bold px-2 py-0.5 rounded text-xs border border-gray-600">LVL {level}</span>
                </div>
                <div className="relative w-full h-8 bg-black/60 rounded skew-x-[-10deg] border border-gray-600 overflow-hidden backdrop-blur-sm">
                    <div 
                    className="h-full bg-gradient-to-r from-red-700 via-red-500 to-red-400 transition-all duration-200 ease-out"
                    style={{ width: `${hpPercent}%` }}
                    />
                    <div className="absolute inset-0 flex items-center justify-start px-4 skew-x-[10deg]">
                        <span className="text-white font-black text-sm tracking-wider drop-shadow-md flex items-center gap-2">
                            <span>HP</span>
                            <span className="font-mono text-lg">{Math.ceil(hp)}/{Math.ceil(maxHp)}</span>
                        </span>
                    </div>
                </div>
                <div className="w-full h-2 bg-black/60 rounded-full mt-1 border border-gray-700 overflow-hidden">
                    <div 
                    className="h-full bg-gradient-to-r from-blue-600 to-cyan-400 transition-all duration-300"
                    style={{ width: `${xpPercent}%` }}
                    />
                </div>
            </div>

            {/* CENTER: Timer & Wave */}
            <div className="absolute left-1/2 -translate-x-1/2 top-6 flex flex-col items-center gap-2">
                <div className="bg-black/50 backdrop-blur-md px-4 py-1 rounded-lg border border-gray-600 shadow-lg flex flex-col items-center">
                    <span className="font-mono text-2xl font-bold text-white tracking-widest">{gameTime}</span>
                    <span className="text-[10px] text-gray-400 uppercase tracking-widest">{currentMap.name}</span>
                </div>
                <div className={`px-3 py-0.5 rounded text-xs font-black tracking-widest uppercase border backdrop-blur-md ${isBossWave ? 'bg-red-900/80 text-red-200 border-red-500 animate-pulse' : 'bg-black/40 text-gray-300 border-gray-700'}`}>
                    {isBossWave ? 'BOSS INCURSION' : `WAVE ${wave}`}
                </div>
            </div>

            {/* RIGHT: Score Counter */}
            <div className="text-right filter drop-shadow-lg">
            <div className="text-6xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-400 tracking-tighter tabular-nums leading-none">
                {score.toLocaleString()}
            </div>
            <div className="text-gray-400 text-xs font-bold tracking-[0.3em] uppercase opacity-80 mr-1">
                Score
            </div>
            </div>
        </div>

        {/* --- CENTER: Notifications --- */}
        {voidMessage && (
            <div className="absolute top-[20%] left-1/2 -translate-x-1/2 w-full max-w-2xl text-center pointer-events-none z-0">
                <div className="bg-gradient-to-r from-transparent via-black/60 to-transparent p-6 backdrop-blur-sm">
                    <h3 className="text-purple-400 font-bold uppercase tracking-[0.5em] text-xs mb-2 animate-pulse border-b border-purple-500/30 inline-block px-4 pb-1">
                        {voidMessage.title}
                    </h3>
                    <p className="text-2xl text-white font-serif italic text-shadow-lg leading-relaxed">
                        "{voidMessage.message}"
                    </p>
                </div>
            </div>
        )}

        {/* --- BOTTOM: Ability Indicator --- */}
        <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center group pointer-events-auto z-10">
            <div className={`
                relative w-24 h-24 rounded-full bg-gray-900/90 border-4 
                flex items-center justify-center overflow-hidden transition-all duration-300
                ${isAbilityReady ? `scale-110 ${theme.border} ${theme.shadow} shadow-[0_0_30px_rgba(0,0,0,0.5)]` : 'border-gray-700 scale-100 opacity-80 grayscale'}
            `}>
                {!isAbilityReady && (
                    <div 
                        className="absolute bottom-0 left-0 w-full bg-black/70 z-20 pointer-events-none"
                        style={{ height: `${cooldownPercent}%`, transition: 'height 0.1s linear' }}
                    />
                )}
                <div className={`text-5xl z-10 transition-transform duration-500 ${isAbilityReady ? 'scale-110' : 'scale-90'}`}>
                    {theme.icon}
                </div>
                <div className="absolute bottom-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white font-bold border border-white/10 backdrop-blur-sm z-30">
                    SPACE
                </div>
            </div>
            <div className="mt-4 flex flex-col items-center">
                <div className={`
                    text-sm font-black tracking-widest uppercase px-4 py-1 rounded-full backdrop-blur-md transition-colors duration-300
                    ${isAbilityReady ? `bg-white text-black shadow-lg` : 'bg-black/50 text-gray-500 border border-gray-700'}
                `}>
                    {isAbilityReady ? 'READY' : 'RECHARGING'}
                </div>
                <div className={`text-[10px] font-bold mt-2 tracking-[0.2em] uppercase ${isAbilityReady ? theme.color : 'text-gray-600'}`}>
                    {abilityName}
                </div>
            </div>
        </div>
        </>
      )}

      {/* --- PAUSE MENU --- */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-gray-900 border border-gray-700 p-10 rounded-2xl shadow-2xl text-center max-w-md w-full relative overflow-hidden">
             <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-cyan-500 to-transparent"></div>
             
             <h2 className="text-4xl font-black text-white mb-2 tracking-widest uppercase">System Paused</h2>
             <div className="text-gray-500 font-mono text-sm mb-8 tracking-widest">COMBAT SIMULATION SUSPENDED</div>
             
             <div className="flex flex-col gap-4">
                 <button 
                    onClick={onResume}
                    className="bg-white text-black font-bold py-4 rounded hover:bg-gray-200 transition-colors uppercase tracking-widest"
                 >
                     Resume Mission
                 </button>
                 <button 
                    onClick={onQuit}
                    className="bg-transparent border border-red-500/50 text-red-400 font-bold py-4 rounded hover:bg-red-900/20 hover:text-red-200 transition-colors uppercase tracking-widest"
                 >
                     Abort Mission
                 </button>
             </div>
          </div>
        </div>
      )}

      {/* --- MENUS --- */}
      
      {/* Main Menu */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 bg-black/90 flex items-center justify-center pointer-events-auto z-50">
          <div className="text-center relative">
            {!showLeaderboard && (
                <>
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
                <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-700"></div>
                
                <h1 className="text-8xl font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-gray-500 mb-2 tracking-tighter drop-shadow-2xl relative z-10">
                VOID<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-purple-400 to-indigo-500">SURVIVOR</span>
                </h1>
                <div className="h-1 w-32 bg-gradient-to-r from-purple-500 to-indigo-500 mx-auto mb-6 rounded-full"></div>
                
                <div className="flex flex-col gap-4 items-center relative z-10">
                    <button 
                    onClick={() => { setPrepStage('map'); onStart(); }}
                    className="group relative bg-white text-black px-10 py-4 rounded-full font-black text-2xl transition-all hover:scale-105 hover:shadow-[0_0_40px_rgba(255,255,255,0.4)] overflow-hidden w-72"
                    >
                        <div className="absolute inset-0 bg-gradient-to-r from-purple-200 to-blue-200 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        <span className="relative">INITIALIZE SYSTEM</span>
                    </button>

                    <button 
                        onClick={onOpenShop}
                        className="group bg-transparent border-2 border-cyan-500/50 text-cyan-400 px-10 py-3 rounded-full font-bold text-lg transition-all hover:border-cyan-400 hover:text-cyan-100 hover:bg-cyan-900/20 w-72 flex items-center justify-center gap-2"
                    >
                        <span>SYSTEM UPGRADES</span>
                        <span className="text-xs bg-cyan-900 px-2 py-0.5 rounded text-white">{userProfile.credits.toLocaleString()} pts</span>
                    </button>

                    <button 
                    onClick={() => setShowLeaderboard(true)}
                    className="group bg-transparent border-2 border-gray-700 text-gray-300 px-10 py-3 rounded-full font-bold text-lg transition-all hover:border-white hover:text-white hover:bg-white/10 w-72"
                    >
                        LEADERBOARD
                    </button>
                </div>
                </>
            )}

            {/* Leaderboard Overlay */}
            {showLeaderboard && (
                <div className="bg-gray-900 border border-gray-700 rounded-xl p-8 w-[600px] max-w-full relative z-20 shadow-2xl">
                     <h2 className="text-3xl font-black text-white mb-6 uppercase tracking-widest">Global Records</h2>
                     
                     <div className="flex gap-4 mb-4 border-b border-gray-700 pb-2">
                         <span className="text-gray-500 font-bold text-xs uppercase flex-1 text-left">Pilot</span>
                         <span className="text-gray-500 font-bold text-xs uppercase flex-1">Map</span>
                         <span className="text-gray-500 font-bold text-xs uppercase flex-1 text-right">Wave</span>
                         <span className="text-gray-500 font-bold text-xs uppercase flex-1 text-right">Score</span>
                     </div>
                     
                     <div className="max-h-80 overflow-y-auto scrollbar-hide flex flex-col gap-2">
                        {leaderboard.length === 0 ? (
                            <div className="text-gray-600 py-10 italic">No combat data recorded.</div>
                        ) : (
                            leaderboard.map((entry, idx) => (
                                <div key={idx} className="flex gap-4 items-center bg-gray-800/50 p-3 rounded hover:bg-gray-800 transition-colors">
                                    <div className="flex-1 text-left font-bold text-white flex items-center gap-2">
                                        <span className={`text-xs w-5 h-5 flex items-center justify-center rounded-full ${idx < 3 ? 'bg-yellow-500 text-black' : 'bg-gray-700 text-gray-400'}`}>{idx + 1}</span>
                                        {entry.name}
                                    </div>
                                    <div className="flex-1 text-xs text-gray-400 uppercase">{entry.mapName}</div>
                                    <div className="flex-1 text-right text-gray-300 font-mono">W{entry.wave}</div>
                                    <div className="flex-1 text-right text-cyan-400 font-bold font-mono">{entry.score.toLocaleString()}</div>
                                </div>
                            ))
                        )}
                     </div>

                     <button 
                        onClick={() => setShowLeaderboard(false)}
                        className="mt-8 text-gray-400 hover:text-white font-bold uppercase tracking-widest text-sm"
                     >
                         Close Database
                     </button>
                </div>
            )}
          </div>
        </div>
      )}

      {/* SHOP (SYSTEM UPGRADES) */}
      {gameState === GameState.SHOP && (
          <div className="absolute inset-0 bg-gray-950 flex flex-col items-center justify-center pointer-events-auto z-50">
              <div className="w-full max-w-6xl p-8 h-full flex flex-col">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8 border-b border-gray-800 pb-4">
                      <div>
                        <h2 className="text-4xl font-black text-white tracking-widest uppercase">Meta-Augmentations</h2>
                        <p className="text-gray-400">Expend combat data points to permanently enhance capabilities.</p>
                      </div>
                      <div className="bg-gray-900 px-6 py-3 rounded-lg border border-cyan-500/30 flex flex-col items-end">
                          <span className="text-xs text-gray-500 uppercase tracking-widest">Available Points</span>
                          <span className="text-3xl font-mono text-cyan-400 font-bold">{userProfile.credits.toLocaleString()}</span>
                      </div>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 overflow-y-auto pb-20">
                      {metaUpgrades.map(upgrade => {
                          const currentRank = userProfile.upgrades[upgrade.id];
                          const nextCost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, currentRank));
                          const isMaxed = currentRank >= upgrade.maxRank;
                          const canAfford = userProfile.credits >= nextCost && !isMaxed;
                          
                          // Description calculation
                          const currentStat = currentRank * upgrade.statPerRank;
                          const nextStat = (currentRank + 1) * upgrade.statPerRank;
                          const formatVal = (v: number) => upgrade.format === 'percent' ? `${Math.round(v * 100)}%` : v;

                          return (
                              <div key={upgrade.id} className={`p-6 bg-gray-900 border ${isMaxed ? 'border-yellow-500/50' : 'border-gray-700'} rounded-xl flex flex-col`}>
                                  <div className="flex justify-between items-start mb-2">
                                      <h3 className="text-xl font-bold text-white">{upgrade.name}</h3>
                                      <span className="text-xs font-mono text-gray-500 bg-gray-800 px-2 py-1 rounded">LVL {currentRank} / {upgrade.maxRank}</span>
                                  </div>
                                  <p className="text-gray-400 text-sm mb-4 h-10">{upgrade.description}</p>
                                  
                                  <div className="mt-auto">
                                      <div className="flex justify-between text-xs font-mono text-gray-500 mb-4 bg-black/30 p-2 rounded">
                                          <span>Current: <span className="text-white">{formatVal(currentStat)}</span></span>
                                          {!isMaxed && <span>Next: <span className="text-green-400">{formatVal(nextStat)}</span></span>}
                                      </div>

                                      <button 
                                          onClick={() => onBuyMetaUpgrade(upgrade.id)}
                                          disabled={!canAfford && !isMaxed}
                                          className={`w-full py-3 rounded font-bold uppercase tracking-widest transition-all
                                            ${isMaxed 
                                                ? 'bg-yellow-600/20 text-yellow-500 cursor-default border border-yellow-500/30'
                                                : canAfford 
                                                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-500/20' 
                                                    : 'bg-gray-800 text-gray-500 cursor-not-allowed'}
                                          `}
                                      >
                                          {isMaxed ? 'MAXIMUM RANK' : `INSTALL (${nextCost.toLocaleString()})`}
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  {/* Footer Back Button */}
                  <div className="absolute bottom-8 left-8">
                      <button 
                          onClick={onCloseShop}
                          className="text-gray-400 hover:text-white font-bold uppercase tracking-widest text-lg flex items-center gap-2"
                      >
                          ← Return to Menu
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Preparation / Loadout Screen */}
      {gameState === GameState.PREPARATION && (
        <div className="absolute inset-0 bg-black/95 flex flex-col items-center justify-center pointer-events-auto z-50 backdrop-blur-sm">
             <div className="text-center mb-10">
                <h2 className="text-4xl font-black text-white tracking-widest uppercase border-b border-gray-700 pb-2 mb-2">
                    {prepStage === 'map' ? 'Sector Selection' : 'Loadout Selection'}
                </h2>
                <p className="text-gray-400">
                    {prepStage === 'map' ? 'Choose your engagement zone.' : 'Choose your starting armament.'}
                </p>
             </div>

             {/* MAP SELECTION STAGE */}
             {prepStage === 'map' && (
                 <div className="grid grid-cols-3 gap-6 w-full max-w-6xl px-10">
                    {maps.map(map => (
                        <button 
                            key={map.id}
                            onClick={() => onSelectMap(map)}
                            className={`
                                relative p-8 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-105 group h-96 flex flex-col
                                ${currentMap.id === map.id ? `bg-opacity-20 border-opacity-100 shadow-[0_0_30px_rgba(0,0,0,0.5)]` : 'bg-gray-900/60 border-gray-700 hover:border-gray-500'}
                            `}
                            style={{
                                borderColor: currentMap.id === map.id ? map.theme.accent : undefined,
                                backgroundColor: currentMap.id === map.id ? map.theme.bg : undefined
                            }}
                        >
                            <div className="text-xs font-bold px-2 py-1 rounded bg-black/50 inline-block mb-4 self-start border border-gray-700">
                                {map.difficulty}
                            </div>
                            <h3 className="text-3xl font-bold mb-2 text-white">{map.name}</h3>
                            <p className="text-gray-400 text-sm mb-6 leading-relaxed">{map.description}</p>
                            
                            <div className="mt-auto">
                                <div className="text-xs uppercase tracking-widest text-gray-500 mb-2">Environmental Hazard</div>
                                <div className={`text-sm font-bold flex items-center gap-2`} style={{ color: map.theme.accent }}>
                                    {map.hazardType === 'none' && <span>None</span>}
                                    {map.hazardType === 'electric_walls' && <span>⚡ Electrified Perimeter</span>}
                                    {map.hazardType === 'lava_pools' && <span>🔥 Magma Pools</span>}
                                </div>
                                <div className="mt-4 pt-4 border-t border-white/10 flex justify-between text-xs text-gray-400">
                                    <span>CREDIT YIELD:</span>
                                    <span className="text-white font-mono font-bold">x{map.creditsMultiplier}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                 </div>
             )}

             {/* WEAPON SELECTION STAGE */}
             {prepStage === 'weapon' && (
                <div className="grid grid-cols-3 gap-6 w-full max-w-5xl px-10">
                    {/* PISTOL CARD */}
                    <button 
                        onClick={() => setSelectedWeapon('pistol')}
                        className={`
                            relative p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-105 group h-80 flex flex-col
                            ${selectedWeapon === 'pistol' ? 'bg-cyan-900/40 border-cyan-400 shadow-[0_0_30px_rgba(0,255,255,0.2)]' : 'bg-gray-900/60 border-gray-700 hover:border-gray-500'}
                        `}
                    >
                        <div className="text-4xl mb-4 bg-cyan-900/50 w-16 h-16 rounded-full flex items-center justify-center border border-cyan-500/50 shadow-lg">🔫</div>
                        <h3 className={`text-2xl font-bold mb-2 ${selectedWeapon === 'pistol' ? 'text-cyan-400' : 'text-white'}`}>Pulse Pistol</h3>
                        <p className="text-gray-400 text-sm mb-4">Standard issue automatic energy weapon. Balanced damage and fire rate.</p>
                        
                        <div className="mt-auto space-y-2 text-xs font-mono text-gray-500">
                            <div className="flex justify-between"><span>DAMAGE</span> <div className="w-20 bg-gray-800 h-2 rounded overflow-hidden"><div className="bg-cyan-500 h-full" style={{width: '60%'}}></div></div></div>
                            <div className="flex justify-between"><span>SPEED</span> <div className="w-20 bg-gray-800 h-2 rounded overflow-hidden"><div className="bg-cyan-500 h-full" style={{width: '80%'}}></div></div></div>
                            <div className="flex justify-between"><span>RANGE</span> <div className="w-20 bg-gray-800 h-2 rounded overflow-hidden"><div className="bg-cyan-500 h-full" style={{width: '70%'}}></div></div></div>
                        </div>
                    </button>

                    {/* SHOTGUN CARD */}
                    <button 
                        onClick={() => setSelectedWeapon('shotgun')}
                        className={`
                            relative p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-105 group h-80 flex flex-col
                            ${selectedWeapon === 'shotgun' ? 'bg-orange-900/40 border-orange-400 shadow-[0_0_30px_rgba(255,170,0,0.2)]' : 'bg-gray-900/60 border-gray-700 hover:border-gray-500'}
                        `}
                    >
                        <div className="text-4xl mb-4 bg-orange-900/50 w-16 h-16 rounded-full flex items-center justify-center border border-orange-500/50 shadow-lg">🎇</div>
                        <h3 className={`text-2xl font-bold mb-2 ${selectedWeapon === 'shotgun' ? 'text-orange-400' : 'text-white'}`}>Void Shotgun</h3>
                        <p className="text-gray-400 text-sm mb-4">Short-range scatter weapon. High burst damage but slow reload.</p>
                        
                        <div className="mt-auto space-y-2 text-xs font-mono text-gray-500">
                            <div className="flex justify-between"><span>DAMAGE</span> <div className="w-20 bg-gray-800 h-2 rounded overflow-hidden"><div className="bg-orange-500 h-full" style={{width: '90%'}}></div></div></div>
                            <div className="flex justify-between"><span>SPEED</span> <div className="w-20 bg-gray-800 h-2 rounded overflow-hidden"><div className="bg-orange-500 h-full" style={{width: '40%'}}></div></div></div>
                            <div className="flex justify-between"><span>RANGE</span> <div className="w-20 bg-gray-800 h-2 rounded overflow-hidden"><div className="bg-orange-500 h-full" style={{width: '30%'}}></div></div></div>
                        </div>
                    </button>

                    {/* BOOMERANG CARD */}
                    <button 
                        onClick={() => setSelectedWeapon('boomerang')}
                        className={`
                            relative p-6 rounded-2xl border-2 text-left transition-all duration-300 hover:scale-105 group h-80 flex flex-col
                            ${selectedWeapon === 'boomerang' ? 'bg-green-900/40 border-green-400 shadow-[0_0_30px_rgba(0,255,100,0.2)]' : 'bg-gray-900/60 border-gray-700 hover:border-gray-500'}
                        `}
                    >
                        <div className="text-4xl mb-4 bg-green-900/50 w-16 h-16 rounded-full flex items-center justify-center border border-green-500/50 shadow-lg">🪃</div>
                        <h3 className={`text-2xl font-bold mb-2 ${selectedWeapon === 'boomerang' ? 'text-green-400' : 'text-white'}`}>Plasma Boomerang</h3>
                        <p className="text-gray-400 text-sm mb-4">Thrown weapon that returns to the user. Infinite pierce but high cooldown.</p>
                        
                        <div className="mt-auto space-y-2 text-xs font-mono text-gray-500">
                            <div className="flex justify-between"><span>DAMAGE</span> <div className="w-20 bg-gray-800 h-2 rounded overflow-hidden"><div className="bg-green-500 h-full" style={{width: '75%'}}></div></div></div>
                            <div className="flex justify-between"><span>SPEED</span> <div className="w-20 bg-gray-800 h-2 rounded overflow-hidden"><div className="bg-green-500 h-full" style={{width: '60%'}}></div></div></div>
                            <div className="flex justify-between"><span>TECH</span> <div className="w-20 bg-gray-800 h-2 rounded overflow-hidden"><div className="bg-green-500 h-full" style={{width: '100%'}}></div></div></div>
                        </div>
                    </button>
                </div>
             )}

             <div className="mt-12 flex gap-4">
                <button 
                    onClick={() => {
                        if (prepStage === 'map') onQuit();
                        else setPrepStage('map');
                    }}
                    className="bg-gray-700 text-gray-300 font-bold px-8 py-3 rounded-full hover:bg-gray-600 transition-colors"
                >
                    {prepStage === 'map' ? 'MAIN MENU' : 'BACK'}
                </button>
                
                <button 
                  onClick={() => {
                      if (prepStage === 'map') setPrepStage('weapon');
                      else onLaunch(selectedWeapon);
                  }}
                  className="bg-white text-gray-900 font-black text-xl px-12 py-3 rounded-full hover:scale-105 transition-transform hover:shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                >
                    {prepStage === 'map' ? 'CONFIRM SECTOR' : 'DEPLOY INTO VOID'}
                </button>
             </div>
        </div>
      )}

      {/* Level Up Menu */}
      {gameState === GameState.LEVEL_UP && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-lg flex items-center justify-center pointer-events-auto z-40">
          <div className="w-full max-w-4xl p-8">
            <div className="text-center mb-10">
                <h2 className="text-5xl font-black text-white mb-2 tracking-tight drop-shadow-[0_0_15px_rgba(255,255,0,0.5)]">
                  SYSTEM UPGRADE
                </h2>
                <p className="text-yellow-400 font-mono text-sm tracking-widest uppercase animate-pulse">Choose an Augmentation</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {upgradeOptions.map((opt) => {
                let catColor = 'bg-gray-700 text-gray-300';
                if (opt.category === 'weapon') catColor = 'bg-red-500 text-black';
                if (opt.category === 'ability') catColor = 'bg-purple-500 text-black';
                if (opt.category === 'stat') catColor = 'bg-green-500 text-black';

                return (
                <button
                  key={opt.id}
                  onClick={() => onSelectUpgrade(opt)}
                  className={`
                    group relative p-8 rounded-2xl border-2 text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden flex flex-col h-full
                    ${opt.rarity === 'legendary' ? 'bg-yellow-950/40 border-yellow-500/50 hover:border-yellow-400 hover:bg-yellow-900/60' : 
                      opt.rarity === 'rare' ? 'bg-blue-950/40 border-blue-500/50 hover:border-blue-400 hover:bg-blue-900/60' : 
                      'bg-gray-900/60 border-gray-700 hover:border-gray-500 hover:bg-gray-800/80'}
                  `}
                >
                  {/* Background Glow */}
                  <div className={`absolute -top-10 -right-10 w-32 h-32 rounded-full blur-3xl opacity-20 group-hover:opacity-40 transition-opacity
                      ${opt.rarity === 'legendary' ? 'bg-yellow-500' : opt.rarity === 'rare' ? 'bg-blue-500' : 'bg-white'}`} 
                  />
                  
                  {/* Header: Category + Rarity */}
                  <div className="flex justify-between mb-4">
                     <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded ${catColor}`}>
                        {opt.category}
                     </span>
                  </div>

                  {/* Content */}
                  <div className="flex-grow">
                      <h3 className="text-2xl font-bold text-white mb-2 group-hover:text-transparent group-hover:bg-clip-text group-hover:bg-gradient-to-r group-hover:from-white group-hover:to-gray-300">
                        {opt.name}
                      </h3>
                      <p className="text-sm text-gray-400 leading-relaxed font-medium group-hover:text-gray-200">
                        {opt.description}
                      </p>
                  </div>
                  
                  {/* Footer: Rank */}
                  <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center text-xs font-mono text-gray-500">
                      <span>RANK PROGRESS</span>
                      {opt.isMax ? (
                          <div className="flex items-center gap-2">
                              <span className="text-gray-400 decoration-line-through">
                                  {opt.currentRank}
                              </span>
                              <span className="text-gray-500">➜</span>
                              <span className="bg-yellow-500 text-black px-2 py-0.5 rounded font-bold shadow-[0_0_10px_rgba(255,200,0,0.5)] animate-pulse">
                                  MAX
                              </span>
                          </div>
                      ) : (
                          <div className="flex items-center gap-2">
                              <span className="text-white">
                                  {opt.currentRank}
                              </span>
                              <span className="text-gray-500">➜</span>
                              <span className="text-white font-bold">
                                  {opt.currentRank + 1}
                              </span>
                              <span className="text-gray-600 ml-1">
                                  / {opt.maxRank}
                              </span>
                          </div>
                      )}
                  </div>
                </button>
              )})}
            </div>
          </div>
        </div>
      )}

      {/* Game Over */}
      {gameState === GameState.GAME_OVER && (
        <div className="absolute inset-0 bg-red-950/90 flex items-center justify-center pointer-events-auto z-50 backdrop-blur-sm">
          <div className="text-center relative max-w-lg w-full px-4">
            <div className="absolute inset-0 bg-red-500/20 blur-[100px] rounded-full animate-pulse"></div>
            <h2 className="text-7xl font-black text-white mb-2 relative z-10 tracking-tighter">CRITICAL FAILURE</h2>
            
            <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="text-red-300 text-lg font-mono border border-red-500/30 bg-red-900/50 rounded p-4 relative z-10">
                    <div>FINAL SCORE</div>
                    <span className="text-white font-bold text-2xl">{score.toLocaleString()}</span>
                </div>
                <div className="text-cyan-300 text-lg font-mono border border-cyan-500/30 bg-cyan-900/50 rounded p-4 relative z-10">
                    <div>CREDITS EARNED</div>
                    <span className="text-white font-bold text-2xl">+{earnedCredits.toLocaleString()}</span>
                </div>
            </div>
            
            {/* High Score Input */}
            {isNewHighScore && !scoreSaved && (
                <div className="mb-8 relative z-10 bg-black/40 p-6 rounded-lg border border-yellow-500/50 shadow-[0_0_20px_rgba(255,200,0,0.2)]">
                    <p className="text-yellow-400 font-bold uppercase tracking-widest mb-4 animate-pulse">New High Score Detected</p>
                    <input 
                        type="text" 
                        maxLength={12}
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="bg-black/50 border border-gray-600 text-white text-center text-xl font-bold py-2 px-4 rounded w-full focus:outline-none focus:border-yellow-500 uppercase"
                        placeholder="ENTER CALLSIGN"
                    />
                </div>
            )}

            <br />
            <div className="flex gap-4 justify-center relative z-10">
                <button 
                  onClick={onQuit}
                  className="bg-transparent border-2 border-gray-500 text-gray-300 px-8 py-4 rounded-full font-bold text-lg hover:border-white hover:text-white transition-colors"
                >
                  MAIN MENU
                </button>
                <button 
                  onClick={() => {
                      if (isNewHighScore && !scoreSaved) {
                          setScoreSaved(true);
                          onSaveScore(playerName);
                      }
                      onRestart();
                  }}
                  className="bg-white text-red-900 px-10 py-4 rounded-full font-black text-xl hover:scale-105 transition-transform hover:shadow-[0_0_30px_rgba(255,0,0,0.5)]"
                >
                  {isNewHighScore && !scoreSaved ? 'SAVE & REBOOT' : 'REBOOT SYSTEM'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;
