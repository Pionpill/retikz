import type { ExternalRow, Mark } from '../ir';
import { channelValue, isFiniteNumber } from './field';
import type { LinearScaleFn } from './scale';

/** 投影器：把一个 mark 的某行数据投影成绘图区坐标 [x, y]（非有限值返回 null，跳过该点） */
export type Projector = (mark: Mark, row: ExternalRow) => [number, number] | null;

/**
 * 笛卡尔投影：x 通道过 xScale、y 通道过 yScale
 * @description alpha.1 仅 cartesian2D；polar2D 等在此新增对应 projector（plot-design §8.3）
 */
export const createCartesianProjector = (xScale: LinearScaleFn, yScale: LinearScaleFn): Projector => (mark, row) => {
  const xValue = channelValue(mark.encoding.x, row);
  const yValue = channelValue(mark.encoding.y, row);
  if (!isFiniteNumber(xValue) || !isFiniteNumber(yValue)) return null;
  return [xScale(xValue), yScale(yValue)];
};
