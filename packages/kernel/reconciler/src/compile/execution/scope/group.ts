import type {
  CanonicalScope,
  CompiledScope,
  CompileWarning,
  GroupPrimitive,
  ScenePrimitive,
  ScopeCompileContext,
  Transform,
} from '@retikz/core';
import { compileScope, resolveAnimations } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

import type { CompileRuntime } from '../../runtime';
import type { TreeOutputState } from '../shared';
import type { EmitScopeGroupContext } from './types';

/** 判断 Scope 是否需要保留可见分组，空匿名分组可被裁去 */
export const shouldEmitScopeGroup = (
  childCount: number,
  transforms: ReadonlyArray<Transform>,
  id: string | undefined,
  hasClip: boolean,
): boolean => childCount > 0 || transforms.length > 0 || id !== undefined || hasClip;

/** 在需要可见输出时 emit scope group，并挂载 transform、clip 和动画 */
export const emitScopeGroup = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  compiled: CompiledScope,
  input: EmitScopeGroupContext,
): string | undefined => {
  const { scopePrimitives, frame, semanticOwner } = input;
  const {
    state: { primitives },
  } = frame;
  const { zIndex } = compiled;
  const attributes = compiled.emit.overall;
  if (
    !shouldEmitScopeGroup(
      scopePrimitives.length,
      attributes.transforms ?? [],
      attributes.id,
      attributes.clipRef !== undefined,
    )
  )
    return;
  const group: GroupPrimitive = {
    ...attributes,
    children: (scopePrimitives as Array<ScenePrimitive>).sort(
      (a, b) => (output.zIndexMap.get(a) ?? 0) - (output.zIndexMap.get(b) ?? 0),
    ),
  };
  primitives.push(group);
  if (semanticOwner !== undefined)
    runtime.state.execution.provenanceTracker?.recordPrimitives([group], semanticOwner, 'scope');
  if (zIndex !== undefined) output.zIndexMap.set(group, zIndex);

  return group.clipRef;
};

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
