import type { FC } from 'react';
import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import { changelog } from '@/data/changelog';
import { useChangelogFilterStore } from '@/store/useChangelogFilterStore';

import { ChangelogRelease } from './ChangelogRelease';
import { filterReleases } from './filter';

/**
 * changelog 中栏:每个里程碑「左时间线节点 + 右内容」同行对齐。
 * @description @[32rem] 起为两列网格(左节点固定宽 / 右内容),每个 ChangelogRelease 贡献该网格的一行两格;窄屏退为单列(日期在上、内容在下)。
 */
export const ChangelogView: FC = () => {
  const { i18n, t } = useTranslation();
  const lang: Lang = (i18n.resolvedLanguage ?? 'zh').startsWith('en') ? 'en' : 'zh';
  const selected = useChangelogFilterStore(s => s.selected);
  const visible = useMemo(() => filterReleases(changelog, new Set(selected)), [selected]);

  if (visible.length === 0) {
    return <p className="text-sm text-muted-foreground">{t('changelog.emptyFilter')}</p>;
  }

  return (
    <div className="@container">
      <div className="@[32rem]:grid @[32rem]:grid-cols-[132px_1fr] @[32rem]:gap-x-6">
        {visible.map(release => (
          <ChangelogRelease key={release.minor} release={release} lang={lang} />
        ))}
      </div>
    </div>
  );
};
