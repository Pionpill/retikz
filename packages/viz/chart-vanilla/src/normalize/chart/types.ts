import type { IRTextBlock } from '@retikz/core';
import type { OpenString, ValueOf } from '@retikz/foundation';
import type { PlotCoordinate } from '@retikz/plot';
import type { InputPlotCoordinate } from '@retikz/plot-vanilla';

/** Chart 坐标系的字符串简写或完整 Plot operation 输入 */
export type InputChartCoordinate = InputPlotCoordinate | OpenString<ValueOf<typeof PlotCoordinate>>;

/** Chart presentation 的四个固定槽位 shorthand */
export type InputChartPresentation = Readonly<{
  /** Chart 标题 */
  title?: IRTextBlock;
  /** Chart 副标题 */
  subtitle?: IRTextBlock;
  /** Chart 注记 */
  note?: IRTextBlock;
  /** Chart 数据来源 */
  source?: IRTextBlock;
}>;
