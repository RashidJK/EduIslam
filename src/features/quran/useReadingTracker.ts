import { useEffect, useLayoutEffect, useRef } from 'react';

/** Keeps a ref pointing at the latest callback without writing to it during render. */
function useLatest<T>(value: T) {
  const ref = useRef(value);
  useLayoutEffect(() => {
    ref.current = value;
  });
  return ref;
}

/**
 * Tracks the verse nearest the top of the viewport and reports it after the reader
 * pauses scrolling. Verses register their elements with `data-verse`.
 */
export function useVisibleVerse(container: React.RefObject<HTMLElement | null>, ready: boolean, onSettle: (verse: number) => void, delayMs = 1200) {
  const cb = useLatest(onSettle);

  useEffect(() => {
    const root = container.current;
    if (!ready || !root || typeof IntersectionObserver === 'undefined') return;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const visible = new Set<number>();
    const observer = new IntersectionObserver(
      (entries) => {
        for (const e of entries) {
          const v = Number((e.target as HTMLElement).dataset.verse);
          if (e.isIntersecting) visible.add(v);
          else visible.delete(v);
        }
        if (visible.size === 0) return;
        const top = Math.min(...visible);
        clearTimeout(timer);
        timer = setTimeout(() => cb.current(top), delayMs);
      },
      { rootMargin: '-15% 0px -55% 0px' },
    );
    root.querySelectorAll<HTMLElement>('[data-verse]').forEach((el) => observer.observe(el));
    return () => {
      clearTimeout(timer);
      observer.disconnect();
    };
  }, [container, ready, delayMs, cb]);
}

/** Measures time the page is visible and reports it when the reader leaves (approximate). */
export function useVisibleTime(onFlush: (seconds: number) => void, enabled: boolean) {
  const cb = useLatest(onFlush);

  useEffect(() => {
    if (!enabled) return;
    let since: number | null = document.visibilityState === 'visible' ? Date.now() : null;
    let total = 0;
    const pause = () => {
      if (since !== null) total += Date.now() - since;
      since = null;
    };
    const flush = () => {
      pause();
      // Cap long idle sessions so an open tab doesn't inflate learning time.
      const seconds = Math.min(total / 1000, 30 * 60);
      if (seconds >= 30) cb.current(seconds);
      total = 0;
    };
    const onVisibility = () => {
      if (document.visibilityState === 'visible') since = Date.now();
      else flush();
    };
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      flush();
    };
  }, [enabled, cb]);
}
