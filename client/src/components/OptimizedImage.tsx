import { useState, useRef, useEffect, useCallback, type ImgHTMLAttributes } from 'react';

const PLACEHOLDER_BLUR =
  'data:image/svg+xml;base64,' +
  btoa(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
      <filter id="b" color-interpolation-filters="sRGB">
        <feGaussianBlur stdDeviation="20"/>
      </filter>
      <rect width="100%" height="100%" fill="#1a1a2e" filter="url(#b)"/>
    </svg>`
  );

const FALLBACK_IMAGE = '/assets/images/product-images/01.webp';

/** Responsive breakpoints for srcset generation */
const SRCSET_WIDTHS = [320, 480, 640, 768, 1024, 1280];

/**
 * Check if a URL points to an external (absolute) image or a local asset.
 * External images can't be resized client-side, so srcset is skipped.
 */
function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://');
}

/**
 * Generate a WebP source URL. If the image is already .webp, return as-is.
 * For local assets, swap the extension to .webp for browsers that support it.
 */
function toWebP(url: string): string {
  if (url.endsWith('.webp')) return url;
  return url.replace(/\.(jpe?g|png|gif)$/i, '.webp');
}

/**
 * Build a srcset string for responsive images.
 * Only works for local images where width-based variants might exist.
 */
function buildSrcSet(url: string): string | undefined {
  if (isExternalUrl(url)) return undefined;
  // For local images, let the browser pick the best size via width descriptors
  return SRCSET_WIDTHS.map((w) => `${url} ${w}w`).join(', ');
}

interface OptimizedImageProps extends Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'onError'> {
  src: string;
  alt: string;
  /** Disable lazy loading (for above-the-fold images like hero) */
  eager?: boolean;
  /** Custom fallback image URL */
  fallback?: string;
  /** Custom blur placeholder color (CSS value) */
  placeholderColor?: string;
  /** Responsive sizes attribute */
  sizes?: string;
  /** Aspect ratio for the placeholder container */
  aspectRatio?: string;
}

export default function OptimizedImage({
  src,
  alt,
  eager = false,
  fallback = FALLBACK_IMAGE,
  placeholderColor,
  sizes,
  aspectRatio,
  className = '',
  style,
  ...rest
}: OptimizedImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(eager);
  const [currentSrc, setCurrentSrc] = useState(src);
  const [hasFailed, setHasFailed] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // IntersectionObserver for lazy loading
  useEffect(() => {
    if (eager || isInView) return;

    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px 0px' } // Start loading 200px before visible
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [eager, isInView]);

  // Reset state when src changes
  useEffect(() => {
    setCurrentSrc(src);
    setIsLoaded(false);
    setHasFailed(false);
  }, [src]);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    if (!hasFailed) {
      setHasFailed(true);
      setCurrentSrc(fallback);
    }
  };

  // Handle cached images: if the browser loaded from cache before React
  // attached onLoad, the event never fires and the image stays opacity-0.
  const imgRef = useCallback((img: HTMLImageElement | null) => {
    if (img?.complete && img.naturalWidth > 0 && !isLoaded) {
      setIsLoaded(true);
    }
  }, [isLoaded]);

  const webpSrc = toWebP(currentSrc);
  // Skip WebP <source> for external URLs — we can't guarantee a .webp variant
  // exists on the remote server, and a 404 adds a wasted round-trip before
  // the browser falls back to the original format.
  const hasWebPAlternative = !isExternalUrl(currentSrc) && webpSrc !== currentSrc;
  const srcSet = buildSrcSet(currentSrc);

  const placeholderBg = placeholderColor
    ? `linear-gradient(135deg, ${placeholderColor}, transparent)`
    : undefined;

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio,
        ...style,
      }}
    >
      {/* Blur placeholder */}
      <img
        src={PLACEHOLDER_BLUR}
        alt=""
        aria-hidden="true"
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-500 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
        style={placeholderBg ? { background: placeholderBg } : undefined}
      />

      {/* Actual image - only rendered when in viewport */}
      {isInView && (
        <picture className="absolute inset-0 w-full h-full">
          {/* WebP source for browsers that support it */}
          {hasWebPAlternative && (
            <source srcSet={webpSrc} type="image/webp" />
          )}

          <img
            ref={imgRef}
            src={currentSrc}
            srcSet={srcSet}
            sizes={sizes}
            alt={alt}
            loading={eager ? 'eager' : 'lazy'}
            decoding={eager ? 'sync' : 'async'}
            fetchPriority={eager ? 'high' : undefined}
            onLoad={handleLoad}
            onError={handleError}
            className={`w-full h-full object-cover transition-opacity duration-500 ${
              isLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            {...rest}
          />
        </picture>
      )}
    </div>
  );
}
