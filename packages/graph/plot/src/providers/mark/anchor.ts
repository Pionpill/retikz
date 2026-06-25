import { type CoordinateFrame, type IntervalContext, cellGeometryAnchor, hasProjectCell } from '../../contract';
import { type ExternalRow, type Mark, PlotMark } from '../../schemas';
import { markCell } from './interval';
import { linkEndpoints } from './link';
import { roleValues } from './roles';

/**
 * 某 mark 的某行 → 锚点屏幕位置（locator 与 lowering 共享的单一几何真源）。
 * @description 返回 [x, y] | null（null = 该行未被渲染 / 被跳过，命中预演与实际渲染一致）。
 *   interval → markCell → frame.projectCell → cellGeometryAnchor；link → 两端中点；point / path → frame.projectRoles。
 *   `ctx` 为 IntervalContext（interval mark 必传；其余 mark 传 undefined）。
 */
export const datumAnchor = (mark: Mark, row: ExternalRow, frame: CoordinateFrame, ctx?: IntervalContext): [number, number] | null => {
  if (mark.type === PlotMark.Interval) {
    if (!hasProjectCell(frame)) return null;
    const cell = markCell(mark, row, frame, ctx);
    return cell ? cellGeometryAnchor(frame.projectCell(cell)) : null;
  }
  // link：一行一带，锚点取带中线中点（源中心 ↔ 目标中心连线中点），与 lowering 同源；任一端非有限 → null
  if (mark.type === PlotMark.Link) {
    const endpoints = linkEndpoints(mark, row, frame);
    return endpoints ? [(endpoints.source[0] + endpoints.target[0]) / 2, (endpoints.source[1] + endpoints.target[1]) / 2] : null;
  }
  // point / path：按 frame.roles 序投影该行顶点（坐标系无关，1 / 2 / 3 通道统一走 projectRoles）
  return frame.projectRoles(roleValues(mark, row, frame));
};
