import type { IRChild } from '@retikz/core';

import type { IRChartPresentationInspection } from './inspection';

/** canonical presentation 到 Layout/Core child 的解析结果 */
export type ResolvedChartPresentation = {
  content: IRChild;
  inspection: IRChartPresentationInspection;
};
