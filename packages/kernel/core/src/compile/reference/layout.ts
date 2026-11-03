import type { Transform } from '../../contract';
import type { CompiledNodeLayout, CompiledNode } from '../node';
import { projectLayoutWithTransform } from '../node';
import type { CompiledScope } from '../scope';
import { composeScopeTransform } from '../shared';

/** 可提供命名几何的已完成元素，Path 不提供节点定位几何 */
export type CompileReferenceSource =
  | Readonly<{ type: 'node'; compiled: CompiledNode }>
  | Readonly<{ type: 'coordinate'; compiled: CompiledNodeLayout }>
  | Readonly<{ type: 'scope'; compiled: CompiledScope }>;

/** 将元素局部状态投影为可登记的引用布局，不修改原编译状态 */
export const projectCompileReference = (
  source: CompileReferenceSource,
  parentTransforms: ReadonlyArray<Transform> = [],
): CompiledNodeLayout => {
  if (source.type === 'node') {
    return projectLayoutWithTransform(source.compiled.layout, composeScopeTransform(parentTransforms));
  }
  if (source.type === 'scope') {
    return projectLayoutWithTransform(
      source.compiled.envelope,
      composeScopeTransform([...parentTransforms, ...source.compiled.transforms]),
    );
  }
  return projectLayoutWithTransform(source.compiled, composeScopeTransform(parentTransforms));
};
