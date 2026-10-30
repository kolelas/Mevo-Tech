import React, { useState } from 'react';
import { Product, ProductReview } from '../types';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { X, Star, CheckCircle2, AlertCircle, ShieldCheck } from 'lucide-react';

interface ReviewModalProps {
  product: Product;
  isOpen: boolean;
  onClose: () => void;
  onReviewSubmitted: (review: ProductReview) => void;
  isVerifiedBuyer?: boolean;
}

export const ReviewModal: React.FC<ReviewModalProps> = ({
  product,
  isOpen,
  onClose,
  onReviewSubmitted,
  isVerifiedBuyer = false,
}) => {
  const { customer, openAuthModal } = useAuth();

  const [rating, setRating] = useState<number>(5);
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [authorName, setAuthorName] = useState(customer?.name || '');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!rating) {
      setErrorMessage('Please select a star rating (1 to 5 stars)');
      return;
    }

    setIsLoading(true);
    try {
      const review = await api.postProductReview(product.id, {
        authorName: authorName.trim() || customer?.name || 'Verified Customer',
        rating,
        title: title.trim(),
        comment: comment.trim(),
        userId: customer?.id,
        customerEmail: customer?.email,
      });

      onReviewSubmitted(review);
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to submit review');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-neutral-900/60 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 animate-in fade-in">
      <div className="relative bg-white rounded-2xl max-w-lg w-full shadow-2xl overflow-hidden border border-neutral-200">
        {/* Header */}
        <div className="p-5 border-b border-neutral-200 flex items-center justify-between bg-neutral-50">
          <div>
            <h3 className="text-base font-bold text-neutral-900">Post a Hardware Review</h3>
            <p className="text-xs text-neutral-500 mt-0.5">Share your experience with the South African tech community</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-200 text-neutral-500 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Product Snippet */}
        <div className="p-4 bg-purple-50/50 border-b border-purple-100 flex items-center gap-3">
          <div className="w-12 h-12 rounded-lg overflow-hidden bg-white border border-neutral-200 shrink-0">
            <img src={product.primaryImage} alt="" className="w-full h-full object-cover" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="text-[10px] font-bold text-purple-700 uppercase tracking-wider block">
              {product.brand}
            </span>
            <p className="text-xs font-bold text-neutral-900 truncate">{product.name}</p>
          </div>
          {isVerifiedBuyer && (
            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded shrink-0">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verified Buyer</span>
            </span>
          )}
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {errorMessage && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 rounded-xl text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Star Rating Picker */}
          <div>
            <label className="block font-bold text-neutral-700 mb-1.5">Overall Rating (1 - 5 Stars)</label>
            <div className="flex items-center gap-1.5">
              {[1, 2, 3, 4, 5].map((star) => {
                const isFilled = (hoverRating !== null ? hoverRating : rating) >= star;
                return (
                  <button
                    key={star}
                    type="button"
                    onMouseEnter={() => setHoverRating(star)}
                    onMouseLeave={() => setHoverRating(null)}
                    onClick={() => setRating(star)}
                    className="p-1 rounded hover:scale-110 transition-transform cursor-pointer"
                    aria-label={`${star} star`}
                  >
                    <Star
                      className={`w-7 h-7 transition-colors ${
                        isFilled ? 'fill-amber-400 text-amber-400' : 'text-neutral-300'
                      }`}
                    />
                  </button>
                );
              })}
              <span className="ml-2 font-mono font-bold text-sm text-neutral-800">
                {rating} / 5
              </span>
            </div>
          </div>

          {/* Author Name */}
          <div>
            <label className="block font-bold text-neutral-700 mb-1">Your Display Name</label>
            <input
              type="text"
              required
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="e.g. John D. or Blacque Beat"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          {/* Review Headline */}
          <div>
            <label className="block font-bold text-neutral-700 mb-1">Review Headline</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g. Exceptional display quality and rapid courier delivery"
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium"
            />
          </div>

          {/* Detailed Comments */}
          <div>
            <label className="block font-bold text-neutral-700 mb-1">Detailed Hardware Feedback</label>
            <textarea
              required
              rows={4}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Describe performance, build quality, thermals, ergonomics, or depot dispatch..."
              className="w-full px-3 py-2 bg-neutral-50 border border-neutral-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-purple-500 font-medium resize-none"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl border border-neutral-300 text-neutral-700 hover:bg-neutral-100 font-bold cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all cursor-pointer disabled:opacity-50"
            >
              {isLoading ? 'Posting...' : 'Submit Review'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
