import { Link, Pin, PinOff } from 'lucide-react';
import type { FC } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

import { Shortcut } from '@/components/shared';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib';
import { useTocStore } from '@/modules/docs/store';

import { parseHeadings } from './utils';

const levelIndent: Record<number, string> = {
  1: '',
  2: 'pl-3',
  3: 'pl-6',
};

export type MdxTocProps = {
  /** 当前页面的 mdx 源码 */
  source: string;
};

export const MdxToc: FC<MdxTocProps> = props => {
  const { source } = props;
  const { t } = useTranslation();
  const headerPinned = useTocStore(state => state.headerPinned);
  const setHeaderPinned = useTocStore(state => state.setHeaderPinned);
  const items = useMemo(() => parseHeadings(source), [source]);
  const [activeId, setActiveId] = useState<string>('');
  const navigate = useNavigate();

  // 高亮与锚点跳转共用标题的 scroll-margin，额外留少量像素容差
  useEffect(() => {
    if (items.length === 0) return;

    const update = () => {
      let current = items[0]?.id ?? '';

      for (const item of items) {
        const el = document.getElementById(item.id);
        if (!el) continue;
        const offset = Number.parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        if (el.getBoundingClientRect().top <= offset + 7) {
          current = item.id;
        } else {
          break;
        }
      }

      setActiveId(current);
    };

    update();
    window.addEventListener('scroll', update, { passive: true });
    window.addEventListener('resize', update);

    return () => {
      window.removeEventListener('scroll', update);
      window.removeEventListener('resize', update);
    };
  }, [items, headerPinned]);

  /** 走 react-router 改 URL hash；MdxContent 的 hash useEffect 接管滚动（统一一套行为） */
  const handleClick = useCallback(
    (id: string) => {
      navigate(`#${id}`);
    },
    [navigate],
  );

  if (items.length === 0) return null;

  return (
    <nav>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => {
          void navigator.clipboard.writeText(window.location.href).then(
            () => toast.success(t('toc.linkCopied')),
            () => toast.error(t('toc.linkCopyFailed')),
          );
        }}
        className="h-8 w-full cursor-pointer justify-start gap-2 px-3 font-normal"
      >
        <Link className="size-3.5" />
        {t('toc.copyLink')}
        <Shortcut keys={['mod', 'L']} className="ml-auto" />
      </Button>
      <Button
        variant="ghost"
        size="sm"
        aria-pressed={headerPinned}
        onClick={() => setHeaderPinned(!headerPinned)}
        className="mb-3 h-8 w-full cursor-pointer justify-start gap-2 px-3 font-normal"
      >
        {headerPinned ? <Pin className="size-3.5" /> : <PinOff className="size-3.5" />}
        {headerPinned ? t('toc.fixedHeader') : t('toc.scrollingHeader')}
      </Button>
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
