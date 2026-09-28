import type { FC, ReactNode } from 'react';
import { useEffect, useRef, useState } from 'react';

import { cn } from '@/lib';

import { sizeClass } from './constants';
import type { SizeKey } from './types';

/** 预览进入视口前的占位与加载边界 */
export type PreviewViewportProps = {
  /** 与预览一致的高度档位 */
  size: SizeKey;
  /** 预览的高度覆盖 */
  className?: string;
  /** 首次接近视口后持续保留的内容 */
  children: ReactNode;
};

/** 提前一个短滚动距离加载，离开视口后保留交互状态 */
export const PreviewViewport: FC<PreviewViewportProps> = props => {
  const { size, className, children } = props;
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      entries => {
        if (!entries.some(entry => entry.isIntersecting)) return;
        setReady(true);
        observer.disconnect();
      },
      { rootMargin: '600px 0px' },
    );
    if (host.current) observer.observe(host.current);
    return () => observer.disconnect();
  }, []);
  return (
    <div ref={host} data-preview-viewport={ready ? 'ready' : 'pending'}>
      {ready ? (
        children
      ) : (
        <div className="my-6" aria-hidden>
          <div className={cn('rounded-xl bg-muted/20', sizeClass[size], className)} />
        </div>
      )}
    </div>
  );
};
