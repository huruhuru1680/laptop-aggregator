import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getLaptopsByIds } from '../api/laptopApi';
import type { CanonicalLaptop } from '../types';
import { useApp } from '../context/hooks';
import './Comparison.css';

export function Comparison() {
  const { state, dispatch } = useApp();
  const [searchParams] = useSearchParams();
  const [laptops, setLaptops] = useState<CanonicalLaptop[]>([]);
  const [loading, setLoading] = useState(true);
  const [shareUrl, setShareUrl] = useState('');

  useEffect(() => {
    const fetchLaptops = async () => {
      if (state.comparisonIds.length === 0) {
        setLaptops([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const data = await getLaptopsByIds(state.comparisonIds);
        setLaptops(data);
      } catch {
        console.error('Failed to load laptops for comparison');
      } finally {
        setLoading(false);
      }
    };

    fetchLaptops();
  }, [state.comparisonIds]);

  useEffect(() => {
    const url = `${window.location.origin}/compare?ids=${state.comparisonIds.join(',')}`;
    setShareUrl(url);
  }, [state.comparisonIds]);

  useEffect(() => {
    const ids = searchParams.get('ids');
    if (ids) {
      const idArray = ids.split(',').filter(id => id.trim());
      idArray.forEach(id => {
        if (!state.comparisonIds.includes(id)) {
          dispatch({ type: 'ADD_TO_COMPARISON', payload: id });
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleShare = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      alert('Comparison URL copied to clipboard!');
    } catch {
      prompt('Copy this URL:', shareUrl);
    }
  };

  const handleRemove = (id: string) => {
    dispatch({ type: 'REMOVE_FROM_COMPARISON', payload: id });
  };

  const handleClear = () => {
    dispatch({ type: 'CLEAR_COMPARISON' });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const specs = [
    { key: 'price', label: 'Price' },
    { key: 'cpu', label: 'Processor' },
    { key: 'gpu', label: 'Graphics' },
    { key: 'ram', label: 'RAM' },
    { key: 'ram_type', label: 'RAM Type' },
    { key: 'storage', label: 'Storage' },
    { key: 'storage_type', label: 'Storage Type' },
    { key: 'display_size', label: 'Display Size' },
    { key: 'display_resolution', label: 'Resolution' },
    { key: 'refresh_rate', label: 'Refresh Rate' },
    { key: 'panel_type', label: 'Panel Type' },
    { key: 'weight', label: 'Weight' },
    { key: 'os', label: 'Operating System' },
    { key: 'rating', label: 'Rating' },
    { key: 'review_count', label: 'Reviews' },
    { key: 'availability', label: 'Availability' },
    { key: 'source', label: 'Source' },
  ];

  const getSpecValue = (laptop: CanonicalLaptop, key: string): string | number | null => {
    const value = laptop[key as keyof CanonicalLaptop];
    if (value === null || value === undefined) return null;

    switch (key) {
      case 'ram':
        return `${value} GB`;
      case 'storage':
        return `${value} GB`;
      case 'refresh_rate':
        return `${value} Hz`;
      case 'weight':
        return `${value} kg`;
      case 'price':
        return formatPrice(value as number);
      case 'rating':
        return (value as number).toFixed(1);
      case 'review_count':
        return (value as number).toLocaleString();
      case 'source':
        return laptop.source === 'amazon_in' ? 'Amazon.in' : 'Flipkart';
      default:
        return value;
    }
  };

  const bestValues = (() => {
    const best: Record<string, number | string | null> = {};
    if (laptops.length === 0) return best;
    best.price = Math.min(...laptops.map(l => l.price));
    const weights = laptops.filter(l => l.weight !== null).map(l => l.weight as number);
    if (weights.length > 0) best.weight = Math.min(...weights);
    const rams = laptops.filter(l => l.ram !== null).map(l => l.ram);
    if (rams.length > 0) best.ram = Math.max(...rams);
    const storages = laptops.filter(l => l.storage !== null).map(l => l.storage);
    if (storages.length > 0) best.storage = Math.max(...storages);
    const rates = laptops.filter(l => l.refresh_rate !== null).map(l => l.refresh_rate as number);
    if (rates.length > 0) best.refresh_rate = Math.max(...rates);
    const ratings = laptops.filter(l => l.rating !== null).map(l => l.rating as number);
    if (ratings.length > 0) best.rating = Math.max(...ratings);
    return best;
  })();

  const isBest = (laptop: CanonicalLaptop, key: string): boolean => {
    const bestVal = bestValues[key];
    if (bestVal === undefined || bestVal === null) return false;
    if (key === 'price' || key === 'weight') {
      return laptop[key as keyof CanonicalLaptop] === bestVal;
    }
    if (['ram', 'storage', 'refresh_rate', 'rating'].includes(key)) {
      return laptop[key as keyof CanonicalLaptop] === bestVal;
    }
    return false;
  };

  const getPercentageDiff = (laptop: CanonicalLaptop, key: string): number | null => {
    const bestVal = bestValues[key];
    const laptopVal = laptop[key as keyof CanonicalLaptop];
    if (bestVal === undefined || bestVal === null || laptopVal === null || laptopVal === undefined) return null;
    if (key === 'price' || key === 'weight') {
      const diff = ((laptopVal as number) - (bestVal as number)) / (bestVal as number) * 100;
      return Math.round(diff);
    }
    if (['ram', 'storage', 'refresh_rate', 'rating'].includes(key)) {
      const diff = ((bestVal as number) - (laptopVal as number)) / (bestVal as number) * 100;
      return Math.round(diff);
    }
    return null;
  };

  const hasDifferences = (key: string): boolean => {
    const values = laptops.map(l => {
      const v = l[key as keyof CanonicalLaptop];
      return v === null || v === undefined ? null : String(v);
    });
    const uniqueValues = new Set(values.filter(v => v !== null));
    return uniqueValues.size > 1;
  };

  if (loading) {
    return (
      <div className="comparison-loading">
        <div className="loading-spinner"></div>
        <p>Loading comparison...</p>
      </div>
    );
  }

  if (laptops.length === 0) {
    return (
      <div className="comparison-empty">
        <div className="empty-icon">⚖️</div>
        <h2>No Laptops to Compare</h2>
        <p>Add laptops from the browse page to compare them side by side</p>
        <Link to="/" className="browse-link">← Browse Laptops</Link>
      </div>
    );
  }

  return (
    <div className="comparison-page">
      <div className="comparison-header">
        <h1>Compare Laptops</h1>
        <div className="comparison-actions">
          <button onClick={handleShare} className="share-btn">
            🔗 Share Comparison
          </button>
          <button onClick={handleClear} className="clear-btn">
            Clear All
          </button>
        </div>
      </div>

      <div className="comparison-table-wrapper">
        <table className="comparison-table">
          <thead>
            <tr>
              <th className="spec-header">Specification</th>
              {laptops.map(laptop => (
                <th key={laptop.id} className="laptop-header">
                  <Link to={`/laptop/${laptop.id}`} className="laptop-link">
                    <img
                      src={laptop.image_url || 'https://via.placeholder.com/100x75?text=No+Image'}
                      alt={laptop.model_name}
                      className="laptop-thumb"
                    />
                    <div className="laptop-header-info">
                      <span className="laptop-brand">{laptop.brand}</span>
                      <span className="laptop-name">{laptop.model_name}</span>
                    </div>
                  </Link>
                  <button
                    className="remove-btn"
                    onClick={() => handleRemove(laptop.id)}
                  >
                    ×
                  </button>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {specs.map(spec => {
              const differs = hasDifferences(spec.key);
              return (
              <tr key={spec.key} className={differs ? 'row-differs' : ''}>
                <th className="spec-label">
                  {spec.label}
                  {differs && <span className="diff-indicator" title="Values differ across laptops">≠</span>}
                </th>
                {laptops.map(laptop => {
                  const value = getSpecValue(laptop, spec.key);
                  const best = isBest(laptop, spec.key);
                  const pctDiff = differs && !best ? getPercentageDiff(laptop, spec.key) : null;
                  return (
                    <td
                      key={laptop.id}
                      className={`spec-value ${best ? 'best' : ''} ${differs ? 'differs' : ''}`}
                    >
                      {value || (spec.key !== 'price' ? '—' : formatPrice(0))}
                      {best && spec.key !== 'price' && <span className="best-badge">★ Best</span>}
                      {pctDiff !== null && pctDiff > 0 && (
                        <span className="pct-diff pct-worse">+{pctDiff}%</span>
                      )}
                      {pctDiff !== null && pctDiff < 0 && (
                        <span className="pct-diff pct-better">{pctDiff}%</span>
                      )}
                    </td>
                  );
                })}
              </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="comparison-footer">
        <p className="share-url">
          Share this comparison: <input type="text" readOnly value={shareUrl} onClick={e => (e.target as HTMLInputElement).select()} />
        </p>
      </div>
    </div>
  );
}
