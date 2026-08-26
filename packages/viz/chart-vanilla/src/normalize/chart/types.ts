import type { IRTextBlock } from '@retikz/core';

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
