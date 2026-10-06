import type { CompositeCompileScopeProps, LayoutCompositeCompileContext, resolveBoxSpacing } from '@retikz/core';

import { measureCell } from './pipeline';
import type { CellPlacement } from './pipeline';
import type { CanonicalCell } from './resolve';

/** 线性单元格的物理排列参数，不包含集合专属首尾或边框语义 */
export type LinearCellLayoutOptions = {
  /** 输入序列的排列方向 */ direction: 'up' | 'down' | 'left' | 'right';
  /** 相邻单元格的间距 */ gap: number;
  /** 单元包络外的留白 */ padding: ReturnType<typeof resolveBoxSpacing>;
  /** 集合在inspection中的单格角色 */ role: CellPlacement['role'];
};
/** 自然测量后逐格排列，主轴保留个别尺寸，交叉轴auto填满 */
export const layoutLinearCells = (
  items: Array<CanonicalCell>,
  options: LinearCellLayoutOptions,
  scope: CompositeCompileScopeProps,
  context: LayoutCompositeCompileContext,
) => {
  const { direction, gap, padding, role } = options;
  const horizontal = direction === 'left' || direction === 'right';
  const reverse = direction === 'up' || direction === 'left';
  let mainSize = 0;
  let crossSize = 0;
  const measured = items.map((cell, index) => {
    const result = measureCell(cell, context, index, scope);
    mainSize += horizontal ? result.width : result.height;
    crossSize = Math.max(crossSize, horizontal ? result.height : result.width);
    return result;
  });
  mainSize += Math.max(0, items.length - 1) * gap;
  const width = (horizontal ? mainSize : crossSize) + padding.left + padding.right;
  const height = (horizontal ? crossSize : mainSize) + padding.top + padding.bottom;
  let cursor = 0;
  const cells: Array<CellPlacement> = measured.map(value => {
    const cellWidth = horizontal || typeof value.cell.layout.width === 'number' ? value.width : crossSize;
    const cellHeight = !horizontal || typeof value.cell.layout.height === 'number' ? value.height : crossSize;
    const size = horizontal ? cellWidth : cellHeight;
    const main = reverse ? mainSize - cursor - size : cursor;
    cursor += size + gap;
    return {
      measured: value,
      x: padding.left + (horizontal ? main : (crossSize - cellWidth) / 2),
      y: padding.top + (horizontal ? (crossSize - cellHeight) / 2 : main),
      width: cellWidth,
      height: cellHeight,
      role,
    };
  });
  return { cells, width, height };
};
