import { Link } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import './Header.css';

export function Header() {
  const { state, dispatch } = useApp();
  const comparisonCount = state.comparisonIds.length;

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
            value={state.searchQuery}
            onChange={(e) => dispatch({ type: 'SET_SEARCH_QUERY', payload: e.target.value })}
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
