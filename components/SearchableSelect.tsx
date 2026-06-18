import React, { useState, useEffect, useRef } from 'react';

interface Option {
  value: string;
  label: string;
}

interface SearchableSelectProps {
  options: Option[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Search...',
  className = ''
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const containerRef = useRef<HTMLDivElement>(null);

  // Find currently selected label
  const selectedOption = options.find(opt => opt.value === value);

  // Reset search when opening/closing
  useEffect(() => {
    if (isOpen) {
      setSearch('');
    }
  }, [isOpen]);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredOptions = options.filter(opt =>
    opt.label.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      {/* Input / Display Field */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-6 py-3.5 rounded-2xl border-2 border-gray-100 outline-none text-lg font-bold bg-white cursor-pointer flex justify-between items-center shadow-sm select-none hover:border-indigo-200 transition-all"
      >
        {isOpen ? (
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Type to search..."
            onClick={(e) => e.stopPropagation()}
            className="w-full bg-transparent outline-none border-none text-lg font-bold text-gray-800"
            autoFocus
          />
        ) : (
          <span className="text-gray-800">{selectedOption ? selectedOption.label : placeholder}</span>
        )}
        <span className="text-gray-400 ml-2">
          {isOpen ? <i className="fas fa-chevron-up text-sm"></i> : <i className="fas fa-chevron-down text-sm"></i>}
        </span>
      </div>

      {/* Dropdown Options */}
      {isOpen && (
        <div className="absolute z-50 left-0 right-0 mt-2 bg-white border border-gray-100 rounded-2xl shadow-xl max-h-60 overflow-y-auto custom-scrollbar overflow-x-hidden">
          {filteredOptions.length === 0 ? (
            <div className="px-6 py-4 text-sm text-gray-400">No options found</div>
          ) : (
            filteredOptions.map((opt) => (
              <div
                key={opt.value}
                onClick={() => {
                  onChange(opt.value);
                  setIsOpen(false);
                }}
                className={`px-6 py-3.5 text-sm font-bold cursor-pointer transition-colors ${
                  opt.value === value
                    ? 'bg-indigo-50 text-indigo-600'
                    : 'text-gray-700 hover:bg-slate-50'
                }`}
              >
                {opt.label}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
