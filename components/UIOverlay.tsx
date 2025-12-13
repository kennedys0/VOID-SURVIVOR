
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
  abilityMaxCooldown: abilityMaxCooldown,
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
  const [selectedWeapon, setSelectedWeapon] = useState<WeaponType>('sword'); // Default sword
  const [showLeaderboard, setShowLeaderboard] = useState(false);
  const [playerName, setPlayerName] = useState("Hero");
  const [scoreSaved, setScoreSaved] = useState(false);

  // Reset internal states on new game
  useEffect(() => {
    if (gameState === GameState.MENU) {
        setScoreSaved(false);
        setPlayerName("Hero");
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
          case 'shield': return { icon: '🛡️', color: 'text-blue-200', border: 'border-blue-500', shadow: 'shadow-blue-500/50', bg: 'bg-blue-900/80' };
          case 'nova': return { icon: '💥', color: 'text-amber-200', border: 'border-amber-500', shadow: 'shadow-amber-500/50', bg: 'bg-amber-900/80' };
          default: return { icon: '⚡', color: 'text-white', border: 'border-white', shadow: 'shadow-white/50', bg: 'bg-stone-800' };
      }
  };
  const theme = getAbilityTheme();

  return (
    <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-2 md:p-6 overflow-hidden select-none touch-none">
      
      {/* --- HUD (Visible during Gameplay) --- */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <div className="flex flex-col w-full pointer-events-auto z-10">
            
            {/* TIMER & WAVE INFO */}
            <div className="relative w-full flex flex-col items-center mb-2 md:mb-0 md:absolute md:top-6 md:left-1/2 md:-translate-x-1/2 md:w-auto z-20">
                <div className="bg-[#2a2320] border-2 border-[#8b5a2b] px-4 py-1 rounded-sm shadow-lg flex flex-col items-center min-w-[120px]">
                    <span className="font-title text-xl md:text-2xl font-bold text-[#e7d5b9] tracking-widest text-shadow">{gameTime}</span>
                    <span className="text-[10px] md:text-[10px] text-[#a89f91] uppercase tracking-widest">{currentMap.name}</span>
                </div>
                <div className={`mt-1 px-3 py-1 rounded-sm text-[10px] md:text-xs font-title font-bold tracking-widest uppercase border-2 shadow-md ${isBossWave ? 'bg-red-900 text-red-100 border-red-500 animate-pulse' : 'bg-[#1c1917] text-[#a89f91] border-[#44403c]'}`}>
                    {isBossWave ? 'BOSS INCURSION' : `SIEGE WAVE ${wave}`}
                </div>
            </div>

            {/* VITALITY & SCORE ROW */}
            <div className="flex justify-between items-start w-full">
                {/* LEFT: Player Vitality */}
                <div className="flex flex-col gap-1 w-48 md:w-80 filter drop-shadow-md">
                    <div className="flex items-center gap-2 mb-1">
                        <div className="bg-[#4a3b2a] text-[#e7d5b9] font-bold font-title px-2 py-1 rounded-sm text-[10px] md:text-xs border border-[#8b5a2b] shadow-sm">
                             Rank {level}
                        </div>
                    </div>
                    {/* HP BAR - ORNATE */}
                    <div className="relative w-full h-5 md:h-8 bg-[#1c1917] border-2 border-[#57534e] overflow-hidden rounded-sm shadow-md">
                        <div 
                            className="h-full bg-gradient-to-r from-red-900 via-red-700 to-red-600 transition-all duration-200 ease-out"
                            style={{ width: `${hpPercent}%` }}
                        />
                        <div className="absolute inset-0 flex items-center justify-center">
                             <span className="text-white font-title text-[10px] md:text-xs tracking-widest text-shadow drop-shadow-md">
                                {Math.ceil(hp)} / {Math.ceil(maxHp)}
                            </span>
                        </div>
                    </div>
                    {/* XP BAR - THIN GOLD */}
                    <div className="w-full h-2 md:h-3 bg-[#1c1917] mt-1 border border-[#44403c] rounded-sm overflow-hidden">
                        <div 
                        className="h-full bg-gradient-to-r from-yellow-700 to-yellow-400 transition-all duration-300"
                        style={{ width: `${xpPercent}%` }}
                        />
                    </div>
                </div>

                {/* RIGHT: Score Counter */}
                <div className="text-right filter drop-shadow-lg">
                    <div className="text-3xl md:text-6xl font-title font-black text-[#e7d5b9] text-shadow tracking-tight">
                        {score.toLocaleString()}
                    </div>
                    <div className="text-[#a89f91] text-[10px] md:text-xs font-bold tracking-[0.3em] uppercase opacity-80 mr-1">
                        Glory
                    </div>
                </div>
            </div>
        </div>
      )}

      {/* --- CENTER: Notifications --- */}
      {gameState === GameState.PLAYING && voidMessage && (
            <div className="absolute top-[35%] md:top-[20%] left-1/2 -translate-x-1/2 w-full max-w-sm md:max-w-2xl text-center pointer-events-none z-0 px-4">
                <div className="bg-black/60 p-6 backdrop-blur-sm border-t-2 border-b-2 border-red-900/50">
                    <h3 className="text-red-400 font-title font-bold uppercase tracking-[0.2em] text-sm md:text-base mb-2 animate-pulse">
                        {voidMessage.title}
                    </h3>
                    <p className="text-lg md:text-2xl text-[#e7d5b9] font-serif italic text-shadow-lg leading-relaxed">
                        "{voidMessage.message}"
                    </p>
                </div>
            </div>
        )}

      {/* --- BOTTOM: Ability Indicator --- */}
      {(gameState === GameState.PLAYING || gameState === GameState.PAUSED) && (
        <div 
            className="absolute bottom-8 right-8 md:bottom-10 md:left-1/2 md:-translate-x-1/2 flex flex-col items-center group pointer-events-auto z-20 cursor-pointer md:cursor-default"
            onClick={() => {
                window.dispatchEvent(new Event('trigger-ability'));
            }}
        >
            <div className={`
                relative w-16 h-16 md:w-24 md:h-24 rounded-full bg-[#1c1917] border-4 
                flex items-center justify-center overflow-hidden transition-all duration-300
                ${isAbilityReady ? `scale-110 ${theme.border} ${theme.shadow} shadow-lg active:scale-95` : 'border-gray-700 scale-100 opacity-80 grayscale'}
            `}>
                {!isAbilityReady && (
                    <div 
                        className="absolute bottom-0 left-0 w-full bg-black/70 z-20 pointer-events-none"
                        style={{ height: `${cooldownPercent}%`, transition: 'height 0.1s linear' }}
                    />
                )}
                <div className={`text-3xl md:text-5xl z-10 transition-transform duration-500 ${isAbilityReady ? 'scale-110' : 'scale-90'}`}>
                    {theme.icon}
                </div>
                {/* Desktop Hint */}
                <div className="hidden md:block absolute bottom-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-[#e7d5b9] font-bold border border-[#8b5a2b] backdrop-blur-sm z-30">
                    SPACE
                </div>
            </div>
            <div className="mt-2 md:mt-4 flex flex-col items-center">
                <div className={`
                    text-[10px] md:text-sm font-bold font-title tracking-widest uppercase px-3 py-1 rounded-sm border transition-colors duration-300
                    ${isAbilityReady ? `bg-[#e7d5b9] text-[#2a2320] border-[#8b5a2b] shadow-md` : 'bg-black/50 text-gray-500 border-gray-700'}
                `}>
                    {isAbilityReady ? 'READY' : 'CHARGING'}
                </div>
            </div>
        </div>
      )}

      {/* --- PAUSE MENU --- */}
      {gameState === GameState.PAUSED && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center pointer-events-auto z-50">
          <div className="bg-parchment p-1 rounded-lg shadow-2xl max-w-sm md:max-w-md w-full mx-4 border-4 border-[#4a3b2a]">
             <div className="border border-[#8b5a2b] p-6 md:p-10 rounded-sm flex flex-col items-center">
                
                <h2 className="text-3xl md:text-4xl font-black font-title text-[#4a3b2a] mb-2 tracking-widest uppercase border-b-2 border-[#8b5a2b] pb-2">Paused</h2>
                <div className="text-[#6b4e32] text-xs md:text-sm mb-8 font-bold tracking-widest italic">The battle halts...</div>
                
                <div className="flex flex-col gap-4 w-full">
                    <button 
                        onClick={onResume}
                        className="bg-[#4a3b2a] text-[#e7d5b9] font-title font-bold py-3 md:py-4 rounded-sm hover:bg-[#2a2320] transition-colors uppercase tracking-widest text-sm md:text-base border border-[#1c1917] shadow-sm"
                    >
                        Resume Battle
                    </button>
                    <button 
                        onClick={onQuit}
                        className="bg-red-900/10 border border-red-900/50 text-red-900 font-title font-bold py-3 md:py-4 rounded-sm hover:bg-red-900 hover:text-white transition-colors uppercase tracking-widest text-sm md:text-base"
                    >
                        Retreat to Camp
                    </button>
                </div>
             </div>
          </div>
        </div>
      )}

      {/* --- MENUS --- */}
      
      {/* Main Menu */}
      {gameState === GameState.MENU && (
        <div className="absolute inset-0 bg-stone-950 flex items-center justify-center pointer-events-auto z-50 overflow-y-auto">
             {/* Background Texture Overlay */}
             <div className="absolute inset-0 opacity-20 pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #44403c 1px, transparent 1px)', backgroundSize: '20px 20px' }}></div>
             
          <div className="text-center relative w-full px-4">
            {!showLeaderboard && (
                <>
                <div className="absolute -top-20 -left-20 w-64 h-64 bg-yellow-600/10 rounded-full blur-3xl animate-pulse"></div>
                
                <h1 className="text-5xl md:text-8xl font-black font-title text-[#e7d5b9] mb-4 tracking-tighter drop-shadow-2xl relative z-10 text-shadow-gold">
                REALM<br/><span className="text-transparent bg-clip-text bg-gradient-to-r from-yellow-500 to-amber-700">SURVIVOR</span>
                </h1>
                
                <div className="flex flex-col gap-3 md:gap-4 items-center relative z-10 mt-8">
                    <button 
                    onClick={() => { setPrepStage('map'); onStart(); }}
                    className="group relative bg-[#e7d5b9] text-[#2a2320] px-8 py-3 md:px-10 md:py-4 rounded-sm border-2 border-[#8b5a2b] font-title font-black text-lg md:text-2xl transition-all hover:scale-105 hover:shadow-[0_0_20px_rgba(234,179,8,0.4)] overflow-hidden w-full md:w-80"
                    >
                        <span className="relative z-10">BEGIN CRUSADE</span>
                    </button>

                    <button 
                        onClick={onOpenShop}
                        className="group bg-[#2a2320] border-2 border-[#8b5a2b] text-[#e7d5b9] px-8 py-3 rounded-sm font-title font-bold text-base md:text-lg transition-all hover:border-[#e7d5b9] hover:bg-[#4a3b2a] w-full md:w-80 flex items-center justify-center gap-2"
                    >
                        <span>ANCESTRAL LEGACY</span>
                        <span className="text-[10px] md:text-xs bg-yellow-900 px-2 py-0.5 rounded text-yellow-100 font-sans border border-yellow-700">{userProfile.credits.toLocaleString()} gold</span>
                    </button>

                    <button 
                    onClick={() => setShowLeaderboard(true)}
                    className="group bg-transparent border-2 border-[#57534e] text-[#a89f91] px-8 py-3 rounded-sm font-title font-bold text-base md:text-lg transition-all hover:border-[#e7d5b9] hover:text-[#e7d5b9] w-full md:w-80"
                    >
                        HALL OF HEROES
                    </button>
                </div>
                </>
            )}

            {/* Leaderboard Overlay */}
            {showLeaderboard && (
                <div className="bg-parchment border-4 border-[#4a3b2a] rounded-sm p-4 md:p-8 w-full md:w-[600px] max-w-full relative z-20 shadow-2xl mx-auto text-[#2a2320]">
                     <h2 className="text-2xl md:text-3xl font-black font-title text-[#4a3b2a] mb-6 uppercase tracking-widest border-b-2 border-[#8b5a2b] pb-2">Legends</h2>
                     
                     <div className="flex gap-2 md:gap-4 mb-4 border-b border-[#8b5a2b] pb-2 font-bold font-title text-[10px] md:text-xs uppercase text-[#6b4e32]">
                         <span className="flex-1 text-left">Hero</span>
                         <span className="flex-1">Land</span>
                         <span className="flex-1 text-right">Wave</span>
                         <span className="flex-1 text-right">Glory</span>
                     </div>
                     
                     <div className="max-h-64 md:max-h-80 overflow-y-auto scrollbar-hide flex flex-col gap-2">
                        {leaderboard.length === 0 ? (
                            <div className="text-[#6b4e32] py-10 italic text-center">No legends recorded in the chronicles.</div>
                        ) : (
                            leaderboard.map((entry, idx) => (
                                <div key={idx} className="flex gap-2 md:gap-4 items-center bg-[#d6c4a8] p-2 md:p-3 rounded-sm border border-[#c1ad8e]">
                                    <div className="flex-1 text-left font-bold text-[#2a2320] flex items-center gap-2 text-xs md:text-base">
                                        <span className={`text-[10px] w-4 h-4 md:w-5 md:h-5 flex items-center justify-center rounded-full font-sans ${idx < 3 ? 'bg-yellow-600 text-white' : 'bg-[#8b5a2b] text-[#e7d5b9]'}`}>{idx + 1}</span>
                                        <span className="truncate">{entry.name}</span>
                                    </div>
                                    <div className="flex-1 text-[10px] md:text-xs text-[#6b4e32] uppercase truncate font-bold">{entry.mapName}</div>
                                    <div className="flex-1 text-right text-[#4a3b2a] font-title text-xs md:text-base">W{entry.wave}</div>
                                    <div className="flex-1 text-right text-red-900 font-bold font-title text-xs md:text-base">{entry.score.toLocaleString()}</div>
                                </div>
                            ))
                        )}
                     </div>

                     <button 
                        onClick={() => setShowLeaderboard(false)}
                        className="mt-8 text-[#6b4e32] hover:text-[#2a2320] font-bold uppercase tracking-widest text-sm font-title border-b border-transparent hover:border-[#6b4e32] transition-all"
                    >
                         Close Tome
                     </button>
                </div>
            )}
          </div>
        </div>
      )}

      {/* SHOP (SYSTEM UPGRADES) */}
      {gameState === GameState.SHOP && (
          <div className="absolute inset-0 bg-[#1c1917] flex flex-col items-center justify-center pointer-events-auto z-50">
              <div className="w-full max-w-6xl p-4 md:p-8 h-full flex flex-col">
                  {/* Header */}
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 md:mb-8 border-b border-[#44403c] pb-4 gap-4">
                      <div>
                        <h2 className="text-2xl md:text-4xl font-black font-title text-[#e7d5b9] tracking-widest uppercase">Royal Treasury</h2>
                        <p className="text-[#a89f91] text-xs md:text-base italic">Spend your gold to secure your lineage's power.</p>
                      </div>
                      <div className="bg-[#2a2320] px-4 py-2 md:px-6 md:py-3 rounded-sm border border-[#8b5a2b] flex flex-col items-end w-full md:w-auto">
                          <span className="text-[10px] text-[#a89f91] uppercase tracking-widest font-title">Treasury</span>
                          <span className="text-2xl md:text-3xl font-title text-yellow-500 font-bold drop-shadow-sm">{userProfile.credits.toLocaleString()} <span className="text-sm">Gold</span></span>
                      </div>
                  </div>

                  {/* Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 overflow-y-auto pb-20 flex-grow">
                      {metaUpgrades.map(upgrade => {
                          const currentRank = userProfile.upgrades[upgrade.id];
                          const nextCost = Math.floor(upgrade.baseCost * Math.pow(upgrade.costScale, currentRank));
                          const isMaxed = currentRank >= upgrade.maxRank;
                          const canAfford = userProfile.credits >= nextCost && !isMaxed;
                          
                          const currentStat = currentRank * upgrade.statPerRank;
                          const nextStat = (currentRank + 1) * upgrade.statPerRank;
                          const formatVal = (v: number) => upgrade.format === 'percent' ? `${Math.round(v * 100)}%` : v;

                          return (
                              <div key={upgrade.id} className={`p-4 md:p-6 bg-[#2a2320] border-2 ${isMaxed ? 'border-yellow-600/50' : 'border-[#44403c]'} rounded-sm flex flex-col relative overflow-hidden group hover:border-[#8b5a2b] transition-colors`}>
                                  <div className="flex justify-between items-start mb-2 relative z-10">
                                      <h3 className="text-lg md:text-xl font-bold font-title text-[#e7d5b9]">{upgrade.name}</h3>
                                      <span className="text-[10px] font-title text-[#a89f91] bg-[#1c1917] px-2 py-1 rounded-sm border border-[#44403c]">RANK {currentRank}</span>
                                  </div>
                                  <p className="text-[#a89f91] text-xs md:text-sm mb-4 h-auto md:h-10 italic font-serif relative z-10">{upgrade.description}</p>
                                  
                                  <div className="mt-auto relative z-10">
                                      <div className="flex justify-between text-[10px] md:text-xs font-title text-[#78716c] mb-4 bg-black/20 p-2 rounded-sm border border-[#44403c]">
                                          <span>Current: <span className="text-[#e7d5b9]">{formatVal(currentStat)}</span></span>
                                          {!isMaxed && <span>Next: <span className="text-yellow-500">{formatVal(nextStat)}</span></span>}
                                      </div>

                                      <button 
                                          onClick={() => onBuyMetaUpgrade(upgrade.id)}
                                          disabled={!canAfford && !isMaxed}
                                          className={`w-full py-3 rounded-sm font-bold font-title uppercase tracking-widest transition-all text-xs md:text-sm border
                                            ${isMaxed 
                                                ? 'bg-yellow-900/20 text-yellow-600 cursor-default border-yellow-800/30'
                                                : canAfford 
                                                    ? 'bg-[#4a3b2a] hover:bg-[#5c4a35] text-[#e7d5b9] border-[#8b5a2b] shadow-md' 
                                                    : 'bg-[#1c1917] text-[#57534e] border-[#292524] cursor-not-allowed'}
                                          `}
                                      >
                                          {isMaxed ? 'MASTERED' : `ACQUIRE (${nextCost.toLocaleString()})`}
                                      </button>
                                  </div>
                              </div>
                          );
                      })}
                  </div>

                  {/* Footer Back Button */}
                  <div className="absolute bottom-4 left-4 md:bottom-8 md:left-8">
                      <button 
                          onClick={onCloseShop}
                          className="text-[#a89f91] hover:text-[#e7d5b9] font-bold font-title uppercase tracking-widest text-sm md:text-lg flex items-center gap-2 px-4 border-b border-transparent hover:border-[#e7d5b9] transition-all"
                      >
                          ← Return
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Preparation / Loadout Screen */}
      {gameState === GameState.PREPARATION && (
        <div className="absolute inset-0 bg-[#1c1917]/95 flex flex-col items-center justify-center pointer-events-auto z-50 backdrop-blur-sm overflow-y-auto">
             <div className="text-center mb-6 md:mb-10 mt-10 md:mt-0 px-4">
                <h2 className="text-2xl md:text-4xl font-black font-title text-[#e7d5b9] tracking-widest uppercase border-b-2 border-[#8b5a2b] pb-2 mb-2">
                    {prepStage === 'map' ? 'Select Realm' : 'Select Armament'}
                </h2>
                <p className="text-[#a89f91] text-sm md:text-base italic font-serif">
                    {prepStage === 'map' ? 'Where shall you spill blood today?' : 'Choose the instrument of your victory.'}
                </p>
             </div>

             {/* MAP SELECTION STAGE */}
             {prepStage === 'map' && (
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-6xl px-4 md:px-10 pb-24 md:pb-0">
                    {maps.map(map => (
                        <button 
                            key={map.id}
                            onClick={() => onSelectMap(map)}
                            className={`
                                relative p-4 md:p-8 rounded-sm border-2 text-left transition-all duration-300 hover:scale-105 group h-auto md:h-96 flex flex-col
                                ${currentMap.id === map.id ? `bg-[#2a2320] border-[#e7d5b9] shadow-xl` : 'bg-[#1c1917] border-[#44403c] hover:border-[#8b5a2b]'}
                            `}
                        >
                            <div className="text-[10px] font-bold font-title px-2 py-1 rounded-sm bg-black/40 inline-block mb-2 md:mb-4 self-start border border-[#57534e] text-[#a89f91] uppercase">
                                {map.difficulty}
                            </div>
                            <h3 className="text-xl md:text-3xl font-bold font-title mb-2 text-[#e7d5b9]">{map.name}</h3>
                            <p className="text-[#a89f91] text-xs md:text-sm mb-4 leading-relaxed font-serif italic">{map.description}</p>
                            
                            <div className="mt-auto">
                                <div className="text-[10px] md:text-xs uppercase tracking-widest text-[#57534e] mb-2 font-bold">Threats</div>
                                <div className={`text-xs md:text-sm font-bold flex items-center gap-2`} style={{ color: map.theme.accent }}>
                                    {map.hazardType === 'none' && <span>None</span>}
                                    {map.hazardType === 'electric_walls' && <span>⚡ Cursed Walls</span>}
                                    {map.hazardType === 'lava_pools' && <span>🔥 Hellfire Pools</span>}
                                </div>
                                <div className="mt-4 pt-4 border-t border-[#44403c] flex justify-between text-[10px] md:text-xs text-[#a89f91]">
                                    <span>BOUNTY MODIFIER:</span>
                                    <span className="text-[#e7d5b9] font-title font-bold">x{map.creditsMultiplier}</span>
                                </div>
                            </div>
                        </button>
                    ))}
                 </div>
             )}

             {/* WEAPON SELECTION STAGE */}
             {prepStage === 'weapon' && (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 w-full max-w-5xl px-4 md:px-10 pb-24 md:pb-0">
                    {/* WEAPON CARDS */}
                    {[
                        { id: 'sword', icon: '⚔️', name: 'Rune Blade', desc: 'A balanced blade forged in dragonfire. Cleaves enemies in an arc.', stats: [90, 50, 20] },
                        { id: 'pistol', icon: '✨', name: 'Magic Bolt', desc: 'Basic magical projectile. Reliable and steady.', stats: [60, 80, 70] },
                        { id: 'shotgun', icon: '💥', name: 'Blunderbuss', desc: 'Dwarven engineering. Devastating at close range.', stats: [80, 40, 30] }
                    ].map((w) => (
                        <button 
                            key={w.id}
                            onClick={() => setSelectedWeapon(w.id as WeaponType)}
                            className={`
                                relative p-4 md:p-6 rounded-sm border-2 text-left transition-all duration-300 hover:scale-105 group h-auto md:h-80 flex flex-col
                                ${selectedWeapon === w.id ? `bg-[#2a2320] border-[#e7d5b9] shadow-xl` : 'bg-[#1c1917] border-[#44403c] hover:border-[#8b5a2b]'}
                            `}
                        >
                            <div className={`text-2xl md:text-4xl mb-4 bg-black/20 w-12 h-12 md:w-16 md:h-16 rounded-sm flex items-center justify-center border border-[#44403c] shadow-inner`}>{w.icon}</div>
                            <h3 className={`text-xl md:text-2xl font-bold font-title mb-2 ${selectedWeapon === w.id ? `text-[#e7d5b9]` : 'text-[#a89f91]'}`}>{w.name}</h3>
                            <p className="text-[#a89f91] text-xs md:text-sm mb-4 font-serif italic">{w.desc}</p>
                            
                            <div className="mt-auto space-y-2 text-[10px] md:text-xs font-title text-[#57534e]">
                                <div className="flex justify-between"><span>POWER</span> <div className="w-20 bg-[#1c1917] h-2 rounded-sm overflow-hidden border border-[#44403c]"><div className={`bg-red-700 h-full`} style={{width: `${w.stats[0]}%`}}></div></div></div>
                                <div className="flex justify-between"><span>SPEED</span> <div className="w-20 bg-[#1c1917] h-2 rounded-sm overflow-hidden border border-[#44403c]"><div className={`bg-yellow-600 h-full`} style={{width: `${w.stats[1]}%`}}></div></div></div>
                                <div className="flex justify-between"><span>REACH</span> <div className="w-20 bg-[#1c1917] h-2 rounded-sm overflow-hidden border border-[#44403c]"><div className={`bg-blue-600 h-full`} style={{width: `${w.stats[2]}%`}}></div></div></div>
                            </div>
                        </button>
                    ))}
                </div>
             )}

             <div className="mt-4 md:mt-12 flex flex-col md:flex-row gap-4 w-full md:w-auto px-4 md:px-0 fixed bottom-4 md:static z-50 bg-[#1c1917] md:bg-transparent p-4 md:p-0 border-t border-[#44403c] md:border-0">
                <button 
                    onClick={() => {
                        if (prepStage === 'map') onQuit();
                        else setPrepStage('map');
                    }}
                    className="bg-[#2a2320] text-[#a89f91] font-bold font-title px-8 py-3 rounded-sm hover:bg-[#44403c] transition-colors order-2 md:order-1 border border-[#44403c]"
                >
                    {prepStage === 'map' ? 'RETREAT' : 'BACK'}
                </button>
                
                <button 
                  onClick={() => {
                      if (prepStage === 'map') setPrepStage('weapon');
                      else onLaunch(selectedWeapon);
                  }}
                  className="bg-[#e7d5b9] text-[#2a2320] font-black font-title text-lg md:text-xl px-12 py-3 rounded-sm hover:scale-105 transition-transform hover:shadow-[0_0_20px_rgba(231,213,185,0.4)] order-1 md:order-2 border border-[#8b5a2b]"
                >
                    {prepStage === 'map' ? 'CONFIRM LANDS' : 'ENTER THE FRAY'}
                </button>
             </div>
        </div>
      )}

      {/* Level Up Menu */}
      {gameState === GameState.LEVEL_UP && (
        <div className="absolute inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center pointer-events-auto z-40 overflow-y-auto">
          <div className="w-full max-w-4xl p-4 md:p-8 h-full md:h-auto flex flex-col justify-center">
            <div className="text-center mb-6 md:mb-10">
                <h2 className="text-3xl md:text-5xl font-black font-title text-[#e7d5b9] mb-2 tracking-tight text-shadow-gold">
                  DIVINE BLESSING
                </h2>
                <p className="text-yellow-500 font-title text-xs md:text-sm tracking-widest uppercase animate-pulse">Choose your boon</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6">
              {upgradeOptions.map((opt) => {
                let catColor = 'bg-[#44403c] text-[#a89f91]';
                if (opt.category === 'weapon') catColor = 'bg-red-900 text-red-100';
                if (opt.category === 'ability') catColor = 'bg-purple-900 text-purple-100';
                if (opt.category === 'stat') catColor = 'bg-emerald-900 text-emerald-100';

                return (
                <button
                  key={opt.id}
                  onClick={() => onSelectUpgrade(opt)}
                  className={`
                    group relative p-4 md:p-8 rounded-sm border-2 text-left transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl overflow-hidden flex flex-col h-auto md:h-full bg-parchment
                    ${opt.rarity === 'legendary' ? 'border-yellow-600 shadow-[0_0_15px_rgba(234,179,8,0.3)]' : 
                      opt.rarity === 'rare' ? 'border-blue-600 shadow-[0_0_10px_rgba(37,99,235,0.3)]' : 
                      'border-[#8b5a2b]'}
                  `}
                >
                  
                  {/* Header: Category + Rarity */}
                  <div className="flex justify-between mb-2 md:mb-4">
                     <span className={`text-[8px] md:text-[10px] font-black uppercase tracking-widest px-2 py-1 rounded-sm font-title ${catColor} border border-black/20`}>
                        {opt.category}
                     </span>
                  </div>

                  {/* Content */}
                  <div className="flex-grow">
                      <h3 className="text-lg md:text-2xl font-bold font-title text-[#2a2320] mb-2 group-hover:text-red-900 transition-colors">
                        {opt.name}
                      </h3>
                      <p className="text-xs md:text-sm text-[#4a3b2a] leading-relaxed font-bold font-serif italic">
                        {opt.description}
                      </p>
                  </div>
                  
                  {/* Footer: Rank */}
                  <div className="mt-4 pt-4 border-t border-[#8b5a2b]/30 flex justify-between items-center text-[10px] md:text-xs font-title text-[#6b4e32]">
                      <span>MASTERY</span>
                      {opt.isMax ? (
                          <div className="flex items-center gap-2">
                              <span className="decoration-line-through opacity-50">
                                  {opt.currentRank}
                              </span>
                              <span>➜</span>
                              <span className="bg-yellow-600 text-white px-2 py-0.5 rounded-sm font-bold animate-pulse">
                                  MAX
                              </span>
                          </div>
                      ) : (
                          <div className="flex items-center gap-2">
                              <span>
                                  {opt.currentRank}
                              </span>
                              <span>➜</span>
                              <span className="font-bold text-[#2a2320]">
                                  {opt.currentRank + 1}
                              </span>
                              <span className="opacity-50 ml-1">
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
        <div className="absolute inset-0 bg-red-950/90 flex items-center justify-center pointer-events-auto z-50 backdrop-blur-sm overflow-y-auto">
          <div className="text-center relative max-w-lg w-full px-4 border-4 border-[#4a3b2a] bg-[#1c1917] p-8 rounded-sm shadow-2xl">
            <h2 className="text-5xl md:text-7xl font-black font-title text-red-500 mb-2 relative z-10 tracking-tighter text-shadow">SLAIN</h2>
            <p className="text-[#a89f91] font-serif italic mb-6">Your crusade has ended.</p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8">
                <div className="text-[#e7d5b9] text-lg font-title border border-[#8b5a2b] bg-[#2a2320] rounded-sm p-4 relative z-10">
                    <div className="text-[#a89f91] text-xs uppercase tracking-widest">Final Glory</div>
                    <span className="font-bold text-2xl">{score.toLocaleString()}</span>
                </div>
                <div className="text-yellow-400 text-lg font-title border border-yellow-900 bg-[#2a2320] rounded-sm p-4 relative z-10">
                    <div className="text-[#a89f91] text-xs uppercase tracking-widest">Gold Plundered</div>
                    <span className="font-bold text-2xl">+{earnedCredits.toLocaleString()}</span>
                </div>
            </div>
            
            {/* High Score Input */}
            {isNewHighScore && !scoreSaved && (
                <div className="mb-8 relative z-10 bg-[#2a2320] p-6 rounded-sm border border-yellow-600/50">
                    <p className="text-yellow-500 font-bold font-title uppercase tracking-widest mb-4 animate-pulse">A New Legend is Born</p>
                    <input 
                        type="text" 
                        maxLength={12}
                        value={playerName}
                        onChange={(e) => setPlayerName(e.target.value)}
                        className="bg-[#1c1917] border border-[#57534e] text-[#e7d5b9] text-center text-xl font-bold font-title py-2 px-4 rounded-sm w-full focus:outline-none focus:border-yellow-500 uppercase"
                        placeholder="NAME THY HERO"
                    />
                </div>
            )}

            <br />
            <div className="flex flex-col md:flex-row gap-4 justify-center relative z-10">
                <button 
                  onClick={onQuit}
                  className="bg-transparent border-2 border-[#57534e] text-[#a89f91] px-8 py-3 md:py-4 rounded-sm font-bold font-title text-lg hover:border-[#e7d5b9] hover:text-[#e7d5b9] transition-colors"
                >
                  ABANDON
                </button>
                <button 
                  onClick={() => {
                      if (isNewHighScore && !scoreSaved) {
                          setScoreSaved(true);
                          onSaveScore(playerName);
                      }
                      onRestart();
                  }}
                  className="bg-[#991b1b] text-white px-10 py-3 md:py-4 rounded-sm font-black font-title text-xl hover:bg-[#7f1d1d] hover:shadow-lg transition-all border border-red-950"
                >
                  {isNewHighScore && !scoreSaved ? 'SCRIBE & RESURRECT' : 'RESURRECT'}
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default UIOverlay;
