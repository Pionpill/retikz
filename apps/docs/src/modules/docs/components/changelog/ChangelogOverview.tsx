import type { FC } from 'react';

import { ChevronRight } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Link } from 'react-router';

import type { Lang } from '@/i18n';
import type { PackageId, Release } from '@/modules/docs/data';

import { InlineMdx } from '@/modules/docs/components';
import { changelogVersionSlug } from '@/modules/docs/data';

/** Viz 分区的更新日志主包，用于概览摘要 */
const VIZ_SECTION_LEAD_PACKAGE = new Map<string, PackageId>([
  ['data', '@retikz/data'],
  ['table', '@retikz/table'],
  ['plot', '@retikz/plot'],
]);

/** Library 分区的更新日志主包，用于概览摘要 */
const LIBRARY_SECTION_LEAD_PACKAGE = new Map<string, PackageId>([
  ['standard', '@retikz/standard'],
  ['layout', '@retikz/layout'],
]);

export type ChangelogOverviewProps = {
  /** 当前模块与分组的 changelog 切片（倒序） */
  releases: Array<Release>;
  /** 当前模块 id，用于拼各中版本详情页链接。 */
  moduleId: string;
  /** 当前分组 id，用于拼各中版本详情页链接并定位主包。 */
  sectionId: string;
};

/**
 * 更新日志概览:各中版本一行,版本号 + 发布日期 / 状态 + 该版本内容简述,整行链接到详情页。
 * @description 简述取当前模块主包（Viz 按 Data / Table / Plot 分区选择）在该中版本的 description；详情页（changelog/<version>）给逐包明细。列表形态，非时间线
 */
export const ChangelogOverview: FC<ChangelogOverviewProps> = ({ releases, moduleId, sectionId }) => {
  const { i18n, t } = useTranslation();
  const lang: Lang = (i18n.resolvedLanguage ?? 'zh').startsWith('en') ? 'en' : 'zh';
  const leadPkg =
    moduleId === 'viz'
      ? (VIZ_SECTION_LEAD_PACKAGE.get(sectionId) ?? '@retikz/data')
      : moduleId === 'library'
        ? (LIBRARY_SECTION_LEAD_PACKAGE.get(sectionId) ?? '@retikz/standard')
        : (`@retikz/${moduleId}` as PackageId);

  return (
    <ul className="flex flex-col gap-2.5">
      {releases.map(release => {
        const lead = release.packages.find(block => block.pkg === leadPkg) ?? release.packages[0];
        return (
          <li key={release.minor}>
            <Link
              to={`/${moduleId}/${sectionId}/changelog/${changelogVersionSlug(release.minor)}`}
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
