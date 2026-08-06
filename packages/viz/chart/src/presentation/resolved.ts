import type { IRChild } from '@retikz/core';
import type { IRLayoutContainerBox } from '@retikz/standard';

import type { IRChartPresentationInspection } from './inspection';

/** surface phase 消费的已解析 padding */
export type ChartSurfacePadding = IRLayoutContainerBox['padding'];

/** owner-private Chart presentation content 解析结果 */
export type ResolvedChartPresentation = {
  /** 当前 content phase 生成的 PlotSpec 或 Standard FlexLayout */
  content: IRChild;
  /** 仅保留给 future Standard surface phase 的 outer inset */
  surfacePadding: ChartSurfacePadding;
  /** 合入唯一 Chart inspection 的 presentation section */
  inspection: IRChartPresentationInspection;
};
