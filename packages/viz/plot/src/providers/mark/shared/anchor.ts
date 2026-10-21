import type { ExternalRow } from '@retikz/data';

import type { Cell, CoordinateFrame } from '../../../contract';
import { cellGeometryAnchor, hasProjectCell } from '../../../contract';
import type { IRPlotMark } from '../../../schemas';
import { roleValues, fixedRoleValue, mapMarkRoles } from './roles';

/** 按坐标系 roles 投影某一行的 mark 位置 */
export const roleAnchor = (mark: IRPlotMark, row: ExternalRow, frame: CoordinateFrame): [number, number] | null => {
  const values = roleValues(mark, row, frame);
  if (!frame.roles.some(role => typeof fixedRoleValue(mark, role) === 'object')) return frame.projectRoles(values);
  const mapped = mapMarkRoles(mark, values, frame);
  return mapped === null ? null : (frame.projectMappedRoles?.(mapped) ?? null);
};

/** 把逻辑 cell 投影为几何后取可连接锚点；坐标系不支持 cell 时返回 null */
export const cellAnchor = (cell: Cell | null, frame: CoordinateFrame): [number, number] | null => {
  if (cell === null || !hasProjectCell(frame)) return null;
  return cellGeometryAnchor(frame.projectCell(cell));
};
