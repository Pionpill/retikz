import type { BoundsRect } from '@retikz/math';

import type { TableCellAlignment, TableCellTranslation } from './cell';
import type { TableCellFit, TableCellFitScale } from './fit';

import { deepFreeze } from '../../shared';
import { computeTableCellTranslation } from './cell';
import { computeTableCellFitScale, projectTableCellBounds } from './fit';

/** Cell 内容 overflow 计算支持的策略 */
export type TableCellOverflow = 'visible' | 'clip';

/** Cell 内容 fit、alignment 与 overflow 的纯几何输入 */
export type ComputeTableCellContentPlacementInput = Readonly<{
  /** replay-root local 的 fit 前 allocation bounds */
  sourceAllocationBounds: BoundsRect;
  /** replay-root local 的 fit 前 visual overflow bounds */
  sourceVisualOverflowBounds: BoundsRect;
  /** Table-local content box */
  contentBox: BoundsRect;
  /** 横向对齐 */
  horizontalAlign: TableCellAlignment;
  /** 纵向对齐 */
  verticalAlign: TableCellAlignment;
  /** 内容 fit 策略 */
  fit: TableCellFit;
  /** 内容 overflow 策略 */
  overflow: TableCellOverflow;
}>;

/** Cell 内容最终放置的纯数值结果 */
export type TableCellContentPlacement = Readonly<{
  /** replay-root local scale */
  scale: TableCellFitScale;
  /** scale 后施加的 Table-local translation */
  translation: TableCellTranslation;
  /** Table-local allocation bounds */
  contentAllocationBounds: BoundsRect;
  /** Table-local 且已应用 overflow policy 的 visual bounds */
  visualOverflowBounds: BoundsRect;
  /** 正宽高 clip 使用的 Table-local bounds */
  clipBounds?: BoundsRect;
  /** 最终 lowering 是否 replay 内容 */
  replayContent: boolean;
}>;

/** 判断运行时输入是否为支持的 Cell overflow 策略 */
const isTableCellOverflow = (value: unknown): value is TableCellOverflow => value === 'visible' || value === 'clip';

/** 计算 Cell 内容的 fit、对齐与 overflow 放置结果 */
export const computeTableCellContentPlacement = (
  input: ComputeTableCellContentPlacementInput,
): TableCellContentPlacement => {
  if (!isTableCellOverflow(input.overflow)) {
    throw new Error('table: Cell overflow must be visible or clip');
  }

  const scale = computeTableCellFitScale(input.sourceAllocationBounds, input.contentBox, input.fit);
  const scaledAllocationBounds = projectTableCellBounds(input.sourceAllocationBounds, scale, { x: 0, y: 0 });
  const translation = computeTableCellTranslation({
    contentBox: input.contentBox,
    allocationBounds: scaledAllocationBounds,
    horizontalAlign: input.horizontalAlign,
    verticalAlign: input.verticalAlign,
  });
  const contentAllocationBounds = projectTableCellBounds(input.sourceAllocationBounds, scale, translation);
  const transformedVisualBounds = projectTableCellBounds(input.sourceVisualOverflowBounds, scale, translation);

  if (input.overflow === 'visible') {
    return deepFreeze({
      scale,
      translation,
      contentAllocationBounds,
      visualOverflowBounds: transformedVisualBounds,
      replayContent: true,
    });
  }

  if (input.contentBox.width === 0 || input.contentBox.height === 0) {
    return deepFreeze({
      scale,
      translation,
      contentAllocationBounds,
      visualOverflowBounds: { ...input.contentBox },
      replayContent: false,
    });
  }

  const contentRight = input.contentBox.x + input.contentBox.width;
  const contentBottom = input.contentBox.y + input.contentBox.height;
  const x = Math.min(Math.max(transformedVisualBounds.x, input.contentBox.x), contentRight);
  const y = Math.min(Math.max(transformedVisualBounds.y, input.contentBox.y), contentBottom);
  const right = Math.min(transformedVisualBounds.x + transformedVisualBounds.width, contentRight);
  const bottom = Math.min(transformedVisualBounds.y + transformedVisualBounds.height, contentBottom);
  const visualOverflowBounds = {
    x,
    y,
    width: Math.max(0, right - x),
    height: Math.max(0, bottom - y),
  };

  return deepFreeze({
    scale,
    translation,
    contentAllocationBounds,
    visualOverflowBounds,
    clipBounds: { ...input.contentBox },
    replayContent: true,
  });
};
