import type { Cell, CoordinateFrame } from '../../../contract';

import { cellGeometryAnchor, hasProjectCell } from '../../../contract';
import { type ExternalRow, type Mark } from '../../../schemas';
import { roleValues } from './roles';

/** 按坐标系 roles 投影某一行的 mark 位置。 */
export const roleAnchor = (mark: Mark, row: ExternalRow, frame: CoordinateFrame): [number, number] | null =>
  frame.projectRoles(roleValues(mark, row, frame));

/** 把逻辑 cell 投影为几何后取可连接锚点；坐标系不支持 cell 时返回 null。 */
export const cellAnchor = (cell: Cell | null, frame: CoordinateFrame): [number, number] | null => {
  if (cell === null || !hasProjectCell(frame)) return null;
  return cellGeometryAnchor(frame.projectCell(cell));
};
