import type { Transform } from '../../../contract';
import type { CompiledNodeLayout } from '../../layout';
import type { CompileContextRegistries } from '../../runtime';
import { composeScopeTransform } from '../../shared';
import type { CompiledCoordinate } from '../coordinate';
import { createCoordinateLayout } from '../coordinate';
import { projectLayoutWithTransform } from '../node';
import type { CompiledNode } from '../node';
import type { CompiledScope } from '../scope';

/** 可提供命名几何的已完成元素，Path 不提供节点定位几何 */
export type CompileReferenceSource =
  | Readonly<{ type: 'node'; compiled: CompiledNode }>
  | Readonly<{ type: 'coordinate'; compiled: CompiledCoordinate }>
  | Readonly<{ type: 'scope'; compiled: CompiledScope }>;

/** 将元素局部状态投影为可登记的引用布局，不修改原编译状态 */
export const projectCompileReference = (
  source: CompileReferenceSource,
  registries: Pick<CompileContextRegistries, 'shapeRegistry' | 'boundaryRegistry'>,
  parentTransforms: ReadonlyArray<Transform> = [],
): CompiledNodeLayout => {
  if (source.type === 'node') {
    return projectLayoutWithTransform(source.compiled.layout, composeScopeTransform(parentTransforms));
  }
  if (source.type === 'scope') {
    return projectLayoutWithTransform(
      source.compiled.envelope,
      composeScopeTransform([...parentTransforms, ...(source.compiled.group.transforms ?? [])]),
    );
  }
  const local = createCoordinateLayout(source.compiled.id, source.compiled.position, {
    shapes: registries.shapeRegistry,
    boundaries: registries.boundaryRegistry,
  });
  return projectLayoutWithTransform(local, composeScopeTransform(parentTransforms));
};
