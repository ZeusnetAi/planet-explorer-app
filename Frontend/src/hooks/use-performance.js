import { useCallback, useRef, useEffect } from 'react';

/**
 * Hook para debounce de funções
 * Útil para otimizar chamadas de API e eventos de input
 */
export const useDebounce = (callback, delay) => {
  const timeoutRef = useRef(null);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    timeoutRef.current = setTimeout(() => {
      callback(...args);
    }, delay);
  }, [callback, delay]);

  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * Hook para throttle de funções
 * Útil para limitar a frequência de execução de funções
 */
export const useThrottle = (callback, delay) => {
  const lastRun = useRef(Date.now());

  const throttledCallback = useCallback((...args) => {
    if (Date.now() - lastRun.current >= delay) {
      callback(...args);
      lastRun.current = Date.now();
    }
  }, [callback, delay]);

  return throttledCallback;
};

/**
 * Hook para lazy loading de imagens
 * Otimiza o carregamento de imagens usando Intersection Observer
 */
export const useLazyImage = (src, options = {}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(false);
  const [error, setError] = useState(null);
  const imgRef = useRef(null);

  const { threshold = 0.1, rootMargin = '50px' } = options;

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      { threshold, rootMargin }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [threshold, rootMargin]);

  useEffect(() => {
    if (!isInView || !src) return;

    const img = new Image();
    
    img.onload = () => {
      setIsLoaded(true);
      setError(null);
    };
    
    img.onerror = () => {
      setError(new Error('Falha ao carregar imagem'));
      setIsLoaded(false);
    };
    
    img.src = src;
  }, [src, isInView]);

  return {
    ref: imgRef,
    isLoaded,
    isInView,
    error,
    src: isInView ? src : null
  };
};

/**
 * Hook para memoização de listas grandes
 * Otimiza a renderização de listas com virtualização
 */
export const useVirtualizedList = (items, itemHeight, containerHeight, overscan = 5) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef(null);

  const visibleRange = useMemo(() => {
    const start = Math.floor(scrollTop / itemHeight);
    const end = Math.min(
      start + Math.ceil(containerHeight / itemHeight) + overscan,
      items.length
    );
    
    return {
      start: Math.max(0, start - overscan),
      end
    };
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length]);

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.start, visibleRange.end);
  }, [items, visibleRange]);

  const totalHeight = items.length * itemHeight;
  const offsetY = visibleRange.start * itemHeight;

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop);
  }, []);

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    handleScroll
  };
};

/**
 * Hook para otimização de re-renderizações
 * Compara objetos profundamente para evitar re-renderizações desnecessárias
 */
export const useDeepCompareMemo = (value, deps) => {
  const ref = useRef();

  if (!ref.current || !isEqual(value, ref.current)) {
    ref.current = value;
  }

  return useMemo(() => ref.current, [ref.current]);
};

/**
 * Hook para cache de resultados de API
 * Evita chamadas duplicadas para a mesma API
 */
export const useApiCache = () => {
  const cache = useRef(new Map());
  const pendingRequests = useRef(new Map());

  const getCachedData = useCallback((key) => {
    const cached = cache.current.get(key);
    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      return cached.data;
    }
    return null;
  }, []);

  const setCachedData = useCallback((key, data, ttl = 5 * 60 * 1000) => {
    cache.current.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }, []);

  const isPending = useCallback((key) => {
    return pendingRequests.current.has(key);
  }, []);

  const setPending = useCallback((key, promise) => {
    pendingRequests.current.set(key, promise);
    promise.finally(() => {
      pendingRequests.current.delete(key);
    });
  }, []);

  return {
    getCachedData,
    setCachedData,
    isPending,
    setPending
  };
};

// Função auxiliar para comparação profunda
function isEqual(a, b) {
  if (a === b) return true;
  if (a == null || b == null) return false;
  if (typeof a !== typeof b) return false;
  
  if (typeof a === 'object') {
    const keysA = Object.keys(a);
    const keysB = Object.keys(b);
    
    if (keysA.length !== keysB.length) return false;
    
    for (const key of keysA) {
      if (!keysB.includes(key) || !isEqual(a[key], b[key])) {
        return false;
      }
    }
    
    return true;
  }
  
  return false;
}

// Import necessário para useState e useMemo
import { useState, useMemo } from 'react'; 