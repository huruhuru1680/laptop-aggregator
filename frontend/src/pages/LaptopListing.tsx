import { useState, useEffect } from 'react';
import { useApp } from '../context/hooks';
import { FilterSidebar } from '../components/FilterSidebar';
import { LaptopCard } from '../components/LaptopCard';
import { searchLaptops } from '../api/laptopApi';
import type { SearchResult, SortOption } from '../types';
import './LaptopListing.css';

export function LaptopListing() {
  const { state, dispatch } = useApp();
  const [result, setResult] = useState<SearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const pageSize = 12;

  useEffect(() => {
    const fetchLaptops = async () => {
      setLoading(true);
      setError(null);
      try {
        const searchResult = await searchLaptops(
          state.searchQuery,
          state.filters,
          state.sortOption as SortOption,
          page,
          pageSize
        );
        setResult(searchResult);
      } catch {
        setError('Failed to load laptops. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchLaptops();
  }, [state.searchQuery, state.filters, state.sortOption, page]);

  const totalPages = result ? Math.ceil(result.total / pageSize) : 0;

  const activeFilterCount =
    state.filters.brands.length +
    state.filters.cpuBrands.length +
    state.filters.gpuBrands.length +
    state.filters.ram.length +
    state.filters.refreshRates.length +
    state.filters.sources.length;

  return (
    <div className="listing-page">
      <div className="listing-layout">
        {result && (
          <FilterSidebar
            facets={result.facets}
            onClose={showMobileFilters ? () => setShowMobileFilters(false) : undefined}
          />
        )}

        <main className="listing-main">
          <div className="listing-header">
            <div className="listing-info">
              <button
                className="mobile-filter-btn"
                onClick={() => setShowMobileFilters(true)}
              >
                Filters {activeFilterCount > 0 && `(${activeFilterCount})`}
              </button>
              {result && (
                <span className="result-count">
                  {result.total} laptops found
                </span>
              )}
            </div>

            <div className="listing-controls">
              <select
                className="sort-select"
                value={state.sortOption}
                onChange={(e) => {
                  dispatch({ type: 'SET_SORT', payload: e.target.value });
                  setPage(1);
                }}
              >
                <option value="price_asc">Price: Low to High</option>
                <option value="price_desc">Price: High to Low</option>
                <option value="rating_desc">Highest Rated</option>
                <option value="review_count_desc">Most Reviewed</option>
                <option value="name_asc">Name: A to Z</option>
              </select>
            </div>
          </div>

          {loading && (
            <div className="listing-loading">
              <div className="loading-spinner"></div>
              <p>Loading laptops...</p>
            </div>
          )}

          {error && (
            <div className="listing-error">
              <p>{error}</p>
              <button onClick={() => setPage(1)} className="retry-btn">
                Try Again
              </button>
            </div>
          )}

          {!loading && !error && result && result.laptops.length === 0 && (
            <div className="listing-empty">
              <div className="empty-icon">🔍</div>
              <h3>No laptops found</h3>
              <p>Try adjusting your filters or search query</p>
              <button
                onClick={() => dispatch({ type: 'RESET_FILTERS' })}
                className="reset-filters-btn"
              >
                Reset Filters
              </button>
            </div>
          )}

          {!loading && !error && result && result.laptops.length > 0 && (
            <>
              <div className="laptop-grid">
                {result.laptops.map(laptop => (
                  <LaptopCard key={laptop.id} laptop={laptop} />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="pagination">
                  <button
                    className="page-btn"
                    disabled={page === 1}
                    onClick={() => setPage(p => p - 1)}
                  >
                    ← Previous
                  </button>
                  <span className="page-info">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    className="page-btn"
                    disabled={page === totalPages}
                    onClick={() => setPage(p => p + 1)}
                  >
                    Next →
                  </button>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {showMobileFilters && result && (
        <div className="mobile-filter-overlay" onClick={() => setShowMobileFilters(false)}>
          <div className="mobile-filter-panel" onClick={e => e.stopPropagation()}>
            <FilterSidebar facets={result.facets} onClose={() => setShowMobileFilters(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
