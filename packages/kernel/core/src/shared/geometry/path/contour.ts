import type { ContourCommand, ContourSegment, FilletSolution, Position } from '@retikz/math';
import { buildContourCommands, intersectContourRay, solveContourFillets } from '@retikz/math';

import { RetikzCoreError, RetikzCoreErrorCode } from '../../../error';

/** 计算轮廓各拐角的圆角；遇到不支持的圆弧接圆弧时报告错误 */
export const filletContour = (
  segments: Array<ContourSegment>,
  cornerRadius?: number,
  closed = true,
): Array<FilletSolution> => {
  const fillets = solveContourFillets(segments, cornerRadius, closed);
  if (fillets === undefined) {
    throw new RetikzCoreError(RetikzCoreErrorCode.Geometry, 'filletContour: arc-arc seam fillet is not supported');
  }
  return fillets;
};

/** 将轮廓转换为带圆角的路径命令，可复用已算好的圆角 */
export const contourCommands = (
  segments: Array<ContourSegment>,
  cornerRadius?: number,
  fillets?: Array<FilletSolution>,
  closed = true,
): Array<ContourCommand> =>
  buildContourCommands(segments, fillets ?? filletContour(segments, cornerRadius, closed), closed);

/** 从指定位置朝目标寻找圆角轮廓上最近的交点，未找到时返回 undefined */
export const boundaryFromContour = (
  segments: Array<ContourSegment>,
  cornerRadius: number | undefined,
  rayOrigin: Position,
  toward: Position,
  fillets: Array<FilletSolution> = filletContour(segments, cornerRadius),
): Position | undefined => intersectContourRay(segments, rayOrigin, toward, fillets);
