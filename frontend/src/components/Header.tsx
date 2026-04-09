import { useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useApp } from '../context/hooks';
import './Header.css';

export function Header() {
  const { state, dispatch } = useApp();
  const comparisonCount = state.comparisonIds.length;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      dispatch({ type: 'SET_SEARCH_QUERY', payload: value });
    }, 300);
  }, [dispatch]);

  return (
    <header className="header">
      <div className="header-content">
        <Link to="/" className="logo">
          <span className="logo-icon">💻</span>
          <span className="logo-text">LaptopFind</span>
        </Link>

        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search laptops by brand, model, CPU, GPU..."
            defaultValue={state.searchQuery}
            onChange={handleInputChange}
          />
          <span className="search-icon">🔍</span>
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
