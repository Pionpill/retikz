import { CoordinateOwnerOutputSchema } from '../../contract';
import { createLayoutProbeRecoverableError } from '../../resolve/diagnostics';
import { resolvePosition } from '../../resolve/position';
import type { IRCoordinate } from '../../schemas';
import { runElementCompilation } from './context';
import { collectElementObservation } from './observation';
import type { CompiledCoordinate, ElementCompileOptions, ElementCompileResult } from './types';

/** 坐标单元素编译上下文 */
export type CoordinateCompileContext = ElementCompileOptions;

/** 独立解析坐标，不创建可见图元或登记名称 */
export const compileCoordinate = (
  input: IRCoordinate,
  context: CoordinateCompileContext,
): ElementCompileResult<CompiledCoordinate> =>
  runElementCompilation(context, workspace => {
    const position = resolvePosition(input.position, workspace.positionContext)?.localPoint;
    if (position === undefined) {
      throw createLayoutProbeRecoverableError(
        `Cannot resolve position for coordinate ${input.id}; polar.origin or at.of may reference an undefined node`,
      );
    }
    const observations = collectElementObservation(
      context,
      { kind: 'coordinate' },
      CoordinateOwnerOutputSchema,
      () => ({ id: input.id, position }),
    );
    return Object.freeze({
      irPath: context.irPath,
      id: input.id,
      position,
      ...(observations.length === 0 ? {} : { output: { primitives: [], resources: [], bounds: [], observations } }),
    });
  });
