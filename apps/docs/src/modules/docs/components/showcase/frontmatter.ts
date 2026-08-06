import type { ValueOf } from '@retikz/core';

/** Showcase 图表家族 frontmatter 值 */
export const ShowcaseFamily = {
  ScatterPoints: 'scatter-points',
} as const;

/** Showcase 图表家族 frontmatter 值 */
export type ShowcaseFamilyValue = ValueOf<typeof ShowcaseFamily>;

/** Showcase 使用场景 frontmatter 值 */
export const ShowcaseUsage = {
  Distribution: 'distribution',
} as const;

/** Showcase 使用场景 frontmatter 值 */
export type ShowcaseUsageValue = ValueOf<typeof ShowcaseUsage>;

/** Showcase 图表家族到 i18n key 的映射 */
export const SHOWCASE_FAMILY_LABELS: Record<ShowcaseFamilyValue, 'viz.chartScatterPoints'> = {
  'scatter-points': 'viz.chartScatterPoints',
};

/** Showcase 使用场景到 i18n key 的映射 */
export const SHOWCASE_USAGE_LABELS: Record<ShowcaseUsageValue, 'viz.chartPurposeDistribution'> = {
  distribution: 'viz.chartPurposeDistribution',
};

/** 判断 frontmatter 值是否为支持的 Showcase 图表家族 */
export const isShowcaseFamilyValue = (value: unknown): value is ShowcaseFamilyValue =>
  Object.values(ShowcaseFamily).includes(value as ShowcaseFamilyValue);

/** 判断 frontmatter 值是否为支持的 Showcase 使用场景 */
export const isShowcaseUsageValue = (value: unknown): value is ShowcaseUsageValue =>
  Object.values(ShowcaseUsage).includes(value as ShowcaseUsageValue);
