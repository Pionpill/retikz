import type { ExternalRow, Mark } from '../ir';
import { channelValue } from './field';
import type { PositionScale } from './scale';

/**
 * 投影器：把一个 mark 的某行数据投影成绘图区坐标 [x, y]（非有限值返回 null，跳过该点）
 * @description 可调用形态供 point / line 用（`project(mark, row)`）；同时挂 xScale / yScale，
 *   供 bar 等需要 bandwidth / 单维 coordinate / baseline 投影的 mark 直接取（ADR-02 起）。
 */
export interface Projector {
  (mark: Mark, row: ExternalRow): [number, number] | null;
  /** x 维位置 scale（coordinate / bandwidth / range） */
  xScale: PositionScale;
  /** y 维位置 scale */
  yScale: PositionScale;
}

/**
 * 笛卡尔投影：x 通道过 xScale.coordinate、y 通道过 yScale.coordinate
 * @description alpha.1 仅 cartesian2D；polar2D 等在此新增对应 projector（plot-design §8.3）。
 *   coordinate 对非法 / 未知值返回 NaN，统一在此判有限性后跳过该点。
 */
export const createCartesianProjector = (xScale: PositionScale, yScale: PositionScale): Projector => {
  const project = ((mark, row) => {
    const x = xScale.coordinate(channelValue(mark.encoding.x, row));
    const y = yScale.coordinate(channelValue(mark.encoding.y, row));
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    return [x, y];
  }) as Projector;
  project.xScale = xScale;
  project.yScale = yScale;
  return project;
};
