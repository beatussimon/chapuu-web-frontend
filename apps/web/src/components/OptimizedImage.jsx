import { useState, useEffect, useRef } from 'react';
import { Store, ChefHat, Leaf, User, Image } from 'lucide-react';
import { resolveMediaUrl } from '../utils/imageUtils';

// Global cache for loaded URLs to prevent skeleton flashing on remount
const loadedImagesCache = new Set();

/**
 * OptimizedImage — High-performance image component with:
 * - IntersectionObserver-based lazy loading (loads when ~200px from viewport)
 * - Robust URL resolution via resolveMediaUrl
 * - Skeleton pulse placeholder while loading with category-aligned icons
 * - Smooth CSS fade-in on load via async decoding
 * - Eager mode for above-the-fold / modal images
 *
 * Props:
 *   src             - Image URL
 *   alt             - Alt text
 *   className       - Classes applied to the <img> element itself
 *   wrapperClassName - Classes applied to the outer wrapper <div>
 *   eager           - If true, skips lazy loading (for hero / above-the-fold images)
 *   placeholderType - Category of the image to show a matching pulsing icon ('store', 'product', 'ingredient', 'avatar', 'default')
 *   version         - Optional version for cache busting
 *   ...rest         - Any other props forwarded to the <img>
 */
export default function OptimizedImage({
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  eager = false,
  placeholderType = 'default',
  version = null,
  ...rest
}) {
  // Robustly resolve the source URL
  const resolvedSrc = resolveMediaUrl(src, version);

  const isInitiallyLoaded = resolvedSrc ? loadedImagesCache.has(resolvedSrc) : false;
  const [isInView, setIsInView] = useState(eager || isInitiallyLoaded);
  const [isLoaded, setIsLoaded] = useState(isInitiallyLoaded);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);
  const wrapperRef = useRef(null);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (eager || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );

    if (wrapperRef.current) {
      observer.observe(wrapperRef.current);
    }

    return () => observer.disconnect();
  }, [eager, isInView]);

  // Reset states if src or version changes
  useEffect(() => {
    const isCacheLoaded = resolvedSrc ? loadedImagesCache.has(resolvedSrc) : false;
    setIsLoaded(isCacheLoaded);
    setHasError(false);
    if (isCacheLoaded) {
      setIsInView(true);
    }
  }, [src, version, resolvedSrc]);

  // Handle case where image enters view but has no valid src
  useEffect(() => {
    if (isInView && !resolvedSrc) {
      setHasError(true);
      setIsLoaded(true); // Stop skeleton animation
    }
  }, [isInView, resolvedSrc]);

  const handleLoad = () => {
    setIsLoaded(true);
    if (resolvedSrc) {
      loadedImagesCache.add(resolvedSrc);
    }
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true); // Stop skeleton animation
  };

  return (
    <div
      ref={wrapperRef}
      className={`${wrapperClassName} relative overflow-hidden`}
    >
      {/* Skeleton pulse placeholder */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center"
          style={{ borderRadius: 'inherit' }}
        >
          {placeholderType === 'store' && <Store size={32} className="text-white/10" />}
          {placeholderType === 'product' && <ChefHat size={32} className="text-white/10" />}
          {placeholderType === 'ingredient' && <Leaf size={28} className="text-white/10" />}
          {placeholderType === 'avatar' && <User size={28} className="text-white/10" />}
          {placeholderType === 'default' && <Image size={28} className="text-white/10" />}
        </div>
      )}

      {/* Error state */}
      {hasError && (
        <div className="absolute inset-0 bg-dark-950 flex items-center justify-center">
          <Image size={24} className="text-red-500/50" />
        </div>
      )}

      {/* Actual image — only rendered once in viewport */}
      {isInView && resolvedSrc && !hasError && (
        <img
          ref={imgRef}
          src={resolvedSrc}
          alt={alt}
          decoding="async"
          onLoad={handleLoad}
          onError={handleError}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...rest}
        />
      )}
    </div>
  );
}
