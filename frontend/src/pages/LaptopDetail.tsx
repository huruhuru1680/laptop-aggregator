import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getLaptopById } from '../api/laptopApi';
import type { CanonicalLaptop } from '../types';
import { useApp } from '../context/hooks';
import './LaptopDetail.css';

export function LaptopDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { state, dispatch } = useApp();
  const [laptop, setLaptop] = useState<CanonicalLaptop | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isInComparison = laptop ? state.comparisonIds.includes(laptop.id) : false;

  useEffect(() => {
    const fetchLaptop = async () => {
      if (!id) return;
      setLoading(true);
      setError(null);
      try {
        const data = await getLaptopById(id);
        if (!data) {
          setError('Laptop not found');
        } else {
          setLaptop(data);
        }
      } catch {
        setError('Failed to load laptop details');
      } finally {
        setLoading(false);
      }
    };

    fetchLaptop();
  }, [id]);

  const handleCompareClick = () => {
    if (!laptop) return;
    if (isInComparison) {
      dispatch({ type: 'REMOVE_FROM_COMPARISON', payload: laptop.id });
    } else {
      dispatch({ type: 'ADD_TO_COMPARISON', payload: laptop.id });
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0,
    }).format(price);
  };

  const SpecRow = ({ label, value, unknown }: { label: string; value: string | null | number; unknown?: boolean }) => (
    <tr>
      <th>{label}</th>
      <td className={unknown && !value ? 'unknown' : ''}>
        {value || (unknown ? 'Spec not available' : '—')}
      </td>
    </tr>
  );

  if (loading) {
    return (
      <div className="detail-loading">
        <div className="loading-spinner"></div>
        <p>Loading laptop details...</p>
      </div>
    );
  }

  if (error || !laptop) {
    return (
      <div className="detail-error">
        <h2>Error</h2>
        <p>{error || 'Laptop not found'}</p>
        <Link to="/" className="back-link">← Back to Browse</Link>
      </div>
    );
  }

  const sourceLabel = laptop.source === 'amazon_in' ? 'Amazon.in' : 'Flipkart';

  return (
    <div className="detail-page">
      <div className="detail-container">
        <button onClick={() => navigate(-1)} className="back-btn">
          ← Back
        </button>

        <div className="detail-header">
          <div className="detail-image-section">
            <img
              src={laptop.image_url || 'https://via.placeholder.com/400x300?text=No+Image'}
              alt={laptop.model_name}
              className="detail-image"
            />
          </div>

          <div className="detail-info">
            <div className="detail-brand-row">
              <span className="detail-brand">{laptop.brand}</span>
              <span className={`detail-source source-${laptop.source}`}>{sourceLabel}</span>
            </div>
            <h1 className="detail-title">{laptop.model_name}</h1>

            {laptop.rating && (
              <div className="detail-rating">
                <span className="rating-star">★</span>
                <span className="rating-value">{laptop.rating.toFixed(1)}</span>
                {laptop.review_count && (
                  <span className="review-count">({laptop.review_count.toLocaleString()} reviews)</span>
                )}
              </div>
            )}

            <div className="detail-price-section">
              <span className="detail-price">{formatPrice(laptop.price)}</span>
              {laptop.original_price && laptop.original_price > laptop.price && (
                <>
                  <span className="detail-original-price">{formatPrice(laptop.original_price)}</span>
                  <span className="detail-discount">Save {laptop.discount_percent}%</span>
                </>
              )}
            </div>

            {laptop.availability && (
              <div className="detail-availability">
                {laptop.availability}
              </div>
            )}

            <div className="detail-actions">
              <a
                href={laptop.product_url}
                target="_blank"
                rel="noopener noreferrer"
                className="buy-btn"
              >
                View on {sourceLabel} →
              </a>
              <button
                className={`compare-btn ${isInComparison ? 'active' : ''}`}
                onClick={handleCompareClick}
              >
                {isInComparison ? '✓ In Compare List' : '+ Add to Compare'}
              </button>
            </div>

            <div className="detail-source-attribution">
              Data sourced from {sourceLabel}. Last seen: {new Date(laptop.last_seen).toLocaleDateString('en-IN')}
            </div>
          </div>
        </div>

        <div className="detail-specs">
          <h2>Specifications</h2>
          <table className="specs-table">
            <tbody>
              <SpecRow label="Processor" value={laptop.cpu} unknown />
              <SpecRow label="Graphics" value={laptop.gpu} unknown />
              <SpecRow label="RAM" value={`${laptop.ram} GB ${laptop.ram_type || ''}`} unknown />
              <SpecRow label="Storage" value={`${laptop.storage} GB ${laptop.storage_type}`} />
              <SpecRow label="Display" value={`${laptop.display_size}" ${laptop.display_resolution || ''}`} unknown />
              <SpecRow label="Refresh Rate" value={laptop.refresh_rate ? `${laptop.refresh_rate} Hz` : null} unknown />
              <SpecRow label="Panel Type" value={laptop.panel_type} unknown />
              <SpecRow label="Weight" value={laptop.weight ? `${laptop.weight} kg` : null} unknown />
              <SpecRow label="Operating System" value={laptop.os} unknown />
              <SpecRow label="Seller" value={laptop.seller} />
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
