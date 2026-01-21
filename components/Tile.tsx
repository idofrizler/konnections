import React, { useRef, useCallback } from 'react';
import { TileState, CategoryColor, TagColor } from '../types';
import { COLOR_MAP, TAG_COLOR_MAP } from '../constants';

interface TileProps {
  tile: TileState;
  onClick: () => void;
  onLookup?: (word: string) => void;
  disabled?: boolean;
}

const LONG_PRESS_DURATION = 500; // milliseconds

const Tile: React.FC<TileProps> = ({ tile, onClick, onLookup, disabled }) => {
  const longPressTimer = useRef<number | null>(null);
  const isLongPress = useRef(false);
  const touchStartPos = useRef<{ x: number; y: number } | null>(null);

  const clearLongPressTimer = useCallback(() => {
    if (longPressTimer.current !== null) {
      window.clearTimeout(longPressTimer.current);
      longPressTimer.current = null;
    }
  }, []);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    isLongPress.current = false;
    const touch = e.touches[0];
    touchStartPos.current = { x: touch.clientX, y: touch.clientY };
    
    longPressTimer.current = window.setTimeout(() => {
      isLongPress.current = true;
      onLookup?.(tile.word);
    }, LONG_PRESS_DURATION);
  }, [tile.word, onLookup]);

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    // Cancel long press if finger moves too much
    if (touchStartPos.current) {
      const touch = e.touches[0];
      const dx = Math.abs(touch.clientX - touchStartPos.current.x);
      const dy = Math.abs(touch.clientY - touchStartPos.current.y);
      if (dx > 10 || dy > 10) {
        clearLongPressTimer();
      }
    }
  }, [clearLongPressTimer]);

  const handleTouchEnd = useCallback((e: React.TouchEvent) => {
    clearLongPressTimer();

    // If it was a long press, prevent the click (but don't block scroll)
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }

    touchStartPos.current = null;
  }, [clearLongPressTimer]);

  const handleContextMenu = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    onLookup?.(tile.word);
  }, [tile.word, onLookup]);

  const handleClick = useCallback(() => {
    // Don't trigger click if it was a long press
    if (isLongPress.current) {
      isLongPress.current = false;
      return;
    }
    onClick();
  }, [onClick]);

  const getBackground = () => {
    if (tile.isSolved) {
      return COLOR_MAP[tile.solvedColor || CategoryColor.NONE];
    }
    
    const marks = tile.marks;
    if (marks.length === 0) return '#efefe6';
    if (marks.length === 1) return TAG_COLOR_MAP[marks[0]];
    
    // Improved sharp transition gradients
    if (marks.length === 2) {
      return `linear-gradient(to right, ${TAG_COLOR_MAP[marks[0]]} 50%, ${TAG_COLOR_MAP[marks[1]]} 50%)`;
    }
    
    const c1 = TAG_COLOR_MAP[marks[0]];
    const c2 = TAG_COLOR_MAP[marks[1]];
    const c3 = TAG_COLOR_MAP[marks[2]];
    const c4 = marks.length === 4 ? TAG_COLOR_MAP[marks[3]] : '#efefe6';
    
    // Sharp quadrant transitions using percentages to avoid blurring
    return `conic-gradient(
      from 0deg,
      ${c2} 0% 90deg, 
      ${c4} 90deg 180deg, 
      ${c3} 180deg 270deg, 
      ${c1} 270deg 360deg
    )`;
  };

  return (
    <button
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onContextMenu={handleContextMenu}
      disabled={disabled || tile.isSolved}
      className={`
        relative aspect-[4/3] w-full rounded-md flex items-center justify-center p-2
        transition-all duration-150 transform
        ${tile.isSolved ? 'cursor-default' : 'cursor-pointer active:scale-95'}
        overflow-hidden border-0
      `}
      style={{ 
        background: getBackground()
      }}
    >
      {/* Precision Selection Border Overlay */}
      {tile.isSelected && (
        <div className="absolute inset-0 border-[4px] border-black rounded-md z-20 pointer-events-none" />
      )}

      <span className={`
        text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-tight text-center z-10 select-none
        text-black
        ${tile.isSelected ? 'scale-90' : 'transition-transform'}
      `}>
        {tile.word}
      </span>
    </button>
  );
};

export default Tile;
