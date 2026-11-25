import type { IRScope, CompiledScope } from '@retikz/core';
import { projectScopeCompileLayouts, projectScopeOutputBounds } from '@retikz/core';

import { emitScopeGroup, resolveStructuralAlignmentGuides, transformAlignmentGuides } from '../../../compile';
import type {
  CompileOwnerKey,
  CompileRuntime,
  SubtreeCompileRuntime,
  SubtreeCompileState,
  TreeOutputState,
} from '../../../compile';

/** 只组装已完成 Scope 的绘制、边界和布局贡献，不解析、比较或执行其后代 */
export const assembleWeaveScopeOutput = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  own: Omit<IRScope, 'children'>,
  compiled: CompiledScope,
  children: SubtreeCompileState,
  frame: SubtreeCompileRuntime,
  owner?: CompileOwnerKey,
): void => {
  const transforms = compiled.layout.overall.transforms;
  const composer = runtime.state.execution.scopeTransformComposer;
  const intrinsic = { shape: compiled.shape, boundary: compiled.boundary, geometry: compiled.layout.overall.geometry };
  if (!frame.context.skipGeometries)
    frame.state.geometries.push(...projectScopeCompileLayouts(own, intrinsic, children.geometries, transforms));
  frame.state.artifacts.push(...children.artifacts);
  for (const allocation of children.allocations) {
    if (allocation.skipAllocation) continue;
    frame.state.allocations.push({
      boundsPoints: allocation.boundsPoints.map(point => composer.apply(point, transforms)),
      skipAllocation: frame.context.layout?.skipAllocation,
    });
  }
  const guides = transformAlignmentGuides(
    resolveStructuralAlignmentGuides(children.alignmentGuides),
    transforms,
    chain => composer.resolve(chain),
  );
  if (guides !== undefined) frame.state.alignmentGuides.push(...guides);
  const clipRef = emitScopeGroup(runtime, output, compiled, {
    scopePrimitives: children.primitives,
    frame,
    semanticOwner: owner,
  });
  frame.state.bounds.push(
    ...projectScopeOutputBounds(
      children.bounds,
      { type: 'group', transforms, ...(clipRef === undefined ? {} : { clipRef }) },
      { paints: [], clips: runtime.state.workspace.clipRegistry.getResources() },
    ),
  );
};
