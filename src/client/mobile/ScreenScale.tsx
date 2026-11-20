import { useLayoutEffect, useRef, type CSSProperties, type ReactNode } from 'react';

export default function ScreenScale({ width, children }: { width: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const content = ref.current;
    const screen = content?.parentElement;
    if (!content || !screen) return;

    const scaleContentToFitScreen = () => {
      const scale = Math.min(1,
        Math.max(1, screen.clientWidth - 24) / content.offsetWidth,
        Math.max(1, screen.clientHeight - 24) / content.offsetHeight);
      content.style.setProperty('--screen-scale', String(scale));
    };
    const observer = new ResizeObserver(scaleContentToFitScreen);
    observer.observe(screen);
    observer.observe(content);
    scaleContentToFitScreen();
    return () => observer.disconnect();
  }, []);

  return <div ref={ref} className="screen-content" style={{ '--screen-width': `${width}px` } as CSSProperties}>
    {children}
  </div>;
}
