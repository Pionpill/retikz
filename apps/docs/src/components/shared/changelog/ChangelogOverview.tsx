import { ChevronRight } from 'lucide-react';
import type { FC } from 'react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import { InlineMdx } from '@/components/shared/mdx-content';
import { changelogVersionSlug } from '@/data/changelog';
import type { PackageId, Release } from '@/data/changelog.types';
import type { Lang } from '@/i18n';

export type ChangelogOverviewProps = {
  /** 当前模块的 changelog 切片（倒序） */
  releases: Array<Release>;
  /** 当前模块 id，用于拼各中版本详情页链接、定位主包 */
  moduleId: string;
};

/**
 * 更新日志概览:各中版本一行,版本号 + 发布日期 / 状态 + 该版本内容简述,整行链接到详情页。
 * @description 简述取该模块主包(`@retikz/<module>`)在该中版本的 description;详情页(changelog/<version>)给逐包明细。列表形态,非时间线。
 */
export const ChangelogOverview: FC<ChangelogOverviewProps> = ({ releases, moduleId }) => {
  const { i18n, t } = useTranslation();
  const lang: Lang = (i18n.resolvedLanguage ?? 'zh').startsWith('en') ? 'en' : 'zh';
  const leadPkg = `@retikz/${moduleId}` as PackageId;

  return (
    <ul className="flex flex-col gap-2.5">
      {releases.map(release => {
        const lead = release.packages.find(block => block.pkg === leadPkg) ?? release.packages[0];
        return (
          <li key={release.minor}>
            <Link
              to={`/${moduleId}/releases/changelog/${changelogVersionSlug(release.minor)}`}
              className="group flex items-start gap-3 rounded-lg border p-4 transition-colors hover:bg-accent/40"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-base font-semibold tabular-nums">{release.minor}</span>
                  <span className="text-xs tabular-nums text-muted-foreground">
                    {release.stableDate ?? t('changelog.inDevelopment')}
                  </span>
                </div>
                <InlineMdx source={lead.description[lang]} className="mt-1.5 text-sm text-muted-foreground" />
              </div>
              <ChevronRight className="mt-0.5 size-4 shrink-0 text-muted-foreground/60 transition-colors group-hover:text-foreground" />
            </Link>
          </li>
        );
      })}
    </ul>
  );
};
