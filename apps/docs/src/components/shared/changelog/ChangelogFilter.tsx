import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { Toggle } from '@/components/ui/toggle';
import { cn } from '@/lib/utils';
import type { Lang } from '@/i18n';
import { PACKAGE_LABEL } from '@/data/changelog.types';
import { changelog } from '@/data/changelog';
import { useChangelogFilterStore } from '@/store/useChangelogFilterStore';

import { allPackageIds } from './filter';

export type ChangelogFilterProps = {
  lang: Lang;
  /** aside=右栏竖排;bar=窄屏内容区顶部横排 */
  layout?: 'aside' | 'bar';
};

/** 包筛选(多选,替代 TOC):每个包一个 shadcn Toggle */
export const ChangelogFilter: FC<ChangelogFilterProps> = ({ lang, layout = 'aside' }) => {
  const { t } = useTranslation();
  const selected = useChangelogFilterStore(s => s.selected);
  const toggle = useChangelogFilterStore(s => s.toggle);
  const packages = allPackageIds(changelog);

  return (
    <nav className={cn(layout === 'bar' && 'rounded-lg border bg-muted/30 p-3')}>
      <p className="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t('changelog.filterPackages')}
      </p>
      <div className={cn('flex gap-1.5', layout === 'aside' ? 'flex-col items-stretch' : 'flex-wrap')}>
        {packages.map(pkg => (
          <Toggle
            key={pkg}
            size="sm"
            variant="outline"
            pressed={selected.includes(pkg)}
            onPressedChange={() => toggle(pkg)}
            aria-label={PACKAGE_LABEL[pkg][lang]}
            className={cn('font-mono text-xs', layout === 'aside' && 'justify-start')}
          >
            {PACKAGE_LABEL[pkg][lang]}
          </Toggle>
        ))}
      </div>
    </nav>
  );
};
