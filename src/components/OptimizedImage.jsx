import { useState, useEffect, useRef } from 'react';
import { Store, ChefHat, Leaf, User, Image } from 'lucide-react';

/**
 * OptimizedImage — High-performance image component with:
 * - IntersectionObserver-based lazy loading (loads when ~200px from viewport)
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
 *   ...rest         - Any other props forwarded to the <img>
 */
export default function OptimizedImage({
  src,
  alt = '',
  className = '',
  wrapperClassName = '',
  eager = false,
  placeholderType = 'default',
  ...rest
}) {
  const [isInView, setIsInView] = useState(eager);
  const [isLoaded, setIsLoaded] = useState(false);
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

  const handleLoad = () => {
    setIsLoaded(true);
  };

  return (
    <div
      ref={wrapperRef}
      className={`${wrapperClassName} relative overflow-hidden`}
    >
      {/* Skeleton pulse placeholder */}
      {!isLoaded && (
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

      {/* Actual image — only rendered once in viewport */}
      {isInView && src && (
        <img
          ref={imgRef}
          src={src}
          alt={alt}
          decoding="async"
          onLoad={handleLoad}
          className={`${className} transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          {...rest}
        />
      )}
    </div>
  );
}

