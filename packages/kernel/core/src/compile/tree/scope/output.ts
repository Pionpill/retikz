import { boundsToRect } from '@retikz/math';

import type { GroupPrimitive, ScenePrimitive } from '../../../contract';
import type { IRScope } from '../../../schemas';
import { assembleCompileOutputs } from '../../output';
import type { CompileOwnerKey, CompileProvenanceTracker } from '../../provenance';
import type { SharedCompileContext, CompileRuntime } from '../../runtime';
import { collectLayoutBounds, calculateBoundsOfPrimitives } from '../../scene';
import { applyTransformChain, createCompileChildPath } from '../../shared';
import type { CompileBounds, CompileOutput } from '../../shared';
import type { TreeOutputState } from '../shared';
import { stableSortByZIndex } from '../shared';
import { createScopeGroup } from './emit';
import type { CompiledScope, EmitScopeGroupContext } from './types';

/** 用已编译 Scope 包装有序子输出，不在缓存状态中保存重复子树 */
export const assembleScopeOutput = (
  scope: CompiledScope,
  children: ReadonlyArray<CompileOutput>,
  shared: SharedCompileContext,
  provenance?: CompileProvenanceTracker,
  owner?: CompileOwnerKey,
): CompileOutput => {
  const ownGroup = { ...scope.group, children: scope.output.primitives };
  const childOutput = assembleCompileOutputs(children, shared);
  const merged = assembleCompileOutputs(
    [childOutput, { ...scope.output, zIndex: undefined, primitives: [ownGroup] }],
    shared,
  );
  const group = merged.primitives[merged.primitives.length - 1] as typeof ownGroup;
  const frame = group.children;
  const nested = merged.primitives.slice(0, -1);
  const transforms = group.transforms ?? [];
  const prunable =
    frame.length === 0 &&
    nested.length === 0 &&
    transforms.length === 0 &&
    group.id === undefined &&
    group.clipRef === undefined;
  const primitives: Array<ScenePrimitive> = prunable ? [] : [{ ...group, children: [...frame, ...nested] }];
  if (owner !== undefined) provenance?.recordPrimitives(primitives, owner, 'scope');
  const bounds: Array<CompileBounds> = [];
  for (const child of children) {
    for (const contribution of child.bounds) {
      if (contribution.decoration) {
        const box = collectLayoutBounds(undefined, contribution.boundsPoints);
        if (box !== undefined) {
          const projected = calculateBoundsOfPrimitives(
            [{ ...group, children: [{ type: 'rect', ...boundsToRect(box), fill: 'black' }] }],
            merged.resources,
          );
          if (projected !== undefined) {
            const { x, y, width, height } = projected;
            bounds.push({
              decoration: true,
              boundsPoints: [
                [x, y],
                [x + width, y],
                [x, y + height],
                [x + width, y + height],
              ],
            });
          }
        }
        continue;
      }
      bounds.push({
        ...contribution,
        boundsPoints: contribution.boundsPoints.map(point => applyTransformChain(point, transforms)),
      });
    }
  }
  const decoration = calculateBoundsOfPrimitives([{ ...group, children: frame }], merged.resources);
  if (decoration !== undefined) {
    const { x, y, width, height } = decoration;
    bounds.push({
      decoration: true,
      boundsPoints: [
        [x, y],
        [x + width, y],
        [x, y + height],
        [x + width, y + height],
      ],
    });
  }
  return Object.freeze({
    primitives,
    resources: merged.resources,
    bounds,
    zIndex: scope.output.zIndex,
  });
};

/** 在需要可见输出时 emit scope group，并挂载 transform、clip 和动画 */
export const emitScopeGroup = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  child: IRScope,
  input: EmitScopeGroupContext,
): string | undefined => {
  const { index, scopeTransforms, scopePrimitives, frame, resolvedClipPath, semanticOwner } = input;
  const {
    state: { primitives },
    context: { pathPrefix: locatorPrefix },
  } = frame;
  const scopeIrPath = createCompileChildPath(locatorPrefix, index);
  const hasScopeTransforms = scopeTransforms.length > 0;
  const isPrunable =
    scopePrimitives.length === 0 && !hasScopeTransforms && child.id === undefined && child.clip === undefined;
  if (isPrunable) return;

  const group: GroupPrimitive = {
    ...createScopeGroup(
      child,
      scopeTransforms,
      runtime.context,
      runtime.state.workspace,
      scopeIrPath,
      resolvedClipPath,
    ),
    // 当前 Scope 的延迟路径已在收尾阶段回填
    children: stableSortByZIndex(scopePrimitives as Array<ScenePrimitive>, output.zIndexOf),
  };
  primitives.push(group);
  if (semanticOwner !== undefined)
    runtime.state.execution.provenanceTracker?.recordPrimitives([group], semanticOwner, 'scope');
  if (child.zIndex !== undefined) output.zIndexOf.set(group, child.zIndex);

  return group.clipRef;
};
