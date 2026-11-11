import type { PathResolution } from '../../resolve';
import { emitDefinedPath } from './host';
import { bindPathTargets } from './target';
import type { CompiledPath, PathCompileContext, PreparedPathCompilation } from './types';

/** 复用已确认有效的绘制结果或目标绑定，补算缺失阶段 */
export const compilePath = (
  resolution: PathResolution,
  context: PathCompileContext,
  prepared?: PreparedPathCompilation,
): CompiledPath => {
  if (prepared?.emit !== undefined)
    return {
      targets: prepared.targets,
      emit: prepared.emit,
      stroke: prepared.stroke,
      style: { shadow: resolution.canon.shadow },
    };
  const boundResolution = bindPathTargets(resolution, context, prepared?.targets);
  return {
    targets: boundResolution.targets,
    ...emitDefinedPath(boundResolution, context, prepared?.stroke),
    style: { shadow: resolution.canon.shadow },
  };
};
