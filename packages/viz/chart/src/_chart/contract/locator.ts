import type { PlotLocatorOptions } from '@retikz/plot';

type ChartFacetLocatorValue = string | number | boolean | null | Array<string | number | boolean | null>;

/** Chart facet 定位过滤条件；内部 arrangement identity 由具体 recipe 补齐 */
export type ChartFacetLocatorOptions = Readonly<{
  /** facet row key */
  row?: ChartFacetLocatorValue;
  /** facet column key */
  column?: ChartFacetLocatorValue;
}>;

/** Chart-facing facet locator 过滤条件 */
export type ChartLocatorOptions = Readonly<{
  /** 当前 recipe 生成的 facet 过滤条件 */
  facet: ChartFacetLocatorOptions;
}>;

/** 具体 recipe 提供给 Chart locator 的固定内部 identity */
export type ChartLocatorIdentity = Readonly<{
  /** facet arrangement id */
  facet: string;
}>;

/** 把 Chart-facing locator 条件投影为 Plot locator 条件 */
export const qualifyChartLocatorOptions = (
  options: ChartLocatorOptions,
  identity: ChartLocatorIdentity,
): PlotLocatorOptions => ({ facet: { id: identity.facet, ...options.facet } });
