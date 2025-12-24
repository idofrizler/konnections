
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
import { generatePuzzle } from './services/geminiService';
import { COLOR_MAP, TAG_COLOR_MAP, TAG_LABELS, INITIAL_MISTAKES, COLOR_EMOJI } from './constants';
import Tile from './components/Tile';
import Controls from './components/Controls';

const App: React.FC = () => {
  const [puzzle, setPuzzle] = useState<GameBoard | null>(null);
  const [tiles, setTiles] = useState<TileState[]>([]);
  const [mistakes, setMistakes] = useState(INITIAL_MISTAKES);
  const [solvedCategories, setSolvedCategories] = useState<Category[]>([]);
  const [status, setStatus] = useState<GameStatus>('PLAYING');
  const [message, setMessage] = useState<string>('');
  const [activeTagColor, setActiveTagColor] = useState<TagColor>(TagColor.NONE);
  const [guessHistory, setGuessHistory] = useState<GuessResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const initGame = useCallback(async () => {
    setIsGenerating(true);
    setMessage("Fetching today's puzzle...");
    const newPuzzle = await generatePuzzle();
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
    setMessage('');
    setIsGenerating(false);
  }, []);

  useEffect(() => {
    initGame();
  }, [initGame]);

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
    
    const guessColors = selectedWords.map(word => {
      const cat = puzzle.categories.find(c => c.words.includes(word));
      return cat?.color || CategoryColor.NONE;
    });
    setGuessHistory(prev => [...prev, { colors: guessColors }]);

    const matchedCategory = puzzle.categories.find(cat => 
      cat.words.every(w => selectedWords.includes(w))
    );

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

      let maxMatch = 0;
      puzzle.categories.forEach(cat => {
        const matches = cat.words.filter(w => selectedWords.includes(w)).length;
        if (matches > maxMatch) maxMatch = matches;
      });

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
    const grid = guessHistory.map(guess => 
      guess.colors.map(c => COLOR_EMOJI[c]).join('')
    ).join('\n');
    
    const text = `Konnections\nPuzzle: ${puzzle.date || 'Today'}\n${grid}`;
    
    navigator.clipboard.writeText(text).then(() => {
      setMessage('Results copied to clipboard!');
      setTimeout(() => setMessage(''), 2000);
    });
  };

  const selectedCount = tiles.filter(t => t.isSelected).length;

  return (
    <div className="min-h-screen max-w-2xl mx-auto px-4 py-8 flex flex-col items-center">
      <header className="mb-6 text-center">
        <h1 className="text-4xl sm:text-5xl font-black mb-1 italic">KONNECTIONS</h1>
        <p className="text-xs sm:text-sm text-gray-500 font-medium">{puzzle?.date || 'Today'}</p>
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
            <p className="font-medium text-[10px] sm:text-xs uppercase tracking-wider text-center">{cat.words.join(', ')}</p>
          </div>
        ))}

        <div className="grid grid-cols-4 gap-1.5 sm:gap-2">
          {tiles.filter(t => !t.isSolved).map(tile => (
            <Tile 
              key={tile.word} 
              tile={tile} 
              onClick={() => toggleSelect(tile.word)}
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

        <div className="w-full border-t border-gray-100 mt-10 pt-8">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-bold tracking-tight">Organization Tools</h2>
            <button 
              onClick={clearAllMarks}
              className="text-[11px] font-semibold uppercase tracking-wider text-gray-400 hover:text-gray-600 transition-colors"
            >
              Clear All Marks
            </button>
          </div>
          
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {(Object.keys(TAG_LABELS) as TagColor[]).filter(c => c !== TagColor.NONE).map(color => (
              <button
                key={color}
                onClick={() => setActiveTagColor(activeTagColor === color ? TagColor.NONE : color)}
                className={`
                  w-full h-12 rounded-xl flex items-center justify-center font-black text-[11px] uppercase tracking-wider transition-all
                  border-2 ${activeTagColor === color ? 'border-black scale-105 shadow-lg' : 'border-transparent opacity-80 hover:opacity-100'}
                `}
                style={{ 
                  backgroundColor: TAG_COLOR_MAP[color],
                  color: 'white',
                  textShadow: '0 1px 2px rgba(0,0,0,0.2)'
                }}
              >
                {activeTagColor === color ? 'Active' : TAG_LABELS[color]}
              </button>
            ))}
          </div>

          <div className="mt-8 flex justify-center">
            <button
              onClick={() => setActiveTagColor(TagColor.NONE)}
              className={`
                px-6 py-2.5 rounded-full text-[11px] font-black uppercase tracking-widest transition-all border-2
                ${activeTagColor === TagColor.NONE ? 'bg-gray-900 text-white border-black' : 'border-gray-200 text-gray-400 hover:border-gray-300'}
              `}
            >
              Selection Mode
            </button>
          </div>
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
              onClick={initGame}
              className="w-full py-4 bg-black text-white rounded-full font-bold text-lg hover:bg-gray-800 transition-colors shadow-lg"
            >
              Play Again
            </button>
          </div>
        )}
      </div>
      
      <footer className="mt-12 text-center text-[10px] text-gray-400">
        <p>Inspired by NYT Connections. Enhanced logic tools.</p>
        <p className="mt-1">Puzzle search powered by Gemini 2.5 Pro</p>
      </footer>
    </div>
  );
};

export default App;
