const STORAGE_KEY_PREFIX = 'konnections_def_';

export interface DefinitionEntry {
  definition: string;
  synonyms: string[];
}

export interface MeaningEntry {
  partOfSpeech: string;
  definitions: DefinitionEntry[];
  synonyms: string[]; // meaning-level synonyms
}

export interface DefinitionResult {
  word: string;
  phonetic?: string;
  meanings: MeaningEntry[];
  found: boolean;
  cached: boolean;
}

interface DictionaryAPIResponse {
  word: string;
  phonetic?: string;
  phonetics?: Array<{ text?: string; audio?: string }>;
  meanings?: Array<{
    partOfSpeech: string;
    synonyms?: string[];
    definitions: Array<{ 
      definition: string;
      synonyms?: string[];
    }>;
  }>;
}

function getCachedDefinition(word: string): DefinitionResult | null {
  try {
    const key = `${STORAGE_KEY_PREFIX}${word.toLowerCase()}`;
    const cached = localStorage.getItem(key);
    if (cached) {
      const result = JSON.parse(cached) as DefinitionResult;
      return { ...result, cached: true };
    }
  } catch (e) {
    console.error('Failed to load cached definition:', e);
  }
  return null;
}

function cacheDefinition(word: string, result: DefinitionResult): void {
  try {
    const key = `${STORAGE_KEY_PREFIX}${word.toLowerCase()}`;
    localStorage.setItem(key, JSON.stringify(result));
  } catch (e) {
    console.error('Failed to cache definition:', e);
  }
}

export async function lookupWord(word: string): Promise<DefinitionResult> {
  const normalizedWord = word.toLowerCase().trim();
  
  // Check cache first
  const cached = getCachedDefinition(normalizedWord);
  if (cached) {
    return cached;
  }
  
  try {
    const response = await fetch(
      `https://api.dictionaryapi.dev/api/v2/entries/en/${encodeURIComponent(normalizedWord)}`
    );
    
    if (!response.ok) {
      // Word not found in dictionary
      const notFoundResult: DefinitionResult = {
        word: normalizedWord,
        meanings: [],
        found: false,
        cached: false
      };
      cacheDefinition(normalizedWord, notFoundResult);
      return notFoundResult;
    }
    
    const data: DictionaryAPIResponse[] = await response.json();
    const entry = data[0];
    
    // Extract phonetic (prefer one with text, fallback to top-level)
    let phonetic = entry.phonetic;
    if (!phonetic && entry.phonetics) {
      const phoneticEntry = entry.phonetics.find(p => p.text);
      phonetic = phoneticEntry?.text;
    }
    
    // Extract all meanings grouped by part of speech
    const meanings: MeaningEntry[] = [];
    if (entry.meanings) {
      for (const meaning of entry.meanings) {
        const definitions: DefinitionEntry[] = meaning.definitions.map(def => ({
          definition: def.definition,
          synonyms: def.synonyms || []
        }));
        
        meanings.push({
          partOfSpeech: meaning.partOfSpeech,
          definitions,
          synonyms: meaning.synonyms || [] // meaning-level synonyms
        });
      }
    }
    
    const result: DefinitionResult = {
      word: entry.word || normalizedWord,
      phonetic,
      meanings,
      found: true,
      cached: false
    };
    
    cacheDefinition(normalizedWord, result);
    return result;
    
  } catch (e) {
    console.error('Failed to fetch definition:', e);
    // Network error - don't cache, allow retry
    return {
      word: normalizedWord,
      meanings: [],
      found: false,
      cached: false
    };
  }
}
