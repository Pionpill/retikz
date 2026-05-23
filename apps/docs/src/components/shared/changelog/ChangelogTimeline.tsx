import type { FC } from 'react';
import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import type { Lang } from '@/i18n';
import { PACKAGE_LABEL, type Release } from '@/data/changelog.types';

import { releaseAnchorId } from './anchor';

/** sticky header 高度 + 留白 */
const SCROLL_OFFSET = 80;

export type ChangelogTimelineProps = {
  /** 已按筛选过滤后的里程碑(节点内的包行也只显示可见包) */
  releases: Array<Release>;
  lang: Lang;
};

/** 左侧时间线 rail:每个里程碑一个节点 */
export const ChangelogTimeline: FC<ChangelogTimelineProps> = ({ releases, lang }) => {
  const { t } = useTranslation();
  const [activeId, setActiveId] = useState('');

  useEffect(() => {
    if (releases.length === 0) return;
    const ids = releases.map(r => releaseAnchorId(r.minor));
    const update = () => {
      let current = ids[0] ?? '';
      for (const id of ids) {
        const el = document.getElementById(id);
        if (!el) continue;
        if (el.getBoundingClientRect().top - SCROLL_OFFSET <= 0) current = id;
        else break;
      }
      setActiveId(current);
    };
    update();
    window.addEventListener('scroll', update, { passive: true });
    return () => window.removeEventListener('scroll', update);
  }, [releases]);

  const scrollTo = (minor: string) => {
    const el = document.getElementById(releaseAnchorId(minor));
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <nav className="hidden @[32rem]:block">
      <ul>
        {releases.map(release => {
          const id = releaseAnchorId(release.minor);
          const active = activeId === id;
          return (
            <li key={release.minor} className="relative mb-6 pl-5 last:mb-0">
              <span
                className={cn(
                  'absolute left-0.5 top-1.5 size-2.5 rounded-full bg-foreground',
                  active && 'ring-4 ring-foreground/15',
                )}
              />
              <button
                type="button"
                onClick={() => scrollTo(release.minor)}
                className="block cursor-pointer text-left"
              >
                <span className={cn('text-sm font-semibold tabular-nums', !release.stableDate && 'font-medium italic text-muted-foreground')}>
                  {release.stableDate ?? t('changelog.inDevelopment')}
                </span>
                <span className="mt-1 flex flex-col gap-0.5">
                  {release.packages.map(block => (
                    <span key={block.pkg} className="font-mono text-[11px] text-muted-foreground">
                      {PACKAGE_LABEL[block.pkg][lang]} <span className="opacity-80">{block.version}</span>
                    </span>
                  ))}
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
