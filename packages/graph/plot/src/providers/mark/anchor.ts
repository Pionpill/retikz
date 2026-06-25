import { type CoordinateFrame, type IntervalContext, cellGeometryAnchor, hasProjectCell } from '../../contract';
import { type ExternalRow, type Mark, PlotMark } from '../../schemas';
import { markCell } from './interval';
import { roleValues } from './roles';

/**
 * 某 mark 的某行 → 锚点屏幕位置（locator 与 lowering 共享的单一几何真源）。
 * @description 返回 [x, y] | null（null = 该行未被渲染 / 被跳过，命中预演与实际渲染一致）。
 *   interval → markCell → frame.projectCell → cellGeometryAnchor；point / path → frame.projectRoles。
 *   `ctx` 为 IntervalContext（interval mark 必传；其余 mark 传 undefined）。
 */
export const datumAnchor = (mark: Mark, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext): [number, number] | null => {
  if (mark.type === PlotMark.Interval) {
    if (!hasProjectCell(frame)) return null;
    const cell = markCell(mark, row, frame, ctx);
    return cell ? cellGeometryAnchor(frame.projectCell(cell)) : null;
  }
  // point / path：按 frame.roles 序投影该行顶点（坐标系无关，1 / 2 / 3 通道统一走 projectRoles）
  return frame.projectRoles(roleValues(mark, row, frame));
};
