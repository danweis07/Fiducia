import { useEffect, useRef, useState, useCallback } from "react";

interface UsePullToRefreshOptions {
  onRefresh: () => void | Promise<void>;
  threshold?: number;
}

export function usePullToRefresh({ onRefresh, threshold = 60 }: UsePullToRefreshOptions) {
  const [isRefreshing, setIsRefreshing] = useState(false);
  const startY = useRef(0);
  const pulling = useRef(false);

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    try {
      await onRefresh();
    } finally {
      setIsRefreshing(false);
    }
  }, [onRefresh]);

  useEffect(() => {
    const onTouchStart = (e: TouchEvent) => {
      if (window.scrollY === 0) {
        startY.current = e.touches[0].clientY;
        pulling.current = true;
      }
    };

    const onTouchMove = (_e: TouchEvent) => {
      if (!pulling.current) return;
      // Just track — actual trigger happens on touchend
    };

    const onTouchEnd = (e: TouchEvent) => {
      if (!pulling.current) return;
      pulling.current = false;

      const endY = e.changedTouches[0].clientY;
      const distance = endY - startY.current;

      if (distance >= threshold && window.scrollY === 0 && !isRefreshing) {
        handleRefresh();
      }
    };

    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd, { passive: true });

    return () => {
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [threshold, isRefreshing, handleRefresh]);

  return { isRefreshing };
}
