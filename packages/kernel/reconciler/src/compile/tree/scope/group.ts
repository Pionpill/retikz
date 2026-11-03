import type { IRScope, ScenePrimitive } from '@retikz/core';
import { createScopeGroup, emitScopePrimitive } from '@retikz/core';

import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import type { TreeOutputState } from '../shared';
import { stableSortByZIndex } from '../shared';
import type { EmitScopeGroupContext } from './visit-types';

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
