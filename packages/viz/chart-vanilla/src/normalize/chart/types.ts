import type { IRBaseChart, IRChartPresentationItem } from '@retikz/chart';

import type { ChartPresentationPositionValue } from './constants';

type ChartPresentationPresetItem = Extract<IRChartPresentationItem, { kind: 'preset' }>;

/** Chart presentation 的 JSON-safe plain authoring 记录 */
export type InputChartPresentationRecord = Omit<ChartPresentationPresetItem, 'kind' | 'key'> & {
  /** 记录位于 Plot 之前或之后；省略时由 preset 决定 */
  position?: ChartPresentationPositionValue;
};

/** Chart presentation shorthand 与显式记录 */
export type InputChartPresentation = {
  /** Chart 标题 */
  title?: string;
  /** Chart 副标题 */
  subtitle?: string;
  /** Chart 注记 */
  note?: string;
  /** Chart 数据来源 */
  source?: string;
  /** 按 authoring 顺序排列的 presentation 记录 */
  presentation?: ReadonlyArray<InputChartPresentationRecord>;
};

/** Base Chart 的 Vanilla Source IR 组装输入 */
export type InputChart = InputChartPresentation & Omit<IRBaseChart, 'namespace' | 'type' | 'presentation'>;
