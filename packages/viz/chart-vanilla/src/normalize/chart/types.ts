import type { IRChartPresentationRegion } from '@retikz/chart';
import type { IRTextBlock } from '@retikz/core';
import type { OpenString, ValueOf } from '@retikz/foundation';
import type { PlotCoordinate } from '@retikz/plot';
import type { InputPlotCoordinate } from '@retikz/plot-vanilla';

/** Chart 坐标系的字符串简写或完整 Plot operation 输入 */
export type InputChartCoordinate = InputPlotCoordinate | OpenString<ValueOf<typeof PlotCoordinate>>;

/** Chart presentation 的单个正式区域或只含文字的作者简写 */
export type InputChartPresentationRegion = IRTextBlock | IRChartPresentationRegion;

/** Chart presentation 的四个固定槽位 shorthand */
export type InputChartPresentation = Readonly<{
  /** Chart 标题 */
  title?: InputChartPresentationRegion;
  /** Chart 副标题 */
  subtitle?: InputChartPresentationRegion;
  /** Chart 注记 */
  note?: InputChartPresentationRegion;
  /** Chart 数据来源 */
  source?: InputChartPresentationRegion;
}>;
