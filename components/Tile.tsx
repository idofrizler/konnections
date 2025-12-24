
import React from 'react';
import { TileState, CategoryColor, TagColor } from '../types';
import { COLOR_MAP, TAG_COLOR_MAP } from '../constants';

interface TileProps {
  tile: TileState;
  onClick: () => void;
  disabled?: boolean;
}

const Tile: React.FC<TileProps> = ({ tile, onClick, disabled }) => {
  const getBackground = () => {
    if (tile.isSolved) {
      return COLOR_MAP[tile.solvedColor || CategoryColor.NONE];
    }
    
    const marks = tile.marks;
    if (marks.length === 0) return '#efefe6';
    if (marks.length === 1) return TAG_COLOR_MAP[marks[0]];
    
    if (marks.length === 2) {
      return `linear-gradient(to right, ${TAG_COLOR_MAP[marks[0]]} 50%, ${TAG_COLOR_MAP[marks[1]]} 50%)`;
    }
    
    const c1 = TAG_COLOR_MAP[marks[0]];
    const c2 = TAG_COLOR_MAP[marks[1]];
    const c3 = TAG_COLOR_MAP[marks[2]];
    const c4 = marks.length === 4 ? TAG_COLOR_MAP[marks[3]] : '#efefe6';
    
    return `conic-gradient(
      ${c2} 0deg 90deg, 
      ${c4} 90deg 180deg, 
      ${c3} 180deg 270deg, 
      ${c1} 270deg 360deg
    )`;
  };

  return (
    <button
      onClick={onClick}
      disabled={disabled || tile.isSolved}
      className={`
        relative aspect-[4/3] w-full rounded-md flex items-center justify-center p-1
        transition-all duration-150 transform
        ${tile.isSolved ? 'cursor-default' : 'cursor-pointer active:scale-95'}
        overflow-hidden border-2 border-transparent
      `}
      style={{ 
        background: getBackground(),
        boxShadow: tile.isSelected ? 'inset 0 0 0 4px #000000' : 'none'
      }}
    >
      <span className={`
        text-[10px] sm:text-xs md:text-sm font-bold uppercase tracking-tight text-center z-10 select-none
        ${tile.isSolved ? 'text-black' : 'text-black'}
        ${tile.isSelected ? 'scale-90 transition-transform' : ''}
      `}>
        {tile.word}
      </span>
      {!tile.isSolved && tile.marks.length > 1 && (
        <div className="absolute top-1 right-1 flex gap-0.5">
           {tile.marks.map((m, i) => (
             <div key={i} className="w-1.5 h-1.5 rounded-full border border-black/10" style={{backgroundColor: TAG_COLOR_MAP[m]}} />
           ))}
        </div>
      )}
    </button>
  );
};

export default Tile;
