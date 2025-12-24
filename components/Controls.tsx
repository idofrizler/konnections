
import React from 'react';

interface ControlsProps {
  onShuffle: () => void;
  onDeselect: () => void;
  onSubmit: () => void;
  canSubmit: boolean;
  disabled?: boolean;
}

const Controls: React.FC<ControlsProps> = ({ onShuffle, onDeselect, onSubmit, canSubmit, disabled }) => {
  return (
    <div className="flex w-full justify-center gap-2 sm:gap-4 mt-6">
      <button
        onClick={onShuffle}
        disabled={disabled}
        className="flex-1 max-w-[100px] py-3 border-2 border-black rounded-full font-bold text-xs sm:text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Shuffle
      </button>
      <button
        onClick={onDeselect}
        disabled={disabled}
        className="flex-1 max-w-[120px] py-3 border-2 border-black rounded-full font-bold text-xs sm:text-sm hover:bg-gray-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        Deselect
      </button>
      <button
        onClick={onSubmit}
        disabled={!canSubmit || disabled}
        className={`
          flex-1 max-w-[120px] py-3 rounded-full font-bold text-xs sm:text-sm transition-all
          ${canSubmit && !disabled 
            ? 'bg-black text-white hover:bg-gray-800' 
            : 'border-2 border-gray-300 text-gray-300 cursor-not-allowed'}
        `}
      >
        Submit
      </button>
    </div>
  );
};

export default Controls;
