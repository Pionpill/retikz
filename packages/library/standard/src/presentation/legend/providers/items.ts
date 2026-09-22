import type { LayoutChildResult } from '@retikz/core';
import type { PairedFlowItem } from '@retikz/layout/compose';

import type { IRLegendItem } from '../types';

/** Legend child 在 minimum 与 natural probe 下的结构结果 */
export type MeasuredLegendChild = Readonly<{
  minimum: LayoutChildResult;
  natural: LayoutChildResult;
}>;

/** 已取得结构 contribution 的离散 Legend item */
export type MeasuredLegendItem = Readonly<{
  authored: IRLegendItem;
  sourceIndex: number;
  sample: MeasuredLegendChild;
  label?: MeasuredLegendChild;
}>;

/** 将 Legend sample/label 的测量结果映射为共享 paired flow 的两个 layout child */
const pairedFlowChildOf = (child: MeasuredLegendChild): PairedFlowItem['primary'] =>
  Object.freeze({
    minimum: Object.freeze({ ...child.minimum.slotSize }),
    natural: Object.freeze({ ...child.natural.slotSize }),
  });

/** 将 Legend item 语义映射为共享布局所需的 primary/secondary descriptor */
export const pairedFlowItemsOf = (items: ReadonlyArray<MeasuredLegendItem>): ReadonlyArray<PairedFlowItem> =>
  Object.freeze(
    items.map(item =>
      Object.freeze({
        key: item.authored.key,
        sourceIndex: item.sourceIndex,
        primary: pairedFlowChildOf(item.sample),
        ...(item.label === undefined ? {} : { secondary: pairedFlowChildOf(item.label) }),
      }),
    ),
  );
