import { Link } from 'react-router-dom';
import type { CanonicalLaptop } from '../types';
import { useApp } from '../context/hooks';
import './LaptopCard.css';

interface LaptopCardProps {
  laptop: CanonicalLaptop;
}

export function LaptopCard({ laptop }: LaptopCardProps) {
  const { state, dispatch } = useApp();
  const isInComparison = state.comparisonIds.includes(laptop.id);

  const handleCompareClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
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

  const sourceLabel = laptop.source === 'amazon_in' ? 'Amazon' : 'Flipkart';
  const sourceClass = laptop.source === 'amazon_in' ? 'source-amazon' : 'source-flipkart';

  return (
    <article className="laptop-card">
      <div className="card-image-container">
        <img
          src={laptop.image_url || 'https://via.placeholder.com/300x200?text=No+Image'}
          alt={laptop.model_name}
          className="card-image"
          loading="lazy"
        />
        <button
          className={`compare-btn ${isInComparison ? 'active' : ''}`}
          onClick={handleCompareClick}
          title={isInComparison ? 'Remove from compare' : 'Add to compare'}
        >
          {isInComparison ? '✓' : '+'}
        </button>
        {laptop.discount_percent && (
          <span className="discount-badge">-{laptop.discount_percent}%</span>
        )}
      </div>

      <div className="card-content">
        <div className="card-header">
          <span className="card-brand">{laptop.brand}</span>
          <span className={`card-source ${sourceClass}`}>{sourceLabel}</span>
        </div>

        <Link to={`/laptop/${laptop.id}`} className="card-title-link">
          <h3 className="card-title">{laptop.model_name}</h3>
        </Link>

        <div className="card-specs">
          <div className="spec-row">
            <span className="spec-icon">⚡</span>
            <span className="spec-value">{laptop.cpu}</span>
          </div>
          <div className="spec-row">
            <span className="spec-icon">🎮</span>
            <span className="spec-value">{laptop.gpu}</span>
          </div>
          <div className="spec-row">
            <span className="spec-icon">💾</span>
            <span className="spec-value">{laptop.ram}GB {laptop.ram_type || 'RAM'} • {laptop.storage}GB {laptop.storage_type}</span>
          </div>
          <div className="spec-row">
            <span className="spec-icon">🖥️</span>
            <span className="spec-value">{laptop.display_size}" {laptop.display_resolution || ''} {laptop.refresh_rate ? `• ${laptop.refresh_rate}Hz` : ''}</span>
          </div>
        </div>

        <div className="card-footer">
          <div className="card-price">
            <span className="price-current">{formatPrice(laptop.price)}</span>
            {laptop.original_price && laptop.original_price > laptop.price && (
              <span className="price-original">{formatPrice(laptop.original_price)}</span>
            )}
          </div>
          {laptop.rating && (
            <div className="card-rating">
              <span className="rating-star">★</span>
              <span className="rating-value">{laptop.rating.toFixed(1)}</span>
              {laptop.review_count && (
                <span className="review-count">({laptop.review_count.toLocaleString()})</span>
              )}
            </div>
          )}
        </div>

        <a
          href={laptop.product_url}
          target="_blank"
          rel="noopener noreferrer"
          className="card-link"
        >
          View on {sourceLabel} →
        </a>
      </div>
    </article>
  );
}
