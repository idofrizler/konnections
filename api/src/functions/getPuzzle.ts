import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";
import { BlobServiceClient } from "@azure/storage-blob";
import { GoogleGenAI } from "@google/genai";

interface Category {
  id: string;
  label: string;
  words: string[];
  color: string;
  difficulty: number;
}

interface GameBoard {
  date: string;
  categories: Category[];
  allWords: string[];
}

const CONTAINER_NAME = "puzzles";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

async function getBlobClient() {
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING;
  if (!connectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING not configured");
  }
  const blobServiceClient = BlobServiceClient.fromConnectionString(connectionString);
  const containerClient = blobServiceClient.getContainerClient(CONTAINER_NAME);
  
  // Create container if it doesn't exist
  await containerClient.createIfNotExists();
  
  return containerClient;
}

async function getCachedPuzzle(dateKey: string): Promise<GameBoard | null> {
  try {
    const containerClient = await getBlobClient();
    const blobClient = containerClient.getBlobClient(`${dateKey}.json`);
    
    const exists = await blobClient.exists();
    if (!exists) return null;
    
    const downloadResponse = await blobClient.download();
    const content = await streamToString(downloadResponse.readableStreamBody!);
    return JSON.parse(content) as GameBoard;
  } catch (error) {
    console.error("Error reading from blob storage:", error);
    return null;
  }
}

async function cachePuzzle(dateKey: string, puzzle: GameBoard): Promise<void> {
  try {
    const containerClient = await getBlobClient();
    const blockBlobClient = containerClient.getBlockBlobClient(`${dateKey}.json`);
    
    const content = JSON.stringify(puzzle);
    await blockBlobClient.upload(content, content.length, {
      blobHTTPHeaders: { blobContentType: "application/json" }
    });
    
    console.log(`Cached puzzle for ${dateKey}`);
  } catch (error) {
    console.error("Error writing to blob storage:", error);
  }
}

async function streamToString(stream: NodeJS.ReadableStream): Promise<string> {
  const chunks: Buffer[] = [];
  return new Promise((resolve, reject) => {
    stream.on("data", (chunk) => chunks.push(Buffer.from(chunk)));
    stream.on("error", reject);
    stream.on("end", () => resolve(Buffer.concat(chunks).toString("utf-8")));
  });
}

async function generatePuzzleFromAPI(today: string): Promise<GameBoard> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }
  
  const ai = new GoogleGenAI({ apiKey });
  
  const searchResponse = await ai.models.generateContent({
    model: GEMINI_MODEL,
    contents: `Search for the NYT Connections puzzle for today, ${today}. 
    Find the 4 categories (Yellow, Green, Blue, Purple) and their 4 words each.
    Return ONLY valid JSON in this exact format (no other text):
    {
      "date": "${today}",
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

  const responseText = searchResponse.text || "";
  const jsonMatch = responseText.match(/\{[\s\S]*"categories"[\s\S]*\}/);
  if (!jsonMatch) {
    console.error("Could not find JSON in response:", responseText);
    throw new Error("Failed to parse puzzle response");
  }
  
  const data = JSON.parse(jsonMatch[0]);
  const categories = data.categories.map((c: any) => ({
    ...c,
    id: Math.random().toString(36).substr(2, 9),
    color: c.color
  }));

  const allWords = categories.flatMap((c: any) => c.words);
  
  return {
    date: data.date || today,
    categories,
    allWords
  };
}

function getFallbackPuzzle(): GameBoard {
  const categories = [
    { id: '1', label: 'WET WEATHER', words: ['HAIL', 'RAIN', 'SLEET', 'SNOW'], color: 'YELLOW', difficulty: 1 },
    { id: '2', label: 'WORDS IN A SONG', words: ['BRIDGE', 'CHORUS', 'HOOK', 'VERSE'], color: 'GREEN', difficulty: 2 },
    { id: '3', label: 'THINGS THAT SPIN', words: ['RECORD', 'TOP', 'WHEEL', 'YOYO'], color: 'BLUE', difficulty: 3 },
    { id: '4', label: '___ BALL', words: ['EIGHT', 'FIRE', 'MEAT', 'MOTH'], color: 'PURPLE', difficulty: 4 },
  ];
  return {
    date: "Fallback Puzzle",
    categories,
    allWords: categories.flatMap(c => c.words)
  };
}

export async function getPuzzle(request: HttpRequest, context: InvocationContext): Promise<HttpResponseInit> {
  context.log("getPuzzle function triggered");
  
  // Get date from query param or use today's date
  // The client sends their local date to handle timezone differences
  const dateParam = request.query.get("date");
  const dateKey = dateParam || new Date().toISOString().split('T')[0];
  const today = new Date(dateKey).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  
  context.log(`Fetching puzzle for date: ${dateKey}`);
  
  try {
    // Check cache first
    let puzzle = await getCachedPuzzle(dateKey);
    
    if (puzzle) {
      context.log(`Cache hit for ${dateKey}`);
      // Shuffle words for variety
      puzzle.allWords = [...puzzle.allWords].sort(() => Math.random() - 0.5);
      return {
        status: 200,
        jsonBody: { puzzle, cached: true }
      };
    }
    
    context.log(`Cache miss for ${dateKey}, generating from API`);
    
    try {
      puzzle = await generatePuzzleFromAPI(today);
      
      // Cache the puzzle and wait for it
      let cacheError: string | null = null;
      try {
        await cachePuzzle(dateKey, puzzle);
        context.log(`Successfully cached puzzle for ${dateKey}`);
      } catch (err) {
        cacheError = String(err);
        context.error("Failed to cache puzzle:", err);
      }
      
      // Shuffle words
      puzzle.allWords = puzzle.allWords.sort(() => Math.random() - 0.5);
      
      return {
        status: 200,
        jsonBody: { puzzle, cached: false, cacheError }
      };
    } catch (apiError) {
      context.error("API generation failed:", apiError);
      const fallback = getFallbackPuzzle();
      return {
        status: 200,
        jsonBody: { puzzle: fallback, cached: false, fallback: true }
      };
    }
  } catch (error) {
    context.error("getPuzzle error:", error);
    return {
      status: 500,
      jsonBody: { error: "Failed to fetch puzzle" }
    };
  }
}

app.http("getPuzzle", {
  methods: ["GET"],
  authLevel: "anonymous",
  route: "puzzle",
  handler: getPuzzle
});
