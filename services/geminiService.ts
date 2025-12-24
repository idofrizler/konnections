
import { GoogleGenAI, Type } from "@google/genai";
import { GameBoard, CategoryColor } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const MODEL_NAME = process.env.GEMINI_MODEL || "gemini-2.5-flash";

export async function generatePuzzle(): Promise<GameBoard> {
  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  try {
    // First, search for today's puzzle using Google Search grounding
    const searchResponse = await ai.models.generateContent({
      model: MODEL_NAME,
      contents: `Search for the NYT Connections puzzle for today, ${today}. 
      Find the 4 categories (Yellow, Green, Blue, Purple) and their 4 words each.
      Return ONLY valid JSON in this exact format (no other text):
      {
        "date": "December 24, 2025",
        "categories": [
          {"label": "CATEGORY NAME", "words": ["WORD1", "WORD2", "WORD3", "WORD4"], "color": "YELLOW", "difficulty": 1},
          {"label": "CATEGORY NAME", "words": ["WORD1", "WORD2", "WORD3", "WORD4"], "color": "GREEN", "difficulty": 2},
          {"label": "CATEGORY NAME", "words": ["WORD1", "WORD2", "WORD3", "WORD4"], "color": "BLUE", "difficulty": 3},
          {"label": "CATEGORY NAME", "words": ["WORD1", "WORD2", "WORD3", "WORD4"], "color": "PURPLE", "difficulty": 4}
        ]
      }
      If you cannot find today's puzzle, provide the most recent one you can find.`,
      config: {
        tools: [{ googleSearch: {} }]
      }
    });

    // Extract JSON from the response
    const responseText = searchResponse.text || "";
    const jsonMatch = responseText.match(/\{[\s\S]*"categories"[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Could not find JSON in response:", responseText);
      return getFallbackPuzzle();
    }
    
    const data = JSON.parse(jsonMatch[0]);
    const categories = data.categories.map((c: any) => ({
      ...c,
      id: Math.random().toString(36).substr(2, 9),
      color: c.color as CategoryColor
    }));

    const allWords = categories.flatMap((c: any) => c.words);
    
    return {
      date: data.date || today,
      categories,
      allWords: allWords.sort(() => Math.random() - 0.5)
    };
  } catch (error) {
    console.error("Failed to fetch today's puzzle:", error);
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
