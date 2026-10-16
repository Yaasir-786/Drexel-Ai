// PreviewPanel component: rendered app sandbox preview and dynamic error handling
import React, { useState } from 'react';
import { RefreshCw, ExternalLink, Sparkles, AlertCircle, ShoppingCart } from 'lucide-react';
import Button from '../Button';

export default function PreviewPanel({ isNew = false, error = null, onFixError }) {
  const [activeCategory, setActiveCategory] = useState('Products');
  const [cartCount, setCartCount] = useState(3);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [currentError, setCurrentError] = useState(error);

  const handleRefresh = () => {
    setIsRefreshing(true);
    setTimeout(() => {
      setIsRefreshing(false);
      setCurrentError(null);
    }, 400);
  };

  const handleAddToCart = () => {
    setCartCount((prev) => prev + 1);
  };

  const handleFixWithAI = () => {
    if (onFixError) {
      onFixError();
    }
    // Fix error state at source
    setCurrentError(null);
  };

  if (isNew) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-surface text-muted">
        <Sparkles size={32} className="text-[#0099FF] mb-2" />
        <h3 className="text-base font-semibold text-ink">Your preview will appear here</h3>
        <p className="text-xs mt-1 max-w-sm">
          Describe the application you want to build in the Chat panel to generate live components.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full p-4 flex flex-col gap-3 bg-surface overflow-hidden">
      {/* Browser Preview Frame */}
      <div className="flex-1 rounded-xl border border-line bg-card flex flex-col overflow-hidden shadow-xs">
        {/* Frame Browser Bar */}
        <div className="h-10 border-b border-line bg-surface/70 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <div className="ml-3 px-3 py-1 rounded-md bg-card border border-line text-[11px] font-mono text-muted">
              https://app-preview.drexel.internal
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted">
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh preview"
              className={`p-1 rounded hover:text-ink cursor-pointer ${isRefreshing ? 'animate-spin text-[#0099FF]' : ''}`}
              title="Refresh preview"
            >
              <RefreshCw size={14} />
            </button>
            <button
              type="button"
              aria-label="Open in new window"
              className="p-1 rounded hover:text-ink cursor-pointer"
              title="Open preview"
            >
              <ExternalLink size={14} />
            </button>
          </div>
        </div>

        {/* Live Web App Preview */}
        <div className="flex-1 p-6 overflow-y-auto flex flex-col gap-6 bg-page text-ink">
          {/* App Header */}
          <div className="flex items-center justify-between pb-4 border-b border-line">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-md bg-primary-gradient" />
              <span className="font-bold text-sm tracking-tight">AcmeStore</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-muted">
              {['Products', 'Categories', 'Deals'].map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`cursor-pointer transition-colors ${
                    activeCategory === cat ? 'text-ink font-semibold' : 'hover:text-ink'
                  }`}
                >
                  {cat}
                </button>
              ))}
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[#0099FF]/10 text-[#0099FF] font-medium">
                <ShoppingCart size={12} />
                Cart ({cartCount})
              </span>
            </div>
          </div>

          {/* Hero Banner */}
          <div className="rounded-xl bg-surface border border-line p-6 flex flex-col gap-2">
            <span className="text-[11px] font-semibold text-[#0099FF] uppercase tracking-wider">
              Summer Collection
            </span>
            <h2 className="text-xl font-bold tracking-tight">Ergonomic Developer Workspaces</h2>
            <p className="text-xs text-muted max-w-md">
              Precision crafted accessories engineered for prolonged creative output.
            </p>
          </div>

          {/* Product Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {[
              { name: 'Mechanical Keypad', price: '$89.00', tag: 'Popular' },
              { name: 'OLED Ambient Lightbar', price: '$64.00', tag: 'New' },
              { name: 'Anodized Desk Mat', price: '$42.00', tag: 'Sale' },
            ].map((prod) => (
              <div
                key={prod.name}
                className="border border-line rounded-xl p-4 bg-card flex flex-col gap-3 shadow-xs hover:border-[#0099FF]/40 transition-colors"
              >
                <div className="h-28 rounded-lg bg-surface flex items-center justify-center text-xs font-mono text-muted">
                  [Product Image]
                </div>
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-xs font-semibold">{prod.name}</h3>
                    <span className="text-xs text-muted">{prod.price}</span>
                  </div>
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-surface border border-line">
                    {prod.tag}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="mt-1 w-full py-1.5 px-3 rounded-lg bg-[#0099FF] hover:bg-[#0088EE] text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  Add to cart
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Dynamic Error Bar - only rendered if there is an actual active error */}
      {currentError && (
        <div className="h-12 px-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 font-mono">
            <AlertCircle size={16} className="shrink-0" />
            <span>Preview error: {currentError}</span>
          </div>
          <Button
            variant="danger"
            onClick={handleFixWithAI}
            className="h-8 px-3 text-xs"
          >
            Fix with AI
          </Button>
        </div>
      )}
    </div>
  );
}
