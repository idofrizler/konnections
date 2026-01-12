import React, { useState, useEffect } from 'react';
import { DefinitionResult } from '../services/dictionaryService';

interface DefinitionPopupProps {
  definition: DefinitionResult | null;
  isLoading: boolean;
  onClose: () => void;
}

const DefinitionPopup: React.FC<DefinitionPopupProps> = ({ definition, isLoading, onClose }) => {
  const [expandedSections, setExpandedSections] = useState<Set<number>>(new Set());
  
  // Disable body scroll when popup is open
  useEffect(() => {
    const isOpen = definition !== null || isLoading;
    if (isOpen) {
      const scrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${scrollY}px`;
      document.body.style.width = '100%';
    }
    return () => {
      const scrollY = document.body.style.top;
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.width = '';
      window.scrollTo(0, parseInt(scrollY || '0') * -1);
    };
  }, [definition, isLoading]);

  const toggleSection = (idx: number) => {
    setExpandedSections(prev => {
      const next = new Set(prev);
      if (next.has(idx)) {
        next.delete(idx);
      } else {
        next.add(idx);
      }
      return next;
    });
  };

  if (!definition && !isLoading) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40" 
        onClick={onClose}
      />
      
      {/* Popup Container */}
      <div className="relative bg-white rounded-xl shadow-2xl max-w-md w-full flex flex-col"
           style={{ maxHeight: '600px' }}>
        
        {/* Header with close button */}
        <div className="flex justify-end p-3 pb-0 shrink-0">
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition-colors text-gray-400 hover:text-gray-600"
            aria-label="Close"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="6" x2="6" y2="18"></line>
              <line x1="6" y1="6" x2="18" y2="18"></line>
            </svg>
          </button>
        </div>

        {/* Scrollable content */}
        <div 
          className="px-5 pb-5 overflow-y-auto flex-1"
        >
          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-8 h-8 border-4 border-gray-200 border-t-gray-600 rounded-full animate-spin" />
            </div>
          ) : definition ? (
            <>
              {/* Word */}
              <h2 className="text-2xl font-black uppercase tracking-tight text-gray-900 mb-1">
                {definition.word}
              </h2>
              
              {/* Phonetic */}
              {definition.phonetic && (
                <p className="text-sm text-gray-500 italic mb-4">
                  {definition.phonetic}
                </p>
              )}
              
              {/* Meanings or Not Found */}
              {definition.found && definition.meanings && definition.meanings.length > 0 ? (
                <div className="space-y-2">
                  {definition.meanings.map((meaning, meaningIdx) => {
                    const isExpanded = expandedSections.has(meaningIdx);
                    const defCount = meaning.definitions?.length || 0;
                    
                    return (
                      <div key={meaningIdx} className="border border-gray-100 rounded-lg overflow-hidden">
                        {/* Collapsible header */}
                        <button
                          onClick={() => toggleSection(meaningIdx)}
                          className="w-full flex items-center justify-between px-3 py-2 bg-gray-50 hover:bg-gray-100 transition-colors text-left"
                        >
                          <span className="text-xs font-black uppercase tracking-widest text-gray-900">
                            {meaning.partOfSpeech}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-400">
                              {defCount} definition{defCount !== 1 ? 's' : ''}
                            </span>
                            <svg 
                              xmlns="http://www.w3.org/2000/svg" 
                              width="14" 
                              height="14" 
                              viewBox="0 0 24 24" 
                              fill="none" 
                              stroke="currentColor" 
                              strokeWidth="2" 
                              strokeLinecap="round" 
                              strokeLinejoin="round"
                              className={`text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                            >
                              <polyline points="6 9 12 15 18 9"></polyline>
                            </svg>
                          </div>
                        </button>
                        
                        {/* Expanded content */}
                        {isExpanded && (
                          <div className="px-3 py-3 border-t border-gray-100">
                            {/* Meaning-level synonyms */}
                            {meaning.synonyms && meaning.synonyms.length > 0 && (
                              <div className="mb-3 flex flex-wrap gap-1">
                                <span className="text-[10px] font-semibold uppercase tracking-wider text-gray-400 mr-1">
                                  Similar:
                                </span>
                                {meaning.synonyms.slice(0, 8).map((syn, synIdx) => (
                                  <span 
                                    key={synIdx}
                                    className="text-[10px] px-1.5 py-0.5 bg-blue-50 text-blue-600 rounded"
                                  >
                                    {syn}
                                  </span>
                                ))}
                                {meaning.synonyms.length > 8 && (
                                  <span className="text-[10px] px-1.5 py-0.5 text-gray-400">
                                    +{meaning.synonyms.length - 8} more
                                  </span>
                                )}
                              </div>
                            )}
                            
                            {/* Definitions list */}
                            <ol className="space-y-3">
                              {meaning.definitions?.map((def, defIdx) => (
                                <li key={defIdx} className="pl-4 relative">
                                  {/* Definition number */}
                                  <span className="absolute left-0 text-xs font-bold text-gray-400">
                                    {defIdx + 1}.
                                  </span>
                                  
                                  {/* Definition text */}
                                  <p className="text-sm text-gray-700 leading-relaxed">
                                    {def.definition}
                                  </p>
                                  
                                  {/* Synonyms for this specific definition */}
                                  {def.synonyms && def.synonyms.length > 0 && (
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                      {def.synonyms.slice(0, 6).map((syn, synIdx) => (
                                        <span 
                                          key={synIdx}
                                          className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-600 rounded"
                                        >
                                          {syn}
                                        </span>
                                      ))}
                                      {def.synonyms.length > 6 && (
                                        <span className="text-[10px] px-1.5 py-0.5 text-gray-400">
                                          +{def.synonyms.length - 6} more
                                        </span>
                                      )}
                                    </div>
                                  )}
                                </li>
                              ))}
                            </ol>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="py-4 text-center">
                  <p className="text-gray-500 italic">
                    Definition not found
                  </p>
                  <p className="text-xs text-gray-400 mt-2">
                    This word may be a proper noun, abbreviation, or specialized term.
                  </p>
                </div>
              )}
            </>
          ) : null}
        </div>
      </div>
    </div>
  );
};

export default DefinitionPopup;
