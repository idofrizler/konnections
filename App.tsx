
import React, { useState, useEffect, useCallback } from 'react';
import { 
  GameBoard, 
  TileState, 
  CategoryColor, 
  TagColor,
  GameStatus, 
  Category,
  GuessResult
} from './types';
import { generatePuzzle, getDateKey } from './services/geminiService';
import { lookupWord as fetchDefinition, DefinitionResult } from './services/dictionaryService';
import { COLOR_MAP, TAG_COLOR_MAP, TAG_LABELS, INITIAL_MISTAKES, COLOR_EMOJI } from './constants';
import Tile from './components/Tile';
import Controls from './components/Controls';
import DefinitionPopup from './components/DefinitionPopup';
import Archive from './components/Archive';

// Local storage key prefix
const STORAGE_KEY_PREFIX = 'konnections_game_';

interface SavedGameState {
  puzzle: GameBoard;
  tiles: TileState[];
  mistakes: number;
  solvedCategories: Category[];
  status: GameStatus;
  guessHistory: GuessResult[];
}

function saveGameState(dateKey: string, state: SavedGameState): void {
  try {
    localStorage.setItem(`${STORAGE_KEY_PREFIX}${dateKey}`, JSON.stringify(state));
  } catch (e) {
    console.error('Failed to save game state:', e);
  }
}

