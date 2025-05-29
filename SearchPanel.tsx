
import React, { useState, useEffect, useRef } from 'react';
import { START_DATE } from './constants'; 

interface SearchPanelProps {
  onSearch: (searchTerm: string, dateValue: number) => void;
  onDateChange: (dateValue: number) => void;
  initialDateValue: number;
}

export const SearchPanel: React.FC<SearchPanelProps> = ({ onSearch, onDateChange, initialDateValue }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [dateValue, setDateValue] = useState(initialDateValue);
  const [isSearching, setIsSearching] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setDateValue(initialDateValue);
  }, [initialDateValue]);

  const toggleOpen = () => {
    setIsOpen(prev => {
      if (!prev && inputRef.current) {
        setTimeout(() => inputRef.current?.focus(), 180); 
      }
      return !prev;
    });
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSearching(true);
    onSearch(searchTerm, dateValue);
    setTimeout(() => setIsSearching(false), 500); 
  };

  const handleDateInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newDateValue = parseInt(e.target.value, 10);
    setDateValue(newDateValue);
    onDateChange(newDateValue); // Call onDateChange immediately for live filtering
  };
  
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        // Only close if the click target is not the toggle button itself
        // (assuming toggle button is outside panelRef when panel is closed)
        // This logic can be complex if button is part of panelRef.
        // A simpler way might be to check event.target against a ref for the button.
        // For now, this should generally work.
        setIsOpen(false);
      }
    };
    if (isOpen) { // Only add listener when panel is open
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]); // Re-add/remove listener when isOpen changes

  const calculateDateDisplay = (value: number): string => {
    if (value === 29) return "Toutes dates (jusqu'au 01 Mai 2025)"; 
    const daysAgo = 29 - value;
    const targetDate = new Date(START_DATE);
    targetDate.setDate(START_DATE.getDate() - daysAgo);
    return `Depuis ${targetDate.toLocaleDateString('fr-FR', { day: '2-digit', month: 'short' })} (jusqu'au 01 Mai 2025)`;
  };


  return (
    <div
      ref={panelRef}
      className={`absolute z-[1001] top-[2.5%] right-[3vw] 
                  flex flex-row items-center overflow-visible transition-all duration-300 ease-[cubic-bezier(.43,1.2,.46,.97)]
                  ${isOpen ? 'w-[290px] min-w-[290px] h-auto bg-white/90 backdrop-blur-md rounded-[1.3rem] shadow-xl p-2.5' 
                           : 'w-[52px] min-w-[52px] h-[52px] bg-white/80 backdrop-blur-sm rounded-full shadow-lg p-1.5'}`}
      role="search"
    >
      <button
        onClick={toggleOpen}
        className={`flex items-center justify-center w-[40px] h-[40px] rounded-full bg-neutral-800 text-white text-xl
                    border-none outline-none cursor-pointer shadow-[0_2.5px_12px_rgba(0,0,0,0.13)] 
                    transition-colors duration-150 hover:bg-neutral-700 shrink-0
                    ${isOpen ? 'mr-2' : ''}`}
        title={isOpen ? "Fermer la recherche" : "Ouvrir la recherche et filtres de date"}
        aria-expanded={isOpen}
        aria-controls="search-form-content"
      >
        <span aria-hidden="true">🔍</span>
      </button>

      {isOpen && (
        <form onSubmit={handleFormSubmit} id="search-form-content" className="flex flex-col flex-grow w-full min-w-0">
          <input
            ref={inputRef}
            type="search"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Rechercher un titre..."
            className="py-2 px-3 rounded-lg text-sm border border-neutral-300/60 text-neutral-800 bg-neutral-100/60 
                       outline-none transition-colors duration-150 w-full focus:border-neutral-600 focus:bg-white/70 placeholder-neutral-500"
            autoComplete="off"
            aria-label="Terme de recherche pour les titres d'articles"
          />
          
          <label htmlFor="dateRange" className="mt-2.5 mb-1 block text-xs text-neutral-600">
            Période: <span className="font-medium text-neutral-700">{calculateDateDisplay(dateValue)}</span>
          </label>
          <input
            id="dateRange"
            type="range"
            min="0"
            max="29" // Represents 30 positions (0 to 29)
            value={dateValue}
            onChange={handleDateInputChange}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-neutral-700 outline-none"
            title={calculateDateDisplay(dateValue)}
            aria-label="Sélecteur de plage de dates"
          />

          <div className="flex items-center mt-3">
            <button
              type="submit"
              className="text-xs font-semibold rounded-md py-1.5 px-3 bg-neutral-800 text-white 
                         border-none transition-colors duration-150 hover:bg-neutral-700 disabled:opacity-60"
              disabled={isSearching}
              aria-label="Lancer la recherche"
            >
              {isSearching ? 'Recherche...' : 'Go'}
            </button>
            {isSearching && (
              <div className="ml-2 animate-spin rounded-full h-4 w-4 border-b-2 border-neutral-900" role="status" aria-label="Chargement de la recherche"></div>
            )}
          </div>
        </form>
      )}
    </div>
  );
};
