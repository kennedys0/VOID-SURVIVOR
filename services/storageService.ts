
import { LeaderboardEntry, MapId, UserProfile } from "../types";

const LEADERBOARD_KEY = 'void_survivor_leaderboard';
const PROFILE_KEY = 'void_survivor_profile';

// --- LEADERBOARD ---

export const getLeaderboard = (): LeaderboardEntry[] => {
  try {
    const data = localStorage.getItem(LEADERBOARD_KEY);
    if (!data) return [];
    return JSON.parse(data);
  } catch (e) {
    console.error("Failed to load leaderboard", e);
    return [];
  }
};

export const getMapLeaderboard = (mapId: MapId): LeaderboardEntry[] => {
    const all = getLeaderboard();
    return all
        .filter(entry => entry.mapId === mapId)
        .sort((a, b) => b.score - a.score)
        .slice(0, 10); // Top 10
};

export const saveScore = (entry: LeaderboardEntry) => {
    const all = getLeaderboard();
    all.push(entry);
    // Sort and trim strictly to prevent overflow, although we filter by map for display
    const sorted = all.sort((a, b) => b.score - a.score).slice(0, 100); 
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(sorted));
};

export const isHighScore = (score: number, mapId: MapId): boolean => {
    const mapScores = getMapLeaderboard(mapId);
    if (mapScores.length < 10) return true;
    return score > mapScores[mapScores.length - 1].score;
};

// --- USER PROFILE (META PROGRESSION) ---

const DEFAULT_PROFILE: UserProfile = {
  credits: 0,
  upgrades: {
    health: 0,
    damage: 0,
    speed: 0,
    xp: 0,
    magnet: 0,
    armor: 0
  }
};

export const getUserProfile = (): UserProfile => {
  try {
    const data = localStorage.getItem(PROFILE_KEY);
    if (!data) return DEFAULT_PROFILE;
    return { ...DEFAULT_PROFILE, ...JSON.parse(data) }; // Merge to handle new keys in future
  } catch (e) {
    return DEFAULT_PROFILE;
  }
};

export const saveUserProfile = (profile: UserProfile) => {
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
};
