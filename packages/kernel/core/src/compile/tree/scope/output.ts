import { boundsToRect } from '@retikz/math';

import type { GroupPrimitive, ScenePrimitive, SceneResource, Transform } from '../../../contract';
import { resolveAnimations } from '../../../resolve';
import type { AnimationResolveContext } from '../../../resolve';
import type { IRScope } from '../../../schemas';
import type { LayoutBoundsContribution } from '../../layout';
import type { CompileOutputContext } from '../../output';
import { assembleCompileOutputs } from '../../output';
import type { CompileOwnerKey, CompileProvenanceTracker } from '../../provenance';
import type { CompileRuntime } from '../../runtime';
import { collectLayoutBounds, calculateBoundsOfPrimitives, allocationPointsOf } from '../../scene';
import { applyTransformChain, createCompileChildPath } from '../../shared';
import type { CompileBounds, CompileOutput } from '../../shared';
import type { TreeOutputState } from '../shared';
import { stableSortByZIndex } from '../shared';
import { createScopeGroup } from './emit';
import type { CompiledScope, EmitScopeGroupContext } from './types';

/** 判断 Scope 是否需要保留可见分组，空匿名分组可被裁去 */
export const shouldEmitScopeGroup = (
  childCount: number,
  transforms: ReadonlyArray<Transform>,
  id: string | undefined,
  hasClip: boolean,
): boolean => childCount > 0 || transforms.length > 0 || id !== undefined || hasClip;

/** Scope 输出组装需要的资源能力及本次诊断接收器 */
export type ScopeOutputContext = CompileOutputContext & Pick<AnimationResolveContext, 'onWarn'>;

/** 在真实子输出就绪后裁空、解析动画并生成分组 */
export const emitScopePrimitive = (
  group: Omit<GroupPrimitive, 'children' | 'animations'>,
  children: Array<ScenePrimitive>,
  input: Pick<IRScope, 'animations'>,
  context: Pick<AnimationResolveContext, 'onWarn' | 'irPath'>,
): GroupPrimitive | undefined => {
  if (!shouldEmitScopeGroup(children.length, group.transforms ?? [], group.id, group.clipRef !== undefined)) return;
  const animations = resolveAnimations(input.animations, { ...context, target: 'element' });
  return { ...group, ...(animations === undefined ? {} : { animations }), children };
};

/** 投影子输出边界；装饰经过裁剪，布局贡献只应用变换 */
export const projectScopeOutputBounds = (
  bounds: ReadonlyArray<CompileBounds>,
  group: Omit<GroupPrimitive, 'children'>,
  resources: ReadonlyArray<SceneResource>,
): Array<LayoutBoundsContribution> => {
  const projectedBounds: Array<LayoutBoundsContribution> = [];
  for (const contribution of bounds) {
    if (contribution.decoration) {
      const box = collectLayoutBounds(undefined, contribution.boundsPoints);
      if (box === undefined) continue;
      const projected = calculateBoundsOfPrimitives(
        [{ ...group, children: [{ type: 'rect', ...boundsToRect(box), fill: 'black' }] }],
        resources,
      );
      if (projected !== undefined)
        projectedBounds.push({ decoration: true, boundsPoints: allocationPointsOf(projected) });
    } else {
      projectedBounds.push({
        shadow: contribution.shadow,
        boundsPoints: contribution.boundsPoints.map(point => applyTransformChain(point, group.transforms ?? [])),
      });
    }
  }
  return projectedBounds;
};

/** 用已编译 Scope 包装有序子输出，不在缓存状态中保存重复子树 */
export const assembleScopeOutput = (
  scope: CompiledScope,
  children: ReadonlyArray<CompileOutput>,
  context: ScopeOutputContext,
  input: Pick<IRScope, 'animations'>,
  provenance?: CompileProvenanceTracker,
  owner?: CompileOwnerKey,
): CompileOutput => {
  const ownGroup = { ...scope.group, children: scope.output.primitives };
  const childOutput = assembleCompileOutputs(children, context);
  const merged = assembleCompileOutputs(
    [childOutput, { ...scope.output, zIndex: undefined, primitives: [ownGroup] }],
    context,
  );
  const group = merged.primitives[merged.primitives.length - 1] as typeof ownGroup;
  const frame = group.children;
  const nested = merged.primitives.slice(0, -1);
  const primitive = emitScopePrimitive(group, [...frame, ...nested], input, {
    onWarn: context.onWarn,
    irPath: scope.irPath,
  });
  const primitives: Array<ScenePrimitive> = primitive === undefined ? [] : [primitive];
  if (owner !== undefined) provenance?.recordPrimitives(primitives, owner, 'scope');
  const bounds = projectScopeOutputBounds(
    children.flatMap(child => child.bounds),
    group,
    merged.resources,
  );
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
  const group = emitScopePrimitive(
    createScopeGroup(
      child,
      scopeTransforms,
      {
        clipRegistry: runtime.context.registries.clipRegistry,
        registerClip: runtime.state.workspace.clipRegistry.register,
        registerClipPath: runtime.state.workspace.clipRegistry.registerPath,
      },
      scopeIrPath,
      resolvedClipPath,
    ),
    stableSortByZIndex(scopePrimitives as Array<ScenePrimitive>, output.zIndexOf),
    child,
    { irPath: scopeIrPath, onWarn: runtime.state.workspace.diagnosticCollector.collect },
  );
  if (group === undefined) return;
  primitives.push(group);
  if (semanticOwner !== undefined)
    runtime.state.execution.provenanceTracker?.recordPrimitives([group], semanticOwner, 'scope');
  if (child.zIndex !== undefined) output.zIndexOf.set(group, child.zIndex);

  return group.clipRef;
};
