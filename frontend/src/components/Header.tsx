import { useRef, useCallback, useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/hooks';
import { searchSuggestions } from '../api/laptopApi';
import type { SearchSuggestion } from '../api/laptopApi';
import './Header.css';

export function Header() {
  const { state, dispatch } = useApp();
  const comparisonCount = state.comparisonIds.length;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [suggestions, setSuggestions] = useState<SearchSuggestion[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(state.searchQuery);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setInputValue(value);
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    if (value.length >= 2) {
      debounceRef.current = setTimeout(async () => {
        const results = await searchSuggestions(value);
        setSuggestions(results);
        setShowSuggestions(true);
      }, 200);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: value });
    }, 300);
  }, [dispatch]);

  const handleSuggestionClick = (suggestion: SearchSuggestion) => {
    setInputValue(suggestion.model_name);
    setShowSuggestions(false);
    dispatch({ type: 'SET_SEARCH_QUERY', payload: suggestion.model_name });
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (suggestionsRef.current && !suggestionsRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">💻</span>
          <span className="logo-text">LaptopFind</span>
        </Link>

        <div className="search-container" ref={suggestionsRef}>
          <input
            type="text"
            className="search-input"
            placeholder="Search laptops by brand, model, CPU, GPU..."
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => inputValue.length >= 2 && setShowSuggestions(true)}
          />
          <span className="search-icon">🔍</span>
          {showSuggestions && suggestions.length > 0 && (
            <div className="suggestions-dropdown">
              {suggestions.map(s => (
                <button
                  key={s.id}
                  className="suggestion-item"
                  onClick={() => handleSuggestionClick(s)}
                >
                  <span className="suggestion-brand">{s.brand}</span>
                  <span className="suggestion-model">{s.model_name}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <nav className="nav">
          <Link to="/" className="nav-link">Browse</Link>
          <Link to="/compare" className="nav-link">
            Compare
            {comparisonCount > 0 && <span className="comparison-badge">{comparisonCount}</span>}
          </Link>
        </nav>
      </div>
    </header>
  );
}
