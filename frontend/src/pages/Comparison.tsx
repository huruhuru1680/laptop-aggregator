import { useState, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { getLaptopsByIds } from '../api/laptopApi';
import type { CanonicalLaptop } from '../types';
import { useApp } from '../context/AppContext';
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
    { key: 'price', label: 'Price' },
    { key: 'rating', label: 'Rating' },
    { key: 'review_count', label: 'Reviews' },
    { key: 'availability', label: 'Availability' },
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
      default:
        return value;
    }
  };

  const findBest = (key: string): number | null => {
    if (key === 'price') {
      return Math.min(...laptops.map(l => l.price));
    }
    if (key === 'weight') {
      return Math.min(...laptops.filter(l => l.weight !== null).map(l => l.weight as number));
    }
    if (['ram', 'storage', 'refresh_rate', 'rating'].includes(key)) {
      const numericLaptops = laptops.filter(l => l[key as keyof CanonicalLaptop] !== null);
      if (numericLaptops.length === 0) return null;
      return Math.max(...numericLaptops.map(l => l[key as keyof CanonicalLaptop] as number));
    }
    return null;
  };

  const isBest = (laptop: CanonicalLaptop, key: string): boolean => {
    const best = findBest(key);
    if (best === null) return false;
    const value = laptop[key as keyof CanonicalLaptop];
    if (key === 'price' || key === 'weight') {
      return value === best;
    }
    return value === best;
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
            {specs.map(spec => (
              <tr key={spec.key}>
                <th className="spec-label">{spec.label}</th>
                {laptops.map(laptop => {
                  const value = getSpecValue(laptop, spec.key);
                  const best = isBest(laptop, spec.key);
                  return (
                    <td
                      key={laptop.id}
                      className={`spec-value ${best ? 'best' : ''}`}
                    >
                      {value || (spec.key !== 'price' ? '—' : formatPrice(0))}
                      {best && spec.key !== 'price' && <span className="best-badge">★ Best</span>}
                    </td>
                  );
                })}
              </tr>
            ))}
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
