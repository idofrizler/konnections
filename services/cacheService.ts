import { GameBoard } from "../types";

const CACHE_KEY_PREFIX = "konnections_puzzle_";
const CACHE_EXPIRY_DAYS = 7; // Keep puzzles for 7 days to avoid localStorage bloat

/**
 * Gets the user's local date in YYYY-MM-DD format.
 * This is used as the cache key since Connections refreshes at midnight local time.
 */
export function getLocalDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Gets a cached puzzle for a specific date.
 */
export function getCachedPuzzle(dateKey: string): GameBoard | null {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${dateKey}`;
    const cached = localStorage.getItem(cacheKey);
    if (!cached) return null;
    
    const parsed = JSON.parse(cached);
    return parsed as GameBoard;
  } catch (error) {
    console.error("Error reading puzzle from cache:", error);
    return null;
  }
}

/**
 * Stores a puzzle in cache for a specific date.
 * Also cleans up old cached puzzles to prevent localStorage bloat.
 */
export function cachePuzzle(dateKey: string, puzzle: GameBoard): void {
  try {
    const cacheKey = `${CACHE_KEY_PREFIX}${dateKey}`;
    localStorage.setItem(cacheKey, JSON.stringify(puzzle));
    
    // Clean up old puzzles
    cleanupOldPuzzles();
  } catch (error) {
    console.error("Error caching puzzle:", error);
  }
}

/**
 * Removes puzzles older than CACHE_EXPIRY_DAYS from localStorage.
 */
function cleanupOldPuzzles(): void {
  try {
    const now = new Date();
    const cutoffDate = new Date(now.getTime() - CACHE_EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    
    const keysToRemove: string[] = [];
    
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith(CACHE_KEY_PREFIX)) {
        const dateStr = key.replace(CACHE_KEY_PREFIX, '');
        const cachedDate = new Date(dateStr);
        
        if (!isNaN(cachedDate.getTime()) && cachedDate < cutoffDate) {
          keysToRemove.push(key);
        }
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    
    if (keysToRemove.length > 0) {
      console.log(`Cleaned up ${keysToRemove.length} old cached puzzles`);
    }
  } catch (error) {
    console.error("Error cleaning up old puzzles:", error);
  }
}
