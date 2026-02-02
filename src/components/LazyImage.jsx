import React, { useState, useRef, useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function LazyImage({ src, alt, className, fallback, ...props }) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: '50px' }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, []);

  const handleLoad = () => {
    setIsLoaded(true);
  };

  const handleError = () => {
    setHasError(true);
    setIsLoaded(true);
  };

  return (
    <div ref={imgRef} className={`relative ${className || ''}`} {...props}>
      {!isInView ? (
        <div className="w-full h-full bg-gray-100 animate-pulse flex items-center justify-center">
          <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
        </div>
      ) : (
        <>
          {!isLoaded && (
            <div className="absolute inset-0 bg-gray-100 animate-pulse flex items-center justify-center">
              <Loader2 className="w-4 h-4 animate-spin text-gray-400" />
            </div>
          )}
          {hasError && fallback ? (
            fallback
          ) : (
            <img
              src={src}
              alt={alt}
              onLoad={handleLoad}
              onError={handleError}
              className={`${className || ''} ${!isLoaded ? 'opacity-0' : 'opacity-100'} transition-opacity duration-200`}
              style={{ display: hasError && !fallback ? 'none' : 'block' }}
            />
          )}
        </>
      )}
    </div>
  );
}