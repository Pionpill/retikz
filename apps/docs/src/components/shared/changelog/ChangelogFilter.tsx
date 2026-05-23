import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { cn } from '@/lib/utils';
import type { Lang } from '@/i18n';
import { PACKAGE_LABEL, type PackageId } from '@/data/changelog.types';
import { changelog } from '@/data/changelog';
import { useChangelogFilterStore } from '@/store/useChangelogFilterStore';

import { allPackageIds } from './filter';

export type ChangelogFilterProps = {
  lang: Lang;
  /** aside=右栏竖排;bar=窄屏内容区顶部横排 */
  layout?: 'aside' | 'bar';
};

/** 包筛选(多选,替代 TOC):右栏竖排或窄屏横排,基于 shadcn ToggleGroup */
export const ChangelogFilter: FC<ChangelogFilterProps> = ({ lang, layout = 'aside' }) => {
  const { t } = useTranslation();
  const selected = useChangelogFilterStore(s => s.selected);
  const setSelected = useChangelogFilterStore(s => s.setSelected);
  const packages = allPackageIds(changelog);

  return (
    <nav className={cn(layout === 'bar' && 'rounded-lg border bg-muted/30 p-3')}>
      <p className="mb-2.5 text-xs font-medium tracking-wide text-muted-foreground uppercase">
        {t('changelog.filterPackages')}
      </p>
      <ToggleGroup
        type="multiple"
        variant="outline"
        size="sm"
        spacing={1.5}
        value={selected}
        onValueChange={(value: Array<string>) => setSelected(value as Array<PackageId>)}
        className={cn('flex-wrap', layout === 'aside' ? 'w-full flex-col items-stretch' : 'flex-row')}
      >
        {packages.map(pkg => (
          <ToggleGroupItem
            key={pkg}
            value={pkg}
            aria-label={PACKAGE_LABEL[pkg][lang]}
            className={cn('font-mono text-xs', layout === 'aside' && 'justify-start')}
          >
            {PACKAGE_LABEL[pkg][lang]}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </nav>
  );
};
