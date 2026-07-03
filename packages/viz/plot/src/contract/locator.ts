import type { IRJsonObject } from '@retikz/core';

/**
 * 逻辑地址解析结果。
 * @description position 与 lowering 摆放一致；meta 与 per-datum meta 同构；id 仅在 datumIdField 命中并已绑定具名 id 时回填。
 */
export type ResolvedAnchor = {
  /** 该 datum / series 的锚点屏幕位置（user units）。 */
  position: [number, number];
  /** 来源 meta。 */
  meta: IRJsonObject;
  /** 若给该元素绑定了具名 id，则回填；否则省略。 */
  id?: string;
};

/** facet 定位过滤条件。 */
export type PlotFacetLocatorOptions = {
  /** facet id。 */
  id: string;
  /** facet row key。 */
  row?: string | number | boolean | null | Array<string | number | boolean | null>;
  /** facet column key。 */
  column?: string | number | boolean | null | Array<string | number | boolean | null>;
};

/** datum / series 定位过滤条件。 */
export type PlotLocatorOptions = {
  /** mark 序号；省略时取首个 mark。 */
  markIndex?: number;
  /** coordinate view id。 */
  coordinateView?: string;
  /** facet 过滤条件。 */
  facet?: PlotFacetLocatorOptions;
  /** track id。 */
  track?: string;
};

/** plot locator：把逻辑地址解析成 scene 锚点。 */
export type PlotLocator = {
  /** 按 transformedIndex 解析 datum 锚点。 */
  datum: (transformedIndex: number, opts?: PlotLocatorOptions) => ResolvedAnchor | null;
  /** 按 series 值解析该 series 的区域锚点。 */
  series: (value: string | number, opts?: PlotLocatorOptions) => ResolvedAnchor | null;
  /** 按点路径字符串解析锚点。 */
  resolve: (address: string) => ResolvedAnchor | null;
};
