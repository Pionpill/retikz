import type { PropertyPath } from '@retikz/foundation';

import { createLayoutProbeRecoverableError } from '../resolve/diagnostics';
import type { PositionTargetResolveContext } from '../resolve/position';
import { resolvePosition } from '../resolve/position';
import type { IRCoordinate, IRPosition } from '../schemas';
import type { ElementCompileOptions, ElementCompileResult } from './context';
import { runElementCompilation } from './context';

/** 坐标单元素编译上下文 */
export type CoordinateCompileContext = ElementCompileOptions;

/** 独立解析坐标，不创建可见图元或登记名称 */
export const compileCoordinate = (
  input: IRCoordinate,
  context: CoordinateCompileContext,
): ElementCompileResult<CompiledCoordinate> =>
  runElementCompilation(context, workspace => {
    const position = resolveCoordinatePosition(input, workspace.positionContext);
    return Object.freeze({
      irPath: context.irPath,
      id: input.id,
      position,
    });
  });

/** 坐标编译状态，不创建虚构的可见图元 */
export type CompiledCoordinate = Readonly<{
  /** 元素在 IR 树中的来源路径 */
  irPath: PropertyPath;
  /** 供名称登记的作者 id */
  id: string;
  /** 本地位置 */
  position: IRPosition;
}>;

/** 解析坐标声明的局部位置，不登记名称或创建输出 */
export const resolveCoordinatePosition = (input: IRCoordinate, context: PositionTargetResolveContext): IRPosition => {
  const position = resolvePosition(input.position, context)?.localPoint;
  if (position === undefined) {
    throw createLayoutProbeRecoverableError(
      `Cannot resolve position for coordinate ${input.id}; polar.origin or at.of may reference an undefined node`,
    );
  }

  return position;
};
