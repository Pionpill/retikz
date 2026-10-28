type ChartFacetLocatorValue = string | number | boolean | null | Array<string | number | boolean | null>;

/** Chart facet 定位过滤条件；内部 arrangement identity 由具体 recipe 补齐 */
export type ChartFacetLocatorOptions = Readonly<{
  /** 分面行的标识键 */
  row?: ChartFacetLocatorValue;
  /** 分面列的标识键 */
  column?: ChartFacetLocatorValue;
}>;

/** Chart-facing facet locator 过滤条件 */
export type ChartLocatorOptions = Readonly<{
  /** 当前 recipe 生成的 facet 过滤条件 */
  facet: ChartFacetLocatorOptions;
}>;
