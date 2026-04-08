import { useApp } from '../context/AppContext';
import type { SearchResult } from '../types';
import './FilterSidebar.css';

interface FilterSidebarProps {
  facets: SearchResult['facets'];
  onClose?: () => void;
}

export function FilterSidebar({ facets, onClose }: FilterSidebarProps) {
  const { state, dispatch } = useApp();
  const { filters } = state;

  const priceMarks = [
    { value: 0, label: '₹0' },
    { value: 50000, label: '₹50K' },
    { value: 100000, label: '₹1L' },
    { value: 150000, label: '₹1.5L' },
    { value: 200000, label: '₹2L+' },
  ];

  const handleBrandChange = (brand: string) => {
    const newBrands = filters.brands.includes(brand)
      ? filters.brands.filter(b => b !== brand)
      : [...filters.brands, brand];
    dispatch({ type: 'SET_FILTERS', payload: { brands: newBrands } });
  };

  const handleCpuBrandChange = (cpuBrand: string) => {
    const newCpuBrands = filters.cpuBrands.includes(cpuBrand)
      ? filters.cpuBrands.filter(c => c !== cpuBrand)
      : [...filters.cpuBrands, cpuBrand];
    dispatch({ type: 'SET_FILTERS', payload: { cpuBrands: newCpuBrands } });
  };

  const handleGpuBrandChange = (gpuBrand: string) => {
    const newGpuBrands = filters.gpuBrands.includes(gpuBrand)
      ? filters.gpuBrands.filter(g => g !== gpuBrand)
      : [...filters.gpuBrands, gpuBrand];
    dispatch({ type: 'SET_FILTERS', payload: { gpuBrands: newGpuBrands } });
  };

  const handleRamChange = (ram: number) => {
    const newRam = filters.ram.includes(ram)
      ? filters.ram.filter(r => r !== ram)
      : [...filters.ram, ram];
    dispatch({ type: 'SET_FILTERS', payload: { ram: newRam } });
  };

  const handleRefreshRateChange = (rate: number) => {
    const newRates = filters.refreshRates.includes(rate)
      ? filters.refreshRates.filter(r => r !== rate)
      : [...filters.refreshRates, rate];
    dispatch({ type: 'SET_FILTERS', payload: { refreshRates: newRates } });
  };

  const handleSourceChange = (source: 'amazon_in' | 'flipkart') => {
    const newSources = filters.sources.includes(source)
      ? filters.sources.filter(s => s !== source)
      : [...filters.sources, source];
    dispatch({ type: 'SET_FILTERS', payload: { sources: newSources } });
  };

  const handlePriceChange = (index: number, value: number) => {
    const newRange: [number, number] = [...filters.priceRange] as [number, number];
    newRange[index] = value;
    dispatch({ type: 'SET_FILTERS', payload: { priceRange: newRange } });
  };

  const activeFilterCount =
    filters.brands.length +
    filters.cpuBrands.length +
    filters.gpuBrands.length +
    filters.ram.length +
    filters.refreshRates.length +
    filters.sources.length;

  return (
    <aside className="filter-sidebar">
      <div className="filter-header">
        <h2>Filters</h2>
        {activeFilterCount > 0 && (
          <button
            className="reset-btn"
            onClick={() => dispatch({ type: 'RESET_FILTERS' })}
          >
            Reset ({activeFilterCount})
          </button>
        )}
        {onClose && (
          <button className="close-btn" onClick={onClose}>×</button>
        )}
      </div>

      <div className="filter-section">
        <h3>Brand</h3>
        <div className="filter-options">
          {facets.brands.map(brand => (
            <label key={brand.value} className="filter-option">
              <input
                type="checkbox"
                checked={filters.brands.includes(brand.value)}
                onChange={() => handleBrandChange(brand.value)}
              />
              <span className="option-label">{brand.value}</span>
              <span className="option-count">{brand.count}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h3>Processor Brand</h3>
        <div className="filter-options">
          {facets.cpuBrands.map(cpu => (
            <label key={cpu.value} className="filter-option">
              <input
                type="checkbox"
                checked={filters.cpuBrands.includes(cpu.value)}
                onChange={() => handleCpuBrandChange(cpu.value)}
              />
              <span className="option-label">{cpu.value}</span>
              <span className="option-count">{cpu.count}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h3>Graphics</h3>
        <div className="filter-options">
          {facets.gpuBrands.map(gpu => (
            <label key={gpu.value} className="filter-option">
              <input
                type="checkbox"
                checked={filters.gpuBrands.includes(gpu.value)}
                onChange={() => handleGpuBrandChange(gpu.value)}
              />
              <span className="option-label">{gpu.value}</span>
              <span className="option-count">{gpu.count}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h3>RAM</h3>
        <div className="filter-options">
          {facets.ram.map(ram => (
            <label key={ram.value} className="filter-option">
              <input
                type="checkbox"
                checked={filters.ram.includes(ram.value)}
                onChange={() => handleRamChange(ram.value)}
              />
              <span className="option-label">{ram.value} GB</span>
              <span className="option-count">{ram.count}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h3>Refresh Rate</h3>
        <div className="filter-options">
          {facets.refreshRates.map(rate => (
            <label key={rate.value} className="filter-option">
              <input
                type="checkbox"
                checked={filters.refreshRates.includes(rate.value)}
                onChange={() => handleRefreshRateChange(rate.value)}
              />
              <span className="option-label">{rate.value} Hz</span>
              <span className="option-count">{rate.count}</span>
            </label>
          ))}
        </div>
      </div>

      <div className="filter-section">
        <h3>Price Range</h3>
        <div className="price-range">
          <div className="price-inputs">
            <input
              type="number"
              className="price-input"
              value={filters.priceRange[0]}
              onChange={(e) => handlePriceChange(0, parseInt(e.target.value) || 0)}
              placeholder="Min"
            />
            <span className="price-separator">—</span>
            <input
              type="number"
              className="price-input"
              value={filters.priceRange[1]}
              onChange={(e) => handlePriceChange(1, parseInt(e.target.value) || 500000)}
              placeholder="Max"
            />
          </div>
          <div className="price-marks">
            {priceMarks.map(mark => (
              <span key={mark.value} className="price-mark">{mark.label}</span>
            ))}
          </div>
        </div>
      </div>

      <div className="filter-section">
        <h3>Source</h3>
        <div className="filter-options">
          <label className="filter-option">
            <input
              type="checkbox"
              checked={filters.sources.includes('amazon_in')}
              onChange={() => handleSourceChange('amazon_in')}
            />
            <span className="option-label">Amazon.in</span>
            <span className="option-count">{facets.sources.find(s => s.value === 'amazon_in')?.count || 0}</span>
          </label>
          <label className="filter-option">
            <input
              type="checkbox"
              checked={filters.sources.includes('flipkart')}
              onChange={() => handleSourceChange('flipkart')}
            />
            <span className="option-label">Flipkart</span>
            <span className="option-count">{facets.sources.find(s => s.value === 'flipkart')?.count || 0}</span>
          </label>
        </div>
      </div>
    </aside>
  );
}
