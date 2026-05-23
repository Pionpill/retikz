import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import type { Lang } from '@/i18n';
import { PACKAGE_LABEL } from '@/data/changelog.types';
import { changelog } from '@/data/changelog';
import { useChangelogFilterStore } from '@/store/useChangelogFilterStore';

import { allPackageIds } from './filter';

export type ChangelogFilterProps = {
  lang: Lang;
};

/** 右侧多选包筛选(替代 TOC) */
export const ChangelogFilter: FC<ChangelogFilterProps> = ({ lang }) => {
  const { t } = useTranslation();
  const selected = useChangelogFilterStore(s => s.selected);
  const toggle = useChangelogFilterStore(s => s.toggle);
  const packages = allPackageIds(changelog);

  return (
    <nav>
      <p className="mb-2.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
        {t('changelog.filterPackages')}
      </p>
      <ul className="space-y-1.5">
        {packages.map(pkg => {
          const on = selected.includes(pkg);
          return (
            <li key={pkg}>
              <button
                type="button"
                onClick={() => toggle(pkg)}
                aria-pressed={on}
                className={cn(
                  'flex w-full cursor-pointer items-center gap-2 rounded-md border px-2 py-1 font-mono text-xs transition-colors',
                  on ? 'border-foreground font-semibold text-foreground' : 'border-border text-muted-foreground hover:text-foreground',
                )}
              >
                <span className={cn('size-2 rounded-[3px] bg-foreground transition-opacity', on ? 'opacity-70' : 'opacity-25')} />
                {PACKAGE_LABEL[pkg][lang]}
              </button>
            </li>
          );
        })}
      </ul>
    </nav>
  );
};
