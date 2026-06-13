import type { FC } from 'react';
import { useTranslation } from 'react-i18next';

import type { Lang } from '@/i18n';
import type { Release } from '@/data/changelog.types';

import { ChangelogPackageBlock } from './ChangelogPackageBlock';

export type ChangelogVersionDetailProps = {
  /** 单个中版本里程碑 */
  release: Release;
};

/**
 * 单个中版本详情:发布日期 / 状态 + 各包逐块明细(描述 / highlights / 可展开预发布)。
 * @description 由 changelog 概览页链接进入;内容全部从结构化 changelog 数据派生,无独立 mdx。
 */
export const ChangelogVersionDetail: FC<ChangelogVersionDetailProps> = ({ release }) => {
  const { i18n, t } = useTranslation();
  const lang: Lang = (i18n.resolvedLanguage ?? 'zh').startsWith('en') ? 'en' : 'zh';
  return (
    <div className="space-y-6">
      <p className="text-sm tabular-nums text-muted-foreground">
        {release.stableDate ?? t('changelog.inDevelopment')}
      </p>
      <div className="space-y-6">
        {release.packages.map(block => (
          <ChangelogPackageBlock key={block.pkg} block={block} lang={lang} />
        ))}
      </div>
    </div>
  );
};
