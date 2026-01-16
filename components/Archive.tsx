import React, { useState, useEffect, useCallback } from 'react';
import { getDateKey, formatDateForDisplay } from '../services/geminiService';

interface ArchiveProps {
  onSelectDate: (dateKey: string) => void;
  currentDate: string;
  onClose: () => void;
}

interface PuzzleListItem {
  dateKey: string;
  displayDate: string;
  status: 'PLAYING' | 'WON' | 'LOST' | null;
}

const STORAGE_KEY_PREFIX = 'konnections_game_';
const ITEMS_PER_PAGE = 10;

function getPuzzleStatus(dateKey: string): 'PLAYING' | 'WON' | 'LOST' | null {
  try {
    const saved = localStorage.getItem(`${STORAGE_KEY_PREFIX}${dateKey}`);
    if (saved) {
      const state = JSON.parse(saved);
      return state.status || null;
    }
  } catch (e) {
    console.error('Failed to check puzzle status:', e);
  }
  return null;
}

const Archive: React.FC<ArchiveProps> = ({ onSelectDate, currentDate, onClose }) => {
  const [puzzles, setPuzzles] = useState<PuzzleListItem[]>([]);
  const [page, setPage] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  const loadMorePuzzles = useCallback(() => {
    if (isLoading) return; // Prevent concurrent loading
    
    setIsLoading(true);
    
    const startOffset = -1 - (page * ITEMS_PER_PAGE);
    const endOffset = startOffset - ITEMS_PER_PAGE;
    
    const newPuzzles: PuzzleListItem[] = [];
    for (let i = startOffset; i > endOffset; i--) {
      const dateKey = getDateKey(i);
      newPuzzles.push({
        dateKey,
        displayDate: formatDateForDisplay(dateKey),
        status: getPuzzleStatus(dateKey)
      });
    }
    
    setPuzzles(prev => [...prev, ...newPuzzles]);
    setPage(prev => prev + 1);
    setIsLoading(false);
  }, [page, isLoading]);

  useEffect(() => {
    loadMorePuzzles();
  }, []);

  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, scrollHeight, clientHeight } = e.currentTarget;
    if (scrollHeight - scrollTop <= clientHeight * 1.5 && !isLoading) {
      loadMorePuzzles();
    }
  }, [isLoading, loadMorePuzzles]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[80vh] flex flex-col">
        <div className="p-6 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <h2 className="text-2xl font-black">PUZZLE ARCHIVE</h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl font-bold w-8 h-8 flex items-center justify-center"
            >
              ×
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2">Select a puzzle to play</p>
        </div>

        <div 
          className="flex-1 overflow-y-auto p-4"
          onScroll={handleScroll}
        >
          <div className="space-y-2">
            {puzzles.map(puzzle => (
              <button
                key={puzzle.dateKey}
                onClick={() => {
                  onSelectDate(puzzle.dateKey);
                  onClose();
                }}
                className={`w-full p-4 rounded-lg text-left transition-all hover:shadow-md ${
                  puzzle.dateKey === currentDate
                    ? 'bg-black text-white'
                    : 'bg-gray-50 hover:bg-gray-100'
                } ${
                  puzzle.status === 'WON' ? 'border-2 border-green-500' : 
                  puzzle.status === 'LOST' ? 'border-2 border-red-500' : ''
                }`}
              >
                <div className="flex justify-between items-center">
                  <div>
                    <div className="font-bold text-sm">{puzzle.displayDate}</div>
                    <div className="text-xs opacity-70 mt-0.5">{puzzle.dateKey}</div>
                  </div>
                  {puzzle.status === 'WON' && (
                    <div className="flex items-center gap-1">
                      <svg 
                        className="w-5 h-5 text-green-500" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                      <span className={`text-xs font-bold ${puzzle.dateKey === currentDate ? 'text-green-300' : 'text-green-600'}`}>
                        Solved
                      </span>
                    </div>
                  )}
                  {puzzle.status === 'LOST' && (
                    <div className="flex items-center gap-1">
                      <svg 
                        className="w-5 h-5 text-red-500" 
                        fill="currentColor" 
                        viewBox="0 0 20 20"
                      >
                        <path 
                          fillRule="evenodd" 
                          d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" 
                          clipRule="evenodd" 
                        />
                      </svg>
                      <span className={`text-xs font-bold ${puzzle.dateKey === currentDate ? 'text-red-300' : 'text-red-600'}`}>
                        Failed
                      </span>
                    </div>
                  )}
                </div>
              </button>
            ))}
          </div>

          {isLoading && (
            <div className="text-center py-4">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900"></div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Archive;
