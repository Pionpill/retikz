import { cn } from '@/lib/utils';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';

import { parseHeadings } from './toc-headings';

/** 顶部 sticky header h-12 (48px) + 留白 */
const SCROLL_OFFSET = 64;

const levelIndent: Record<number, string> = {
  1: '',
  2: 'pl-3',
  3: 'pl-6',
};

export type MdxTocProps = {
  /** 当前页面的 mdx 源码 */
  source: string;
};

export const MdxToc: FC<MdxTocProps> = ({ source }) => {
  const items = useMemo(() => parseHeadings(source), [source]);
  const [activeId, setActiveId] = useState<string>('');
  const navigate = useNavigate();

  // 滚动监听：找当前视口内最靠上、且越过 SCROLL_OFFSET 的最深一个 heading 作为 active
  useEffect(() => {
    if (items.length === 0) return;

    const update = () => {
      let current = items[0]?.id ?? '';
      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - SCROLL_OFFSET <= 0) {
          current = item.id;
        } else {
          break;
        }
      }
      setActiveId(current);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [items]);

  /** 走 react-router 改 URL hash；MdxContent 的 hash useEffect 接管滚动（统一一套行为） */
  const handleClick = useCallback((id: string) => {
    navigate(`#${id}`);
  }, [navigate]);

  if (items.length === 0) return null;

  return (
    <nav>
      <ul className="space-y-1 border-l border-border">
        {items.map(item => (
          <li key={item.id} className={cn('leading-relaxed', levelIndent[item.level])}>
            <button
              type="button"
              onClick={() => handleClick(item.id)}
              className={cn(
                'block w-full cursor-pointer truncate py-0.5 pl-3 text-left text-sm transition-colors duration-200',
                activeId === item.id ? 'font-semibold text-foreground' : 'text-muted-foreground hover:text-foreground',
              )}
            >
              {item.text}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
};