function loadGameState(dateKey: string): SavedGameState | null {
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${dateKey}`);
    if (saved) {
      return JSON.parse(saved) as SavedGameState;
    }
  } catch (e) {
    console.error('Failed to load game state:', e);
  }
  return null;
}

function clearGameState(dateKey: string): void {
  try {
    localStorage.removeItem(`${STORAGE_KEY_PREFIX}${dateKey}`);
  } catch (e) {
    console.error('Failed to clear game state:', e);
  }
}

const App: React.FC = () => {
  const [puzzle, setPuzzle] = useState<GameBoard | null>(null);
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [mistakes, setMistakes] = useState(INITIAL_MISTAKES);
  const [solvedCategories, setSolvedCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<GameStatus>('PLAYING');
  const [message, setMessage] = useState<string>('');
  const [activeTagColor, setActiveTagColor] = useState<TagColor>(TagColor.NONE);
  const [guessHistory, setGuessHistory] = useState<GuessResult[]>([]);
  const [isGuessesOpen, setIsGuessesOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [selectedDate, setSelectedDate] = useState<string>(getDateKey(0));
  
  // Definition lookup state
  const [lookupWord, setLookupWord] = useState<string | null>(null);
  const [definition, setDefinition] = useState<DefinitionResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);
  const [showArchive, setShowArchive] = useState(false);

  const initGame = useCallback(async (dateKey?: string, forceNew: boolean = false) => {
    const targetDate = dateKey || selectedDate;
    
    // Try to load saved game state first (unless forcing a new game)
    if (!forceNew) {
      const saved = loadGameState(targetDate);
      if (saved) {
        console.log(`Restoring saved game for ${targetDate}`);
        setPuzzle(saved.puzzle);
        // Restore tiles but clear selections (those are temporary)
        setTiles(saved.tiles.map(t => ({ ...t, isSelected: false })));
        setMistakes(saved.mistakes);
        setSolvedCategories(saved.solvedCategories);
        setStatus(saved.status);
        setGuessHistory(saved.guessHistory);
        setSelectedDate(targetDate);
        setMessage('');
        return;
      }
    }
    
    // No saved state, fetch new puzzle
    setIsGenerating(true);
    setMessage("Fetching puzzle...");
    const newPuzzle = await generatePuzzle(targetDate);
    setPuzzle(newPuzzle);
    setTiles(newPuzzle.allWords.map(word => ({
      word,
      marks: [],
      isSelected: false,
      isSolved: false
    })));
    setMistakes(INITIAL_MISTAKES);
    setSolvedCategories([]);
    setGuessHistory([]);
    setStatus('PLAYING');
    setSelectedDate(targetDate);
    setMessage('');
    setIsGenerating(false);
  }, [selectedDate]);

  // Save game state whenever relevant state changes
  useEffect(() => {
    if (puzzle && tiles.length > 0) {
      saveGameState(selectedDate, {
        puzzle,
        tiles,
        mistakes,
        solvedCategories,
        status,
        guessHistory
      });
    }
  }, [puzzle, tiles, mistakes, solvedCategories, status, guessHistory, selectedDate]);

  // Initialize game on mount
  useEffect(() => {
    initGame(getDateKey(0));
  }, []);

  const toggleSelect = (word: string) => {
    if (status !== 'PLAYING') return;

    if (activeTagColor !== TagColor.NONE) {
      setTiles(prev => prev.map(t => {
        if (t.word === word) {
          const hasMark = t.marks.includes(activeTagColor);
          const newMarks = hasMark 
            ? t.marks.filter(m => m !== activeTagColor) 
            : [...t.marks, activeTagColor].slice(0, 4);
          return { ...t, marks: newMarks };
        }
        return t;
      }));
      return;
    }

    const selectedCount = tiles.filter(t => t.isSelected).length;
    const isCurrentlySelected = tiles.find(t => t.word === word)?.isSelected;

    if (!isCurrentlySelected && selectedCount >= 4) return;

    setTiles(prev => prev.map(t => 
      t.word === word ? { ...t, isSelected: !t.isSelected } : t
    ));
  };

  const handleShuffle = () => {
    setTiles(prev => {
      const solved = prev.filter(t => t.isSolved);
      const unsolved = prev.filter(t => !t.isSolved);
      const shuffled = [...unsolved].sort(() => Math.random() - 0.5);
      return [...solved, ...shuffled];
    });
  };

  const handleDeselect = () => {
    setTiles(prev => prev.map(t => ({ ...t, isSelected: false })));
  };

  const clearAllMarks = () => {
    setTiles(prev => prev.map(t => ({ ...t, marks: [] })));
  };

  const handleSubmit = () => {
    if (!puzzle) return;
    const selectedTiles = tiles.filter(t => t.isSelected);
    if (selectedTiles.length !== 4) return;

    const selectedWords = selectedTiles.map(t => t.word);

    const guessKey = [...selectedWords].sort().join('|');
    const hasGuessedAlready = guessHistory.some(g => {
      if (!g.words || g.words.length !== 4) return false;
      return [...g.words].sort().join('|') === guessKey;
    });

    if (hasGuessedAlready) {
      setMessage('Already guessed.');
      setTimeout(() => setMessage(''), 2000);
      return;
    }

    const guessColors = selectedWords.map(word => {
      const cat = puzzle.categories.find(c => c.words.includes(word));
      return cat?.color || CategoryColor.NONE;
    });

    const matchedCategory = puzzle.categories.find(cat =>
      cat.words.every(w => selectedWords.includes(w))
    );

    let maxMatch = 0;
    if (!matchedCategory) {
      puzzle.categories.forEach(cat => {
        const matches = cat.words.filter(w => selectedWords.includes(w)).length;
        if (matches > maxMatch) maxMatch = matches;
      });
    }

    const guessResult: GuessResult['result'] = matchedCategory
      ? 'SOLVED'
      : maxMatch === 3
        ? 'ALMOST'
        : 'WRONG';

    setGuessHistory(prev => [...prev, { colors: guessColors, words: selectedWords, result: guessResult }]);

    if (matchedCategory) {
      const newSolved = [...solvedCategories, matchedCategory].sort((a, b) => a.difficulty - b.difficulty);
      setSolvedCategories(newSolved);
      setTiles(prev => prev.map(t => 
        selectedWords.includes(t.word) 
          ? { ...t, isSolved: true, isSelected: false, solvedColor: matchedCategory.color } 
          : t
      ));
      
      if (newSolved.length === 4) {
        setStatus('WON');
        setMessage('Splendid!');
      } else {
        setMessage('Category found!');
        setTimeout(() => setMessage(''), 2000);
      }
    } else {
      const newMistakes = mistakes - 1;
      setMistakes(newMistakes);

      if (maxMatch === 3) {
        setMessage('One away...');
      } else {
        setMessage('Not quite.');
      }

      if (newMistakes === 0) {
        setStatus('LOST');
        revealSolution();
      } else {
        setTimeout(() => setMessage(''), 2000);
      }
    }
  };

  const revealSolution = () => {
    if (!puzzle) return;
    setMessage('Next time!');
    const sortedCats = [...puzzle.categories].sort((a, b) => a.difficulty - b.difficulty);
    setSolvedCategories(sortedCats);
    setTiles(prev => prev.map(t => {
      const cat = puzzle.categories.find(c => c.words.includes(t.word));
      return { ...t, isSolved: true, isSelected: false, solvedColor: cat?.color };
    }));
  };

  const handleShare = () => {
    if (!puzzle) return;
    if (status !== 'WON' && status !== 'LOST') return;

    const grid = guessHistory.map(guess =>
      guess.colors.map(c => COLOR_EMOJI[c]).join('')
    ).join('\n');

    const text = `Konnections\nPuzzle: ${puzzle.date || 'Today'}\n${grid}`;

    navigator.clipboard.writeText(text).then(() => {
      setMessage('Results copied to clipboard!');
      setTimeout(() => setMessage(''), 2000);
    });
  };

  const handleLookup = useCallback(async (word: string) => {
    setLookupWord(word);
    setDefinition(null);
    setIsLookingUp(true);
    
    const result = await fetchDefinition(word);
    setDefinition(result);
    setIsLookingUp(false);
  }, []);

  const handleCloseDefinition = useCallback(() => {
    setLookupWord(null);
    setDefinition(null);
    setIsLookingUp(false);
  }, []);

  const handleSelectGuess = (words: string[]) => {
    if (status !== 'PLAYING') return;
    setTiles(prev => prev.map(t => {
      if (t.isSolved) return { ...t, isSelected: false };
      return { ...t, isSelected: words.includes(t.word) };
    }));
  };

  const selectedCount = tiles.filter(t => t.isSelected).length;

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8 flex flex-col items-center">
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-black mb-1 italic">KONNECTIONS</h1>
        <p className="text-xs sm:text-sm text-gray-500 font-medium mb-3">{puzzle?.date || 'Today'}</p>
        <div className="flex justify-center gap-2">
          <button
            onClick={() => {
              const today = getDateKey(0);
              setSelectedDate(today);
              initGame(today);
            }}
            disabled={isGenerating}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${
              selectedDate === getDateKey(0)
                ? 'bg-black text-white'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            } ${isGenerating ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Today
          </button>
          <button
            onClick={() => setShowArchive(true)}
            disabled={isGenerating}
            className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all bg-gray-100 text-gray-600 hover:bg-gray-200 ${
              isGenerating ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            Archive
          </button>
        </div>
      </header>

      {message && (
        <div className="fixed top-12 left-1/2 -translate-x-1/2 z-50 bg-black text-white px-6 py-2 rounded-lg font-bold shadow-xl animate-bounce whitespace-nowrap text-sm">
          {message}
        </div>
      )}

      <div className="w-full space-y-1 sm:space-y-2">
        {solvedCategories.map(cat => (
          <div 
            key={cat.id} 
            className="w-full h-16 sm:h-20 rounded-md flex flex-col items-center justify-center p-2 animate-in fade-in slide-in-from-top-4"
            style={{ backgroundColor: COLOR_MAP[cat.color] }}
          >
            <h3 className="font-black uppercase tracking-widest text-xs sm:text-sm md:text-base mb-1">{cat.label}</h3>
            <p className="font-medium text-[10px] sm:text-xs uppercase tracking-wider text-center">
              {cat.words.map((word, idx) => (
                <span key={word}>
                  <button
                    onClick={() => handleLookup(word)}
                    className="hover:underline focus:underline focus:outline-none"
                  >
                    {word}
                  </button>
                  {idx < cat.words.length - 1 && ', '}
                </span>
              ))}
            </p>
          </div>
        ))}

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {tiles.filter(t => !t.isSolved).map(tile => (
            <Tile 
              key={tile.word} 
              tile={tile} 
              onClick={() => toggleSelect(tile.word)}
              onLookup={handleLookup}
              disabled={status !== 'PLAYING'}
            />
          ))}
        </div>
      </div>

      <div className="mt-8 flex flex-col items-center gap-4 w-full">
        <div className="flex items-center gap-2">
          <span className="font-bold text-sm sm:text-base">Mistakes remaining:</span>
          <div className="flex gap-1.5">
            {[...Array(INITIAL_MISTAKES)].map((_, i) => (
              <div 
                key={i} 
                className={`w-3 h-3 rounded-full ${i < mistakes ? 'bg-gray-700' : 'bg-gray-200'}`} 
              />
            ))}
          </div>
        </div>

        <Controls 
          onShuffle={handleShuffle}
          onDeselect={handleDeselect}
          onSubmit={handleSubmit}
          canSubmit={selectedCount === 4}
          disabled={status !== 'PLAYING' || isGenerating}
        />


        <div className="w-full border-t border-gray-100 mt-4 pt-8">

          
          <div className="flex justify-center gap-2">
            {(Object.keys(TAG_LABELS) as TagColor[]).filter(c => c !== TagColor.NONE).map(color => (
              <button
                key={color}
                aria-label={TAG_LABELS[color]}
                title={TAG_LABELS[color]}
                onClick={() => setActiveTagColor(activeTagColor === color ? TagColor.NONE : color)}
                className={`
                  w-8 h-8 rounded-lg transition-all
                  border-2 ${activeTagColor === color ? 'border-black scale-105 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'}
                `}
                style={{ backgroundColor: TAG_COLOR_MAP[color] }}
              ></button>
            ))}
          </div>

          {guessHistory.length > 0 && (
            <div className="w-full mt-6">
              <button
                type="button"
                onClick={() => setIsGuessesOpen(v => !v)}
                className="w-full flex items-center justify-between rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors"
              >
                <span className="font-black text-xs uppercase tracking-wider text-gray-600">Guesses</span>
                <span className="text-[11px] text-gray-400 font-bold">
                  {guessHistory.length} {isGuessesOpen ? '▾' : '▸'}
                </span>
              </button>

              {isGuessesOpen && (
                <div className="flex flex-col gap-2 mt-2">
                  {guessHistory.map((guess, idx) => {
                    // IMPORTANT: Don't show anything derived from category membership (colors), it's too revealing.
                    const result = guess.result ?? 'WRONG';
                    const words = guess.words ?? [];

                    const pillClass =
                      result === 'SOLVED'
                        ? 'bg-green-100 text-green-800'
                        : result === 'ALMOST'
                          ? 'bg-yellow-100 text-yellow-800'
                          : 'bg-gray-100 text-gray-700';

                    const pillText = result === 'SOLVED' ? 'Solved' : result === 'ALMOST' ? 'Almost' : 'Nope';

                    return (
                      <button
                        key={idx}
                        type="button"
                        className="w-full flex items-center justify-between gap-3 rounded-lg px-2 py-2 hover:bg-gray-50 transition-colors text-left"
                        onClick={() => words.length === 4 && handleSelectGuess(words)}
                        disabled={status !== 'PLAYING' || words.length !== 4}
                        title={words.length === 4 ? 'Select these tiles' : ''}
                      >
                        <div className="flex flex-wrap gap-1.5">
                          {words.map(w => (
                            <span key={w} className="px-2 py-1 rounded-md bg-gray-100 text-gray-800 text-[11px] font-black uppercase tracking-wider">
                              {w}
                            </span>
                          ))}
                        </div>
                        <span className={`shrink-0 px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${pillClass}`}>
                          {pillText}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}

        </div>

        {(status === 'WON' || status === 'LOST') && (
          <div className="flex flex-col gap-3 items-center mt-6 w-full">
            <button
              onClick={handleShare}
              className="w-full py-4 bg-blue-600 text-white rounded-full font-bold text-lg hover:bg-blue-700 transition-colors shadow-lg"
            >
              Share Results
            </button>
            <button
              onClick={() => {
                clearGameState(selectedDate);
                initGame(selectedDate, true);
              }}
              className="w-full py-4 bg-black text-white rounded-full font-bold text-lg hover:bg-gray-800 transition-colors shadow-lg"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
      
      <footer className="mt-12 text-center text-[10px] text-gray-400">
        <p>Inspired by NYT Connections. Enhanced logic tools.</p>
        <p className="mt-1">Puzzle search powered by Gemini AI</p>
        <p className="mt-1">Long-press any word to look up its definition</p>
      </footer>

      {/* Definition Popup */}
      {(lookupWord || isLookingUp) && (
        <DefinitionPopup
          definition={definition}
          isLoading={isLookingUp}
          onClose={handleCloseDefinition}
        />
      )}

      {/* Archive Modal */}
      {showArchive && (
        <Archive
          currentDate={selectedDate}
          onSelectDate={(dateKey) => {
            setSelectedDate(dateKey);
            initGame(dateKey);
          }}
          onClose={() => setShowArchive(false)}
        />
      )}
    </div>
  );
};

export default App;
