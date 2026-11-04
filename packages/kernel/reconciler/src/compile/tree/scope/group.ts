import type { CompiledScope, ScenePrimitive } from '@retikz/core';
import { createScopeGroup, emitScopePrimitive } from '@retikz/core';

import type { CompileRuntime } from '../../runtime';
import type { TreeOutputState } from '../shared';
import { stableSortByZIndex } from '../shared';
import type { EmitScopeGroupContext } from './visit-types';

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
  const { style } = compiled;
  const group = emitScopePrimitive(
    createScopeGroup(compiled),
    stableSortByZIndex(scopePrimitives as Array<ScenePrimitive>, output.zIndexOf),
  );
  if (group === undefined) return;
  primitives.push(group);
  if (semanticOwner !== undefined)
    runtime.state.execution.provenanceTracker?.recordPrimitives([group], semanticOwner, 'scope');
  if (style.zIndex !== undefined) output.zIndexOf.set(group, style.zIndex);

  return group.clipRef;
};
