import { type ExternalRow, type Mark, PlotCoordinate, PlotMark } from '../ir';
import { channelValue, isFiniteNumber, resolveFieldPath } from './field';
import type { CartesianFrame, CoordinateFrame, PolarFrame } from './project';

/** 柱默认 baseline（与 mark.ts 的 BAR_BASELINE 一致；锚点计算单一真源需对齐） */
const BAR_BASELINE = 0;

/** 度 → 弧度 */
const DEG_TO_RAD = Math.PI / 180;

/**
 * 普通柱（cartesian interval）的柱心锚点：[xCenter, (yBase+yValue)/2]
 * @description 与 mark.ts lowerPlainBars 摆放 Node.position 同一计算（共享几何、杜绝漂移）；
 *   xCenter / yValue 任一非有限 → null（与 lowering 的跳过守卫一致）。yBase 非有限 → null（整层不渲染）。
 */
const barCenterAnchor = (mark: Mark, row: ExternalRow, frame: CartesianFrame): [number, number] | null => {
  if (mark.type !== PlotMark.Interval) return null;
  const yBase = frame.secondary.coordinate(BAR_BASELINE);
  if (!Number.isFinite(yBase)) return null;
  const xCenter = frame.primary.coordinate(channelValue(mark.encoding.x, row));
  const yValue = frame.secondary.coordinate(channelValue(mark.encoding.y, row));
  if (!Number.isFinite(xCenter) || !Number.isFinite(yValue)) return null;
  return [xCenter, (yBase + yValue) / 2];
};

/**
 * 扇片（sector mark）的 centroid 锚点：mid-angle θ=(start+end)/2、mid-radius r=(inner+outer)/2，绕圆心极投影
 * @description 与 sector Node.position（圆心）不同——取扇片几何中心，更适合命中 / 挂标签。
 *   退化扇区（缺累积界 / 倒退 / 零角 / 零高）跳过 → null（与 mark.ts lowerSector 守卫一致）。
 */
const sectorCentroidAnchor = (mark: Mark, row: ExternalRow, frame: PolarFrame): [number, number] | null => {
  if (mark.type !== PlotMark.Sector) return null;
  const startField = mark.startField ?? 'y0';
  const endField = mark.endField ?? 'y1';
  const v0 = resolveFieldPath(row, startField);
  const v1 = resolveFieldPath(row, endField);
  if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) return null;
  if (v1 < v0) return null;
  const startAngle = frame.primary.coordinate(v0);
  const endAngle = frame.primary.coordinate(v1);
  if (!Number.isFinite(startAngle) || !Number.isFinite(endAngle)) return null;
  if (Math.abs(endAngle - startAngle) < 1e-9) return null;
  return polarCentroid(frame.center, frame.innerRadius, frame.outerRadius, startAngle, endAngle);
};

/**
 * 径向柱 / 玫瑰（polar interval）的 centroid 锚点：mid-angle / mid-radius 绕圆心极投影
 * @description 角带 = 整角带 [center−bw/2, center+bw/2]（series-dodge 子角带 / stack 半径不在本锚点覆盖范围，
 *   datum() 默认取首 mark 的代表点；这里给出与 mark.ts lowerIntervalPolar 同守卫的非堆叠普通几何）。
 *   退化（center 非有限 / 零高）跳过 → null。
 */
const intervalPolarCentroidAnchor = (mark: Mark, row: ExternalRow, frame: PolarFrame): [number, number] | null => {
  if (mark.type !== PlotMark.Interval) return null;
  const stacked = mark.arrangement === 'stack';
  const center = frame.primary.coordinate(channelValue(mark.encoding.x, row));
  if (!Number.isFinite(center)) return null;
  const bandwidth = frame.primary.bandwidth;
  const startAngle = center - bandwidth / 2;
  const endAngle = center + bandwidth / 2;

  let innerRadius: number;
  let outerRadius: number;
  if (stacked) {
    const v0 = resolveFieldPath(row, mark.y0Field ?? 'y0');
    const v1 = resolveFieldPath(row, mark.y1Field ?? 'y1');
    if (!isFiniteNumber(v0) || !isFiniteNumber(v1)) return null;
    innerRadius = frame.secondary.coordinate(v0);
    outerRadius = frame.secondary.coordinate(v1);
  } else {
    innerRadius = frame.secondary.coordinate(BAR_BASELINE);
    outerRadius = frame.secondary.coordinate(channelValue(mark.encoding.y, row));
  }
  if (!Number.isFinite(innerRadius) || !Number.isFinite(outerRadius)) return null;
  if (Math.max(innerRadius, outerRadius) - Math.min(innerRadius, outerRadius) < 1e-9) return null;
  return polarCentroid(frame.center, innerRadius, outerRadius, startAngle, endAngle);
};

/** 扇环 centroid 极投影：mid-angle / mid-radius → 屏幕点（0°=+x、90°=+y、屏幕 y 向下，与 project.ts 同约定） */
const polarCentroid = (
  center: [number, number],
  innerRadius: number,
  outerRadius: number,
  startAngle: number,
  endAngle: number,
): [number, number] => {
  const midAngle = ((startAngle + endAngle) / 2) * DEG_TO_RAD;
  const midRadius = (Math.min(innerRadius, outerRadius) + Math.max(innerRadius, outerRadius)) / 2;
  return [center[0] + midRadius * Math.cos(midAngle), center[1] + midRadius * Math.sin(midAngle)];
};

/**
 * 某 mark 的某行 → 锚点屏幕位置（locator 与 lowering 共享的单一几何真源）
 * @description 返回 [x, y] | null（null = 该行未被渲染 / 被跳过，命中预演与实际渲染一致）。
 *   point / line / area → frame.project(x,y)（投影顶点，与 lowered Node / Path 顶点一致）；
 *   interval cartesian → 柱心 [xCenter,(yBase+yValue)/2]（= lowered 柱 Node.position）；
 *   sector / interval-polar → 扇片 centroid（mid-angle / mid-radius，≠ 圆心 Node.position，更适合命中）。
 */
export const datumAnchor = (mark: Mark, row: ExternalRow, frame: CoordinateFrame): [number, number] | null => {
  if (mark.type === PlotMark.Sector) {
    return frame.type === PlotCoordinate.Polar2D ? sectorCentroidAnchor(mark, row, frame) : null;
  }
  if (mark.type === PlotMark.Interval) {
    return frame.type === PlotCoordinate.Polar2D
      ? intervalPolarCentroidAnchor(mark, row, frame)
      : barCenterAnchor(mark, row, frame);
  }
  // point / line / area：投影该行顶点（坐标系无关）
  const x = channelValue(mark.encoding.x, row);
  const y = channelValue(mark.encoding.y, row);
  return frame.project(x, y);
};
