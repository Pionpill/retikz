import { compileScope, resolveScope } from '@retikz/core';
import type { IRScope, CompileWarning } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { compareProperties, jsonStructuralEquals, formatPropertyPath } from '@retikz/foundation';

import type { ScopeExecutionSteps, SubtreeCompileRuntime } from '../../compile/execution';
import { createCompileObservation } from '../../compile/runtime';
import type { CompileRuntime } from '../../compile/runtime';
import { matchWeaveReferences, restoreWeaveResources } from '../shared';
import type { WeaveNode } from '../shared';
import { compareCanonicalScopes } from './compare';

type WeaveScopeState = NonNullable<Extract<WeaveNode, { type: 'scope' }>['current']>;

/** 在后代继承前选择或确定 Scope 自身配置 */
export const resolveWeaveScope = (
  runtime: CompileRuntime,
  child: IRScope,
  path: PropertyPath,
  context: SubtreeCompileRuntime['context'],
  previous?: WeaveScopeState,
) => {
  const resolveInputs = { child: { ...child, children: undefined }, inheritedStyle: context.inheritance };
  if (
    previous?.canon != null &&
    previous.cache?.diagnostics.length === 0 &&
    compareProperties(previous.cache.resolveInputs, resolveInputs, { depth: 2 })
  )
    return previous.canon;
  return resolveScope(child, {
    nodeDistance: runtime.context.layout.nodeDistance,
    parent: context.inheritance,
    ...runtime.context.registries,
    irPath: path,
    themePath: `${formatPropertyPath(path)}.theme`,
  });
};

/** 子布局就绪后由 Weave 直接计算或复用 Scope 包络 */
export const executeWeaveScope = (
  runtime: CompileRuntime,
  child: Omit<IRScope, 'children'>,
  context: SubtreeCompileRuntime['context'],
  steps: ScopeExecutionSteps,
  preparedDiagnostics: ReadonlyArray<CompileWarning>,
  previous?: WeaveScopeState,
) => {
  const resolveInputs = { child: { ...child, children: undefined }, inheritedStyle: context.inheritance };
  const compileInputs = {
    preparation: steps.preparation,
    layouts: steps.childFrame.state.geometries,
    scopeChain: context.transformChains,
    childCount: steps.childFrame.state.primitives.length,
    preResolvedClipPath: steps.compileContext.resolvedClipPath,
  };
  const cache = previous?.cache;
  const canon = steps.canon;
  if (
    previous?.canon != null &&
    previous.compiled != null &&
    cache?.diagnostics.length === 0 &&
    preparedDiagnostics.length === 0 &&
    compareCanonicalScopes(previous.canon, canon) &&
    jsonStructuralEquals(cache.compileInputs, compileInputs) &&
    matchWeaveReferences(cache.reads, runtime.state.execution.namespaceStack)
  ) {
    restoreWeaveResources(runtime, cache);
    return {
      canon,
      compiled: previous.compiled,
      cache: { ...cache, resolveInputs, compileInputs, scopePreparation: steps.preparation },
      reused: true,
    };
  }
  const observation = createCompileObservation(runtime);
  const local = observation.runtime;
  const compiled = runtime.state.execution.namespaceStack.observeReferences(observation.read, () =>
    compileScope(
      canon,
      {
        ...steps.compileContext,
        registerClip: local.state.workspace.clipRegistry.register,
        registerClipPath: local.state.workspace.clipRegistry.registerPath,
        onWarn: local.state.workspace.diagnosticCollector.collect,
      },
      { layout: { preparation: steps.preparation } },
    ),
  );
  const facts = observation.facts();
  return {
    canon,
    compiled,
    cache: {
      ...facts,
      resolveInputs,
      compileInputs,
      scopePreparation: steps.preparation,
      reads: [...steps.preparedReads, ...facts.reads],
      diagnostics: [...preparedDiagnostics, ...facts.diagnostics],
    },
    reused: false,
  };
};
