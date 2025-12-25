import { GameBoard, CategoryColor } from "../types";

/**
 * Gets a date in YYYY-MM-DD format.
 * @param daysOffset - Number of days to offset from today (0 = today, -1 = yesterday)
 */
export function getDateKey(daysOffset: number = 0): string {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Formats a date key (YYYY-MM-DD) to a readable format.
 */
export function formatDateForDisplay(dateKey: string): string {
  const date = new Date(dateKey);
  return date.toLocaleDateString('en-US', { 
    weekday: 'long',
    month: 'long', 
    day: 'numeric', 
    year: 'numeric' 
  });
}

export async function generatePuzzle(dateKey?: string): Promise<GameBoard> {
  const targetDate = dateKey || getDateKey(0);
  
  console.log(`Fetching puzzle for date: ${targetDate}`);
  
  try {
    // Call the Azure Function API which handles caching globally
    const response = await fetch(`/api/puzzle?date=${targetDate}`);
    
    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }
    
    const data = await response.json();
    
    if (data.cached) {
      console.log(`Received cached puzzle for ${dateKey}`);
    } else {
      console.log(`Received fresh puzzle for ${dateKey}`);
    }
    
    if (data.fallback) {
      console.warn("Using fallback puzzle");
    }
    
    const puzzle = data.puzzle as GameBoard;
    
    // Map color strings to CategoryColor enum
    puzzle.categories = puzzle.categories.map((c: any) => ({
      ...c,
      color: c.color as CategoryColor
    }));
    
    return puzzle;
  } catch (error) {
    console.error("Failed to fetch puzzle from API:", error);
    return getFallbackPuzzle();
  }
}

function getFallbackPuzzle(): GameBoard {
  const categories = [
    { id: '1', label: 'WET WEATHER', words: ['HAIL', 'RAIN', 'SLEET', 'SNOW'], color: CategoryColor.YELLOW, difficulty: 1 },
    { id: '2', label: 'WORDS IN A SONG', words: ['BRIDGE', 'CHORUS', 'HOOK', 'VERSE'], color: CategoryColor.GREEN, difficulty: 2 },
    { id: '3', label: 'THINGS THAT SPIN', words: ['RECORD', 'TOP', 'WHEEL', 'YOYO'], color: CategoryColor.BLUE, difficulty: 3 },
    { id: '4', label: '___ BALL', words: ['EIGHT', 'FIRE', 'MEAT', 'MOTH'], color: CategoryColor.PURPLE, difficulty: 4 },
  ];
  return {
    date: "Fallback Puzzle",
    categories,
    allWords: categories.flatMap(c => c.words).sort(() => Math.random() - 0.5)
  };
}
