import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import { changelog } from '@/data/changelog';
import { useChangelogFilterStore } from '@/store/useChangelogFilterStore';

import { ChangelogRelease } from './ChangelogRelease';
import { ChangelogTimeline } from './ChangelogTimeline';
import { filterReleases } from './filter';

/** changelog 中栏:左时间线 rail + 右发布列表 */
export const ChangelogView: FC = () => {
  const { i18n, t } = useTranslation();
  const lang: Lang = (i18n.resolvedLanguage ?? 'zh').startsWith('en') ? 'en' : 'zh';
  const selected = useChangelogFilterStore(s => s.selected);
  const visible = useMemo(() => filterReleases(changelog, new Set(selected)), [selected]);

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('changelog.emptyFilter')}</p>;
  }

  return (
    <div className="@container grid grid-cols-1 gap-8 @[32rem]:grid-cols-[140px_1fr]">
      <aside className="@[32rem]:sticky @[32rem]:top-20 @[32rem]:self-start">
        <ChangelogTimeline releases={visible} lang={lang} />
      </aside>
      <div className="min-w-0 space-y-12">
        {visible.map(release => (
          <ChangelogRelease key={release.minor} release={release} lang={lang} />
        ))}
      </div>
    </div>
  );
};
