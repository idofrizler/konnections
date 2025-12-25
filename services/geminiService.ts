import { GameBoard, CategoryColor } from "../types";

/**
 * Gets the user's local date in YYYY-MM-DD format.
 * This is sent to the API so the correct puzzle is returned based on the user's timezone.
 */
function getLocalDateKey(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export async function generatePuzzle(): Promise<GameBoard> {
  const dateKey = getLocalDateKey();
  
  console.log(`Fetching puzzle for date: ${dateKey}`);
  
  try {
    // Call the Azure Function API which handles caching globally
    const response = await fetch(`/api/puzzle?date=${dateKey}`);
    
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
