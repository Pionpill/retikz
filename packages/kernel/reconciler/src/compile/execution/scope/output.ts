import type { CanonicalScope, CompiledScope, CompileWarning, IRScope, ScopeCompileContext } from '@retikz/core';
import { compileScope, resolveAnimations, projectScopeCompileLayouts, projectScopeOutputBounds } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import type { CompileOwnerKey } from '../../provenance';
import type { CompileRuntime } from '../../runtime';
import { resolveStructuralAlignmentGuides, transformAlignmentGuides } from '../shared';
import type { TreeOutputState } from '../shared';
import type { SubtreeCompileRuntime, SubtreeCompileState } from '../subtree';
import { emitScopeGroup, shouldEmitScopeGroup } from './group';

/** 按最终子输出绑定分组动画；布局与裁剪继续使用已完成的 Core 产物 */
export const bindScopeOutputAnimations = (
  canon: CanonicalScope,
  compiled: CompiledScope,
  childCount: number,
  context: ScopeCompileContext,
): { compiled: CompiledScope; diagnostics: Array<CompileWarning> } => {
  const diagnostics: Array<CompileWarning> = [];
  const animations = shouldEmitScopeGroup(
    childCount,
    compiled.layout.overall.transforms,
    compiled.emit.overall.id,
    compiled.emit.overall.clipRef !== undefined,
  )
    ? (resolveAnimations(canon.animations, {
        target: 'element',
        irPath: context.irPath,
        onWarn: warning => diagnostics.push(warning),
      }) ?? [])
    : [];
  return {
    compiled: jsonStructuralEquals(compiled.emit.overall.animations ?? [], animations)
      ? compiled
      : compileScope(
          canon,
          { ...context, animations },
          { layout: compiled.layout, emit: { clip: compiled.emit.clip ?? { clipRef: compiled.emit.overall.clipRef } } },
        ),
    diagnostics,
  };
};

/** 只组装已完成 Scope 的绘制、边界和布局贡献，不解析、比较或执行其后代 */
export const assembleScopeOutput = (
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
    composer.resolve,
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
