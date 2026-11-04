import type { CanonicalPath } from '../../resolve';
import { emitCompiledDrawing, splitCompiledDrawing } from '../scene';
import { bindPathTargets } from './bind';
import { emitDefinedPath } from './emit';
import type { CompiledPath, PathCompileContext } from './types';

/** 消费已确定路径属性，绑定引用并生成纯数据最终结果 */
export const compilePath = (canon: CanonicalPath, context: PathCompileContext): CompiledPath => {
  const { scopeChain, targetResolver } = context;
  const resolution = bindPathTargets(canon, { scopeChain, targetResolver });
  const result = emitDefinedPath(resolution, context);
  const drawing = splitCompiledDrawing(result?.primitives ?? []);
  return {
    geometry: drawing.geometry,
    layout: result === null ? null : { boundsPoints: result.boundsPoints },
    style: { primitives: drawing.style, shadow: canon.properties.shadow },
  };
};

/** 从路径最终结果组装 Scene，不访问输入、定义或目标绑定 */
export const emitPathOutput = (compiled: CompiledPath) => ({
  primitives: emitCompiledDrawing({ geometry: compiled.geometry, style: compiled.style.primitives }),
  boundsPoints: compiled.layout?.boundsPoints ?? [],
});
