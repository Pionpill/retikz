import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import { cn } from '@/lib/utils';
import type { Lang } from '@/i18n';
import { PACKAGE_LABEL, type Release } from '@/data/changelog.types';

import { releaseAnchorId } from './anchor';
import { ChangelogPackageBlock } from './ChangelogPackageBlock';

export type ChangelogReleaseProps = {
  release: Release;
  lang: Lang;
};

/**
 * 一个中版本里程碑:输出两个网格单元——左「时间线节点(日期 + 各包版本)」与右「内容」同行对齐。
 * @description 父级 @[32rem] 起为两列网格;左节点贴右对齐紧靠竖线,右内容带 border-l 竖线 + 圆点;窄屏退为日期在上、内容在下。
 */
export const ChangelogRelease: FC<ChangelogReleaseProps> = ({ release, lang }) => {
  const { t } = useTranslation();
  return (
    <>
      <div className="mb-3 @[32rem]:mb-0 @[32rem]:pt-0.5 @[32rem]:text-right">
        <div
          className={cn(
            'text-sm font-semibold tabular-nums',
            !release.stableDate && 'font-medium text-muted-foreground',
          )}
        >
          {release.stableDate ?? t('changelog.inDevelopment')}
        </div>
        <div className="mt-1 flex flex-col gap-0.5">
          {release.packages.map(block => (
            <span
              key={block.pkg}
              className="flex items-baseline justify-end gap-1 font-mono text-[11px] text-muted-foreground"
            >
              <span className="min-w-0 truncate" title={PACKAGE_LABEL[block.pkg][lang]}>
                {PACKAGE_LABEL[block.pkg][lang]}
              </span>
              <span className="shrink-0 opacity-80">{block.version}</span>
            </span>
          ))}
        </div>
      </div>
      <section
        id={releaseAnchorId(release.minor)}
        className="relative scroll-mt-24 space-y-6 pb-12 last:pb-0 @[32rem]:border-l @[32rem]:border-border @[32rem]:pl-8"
      >
        <span className="absolute top-1.5 -left-[5px] hidden size-2.5 rounded-full bg-foreground @[32rem]:block" />
        {release.packages.map(block => (
          <ChangelogPackageBlock key={block.pkg} block={block} lang={lang} />
        ))}
      </section>
    </>
  );
};
