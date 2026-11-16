import { compileScope, resolveScope } from '@retikz/core';
import type { IRScope, CompileWarning } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { compareProperties, formatPropertyPath } from '@retikz/foundation';

import type { CompileRuntime, ScopeExecutionSteps, SubtreeCompileRuntime } from '../../compile';
import { createWeaveObservation, matchWeaveReferences, restoreWeaveResources } from '../shared';
import type { WeaveScopeState, WeaveReferenceRead } from '../shared';
import { compareCanonicalScopes, compareScopeCompileInputs } from './compare';

/** 在后代继承前选择或确定 Scope 自身配置 */
export const resolveWeaveScope = (
  runtime: CompileRuntime,
  child: Omit<IRScope, 'children'>,
  path: PropertyPath,
  context: SubtreeCompileRuntime['context'],
  previous?: WeaveScopeState,
) => {
  if (
    previous?.resolve?.value != null &&
    previous.compile?.diagnostics.length === 0 &&
    compareProperties(previous.resolve.input, child) &&
    compareProperties(previous.resolve.context.inheritedStyle, context.inheritance)
  )
    return previous.resolve.value;
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
  preparedReads: ReadonlyArray<WeaveReferenceRead>,
  previous?: WeaveScopeState,
) => {
  const compileInputs = {
    preparation: steps.preparation,
    layouts: steps.childFrame.state.geometries,
    scopeChain: context.transformChains,
    childCount: steps.childFrame.state.primitives.length,
    preResolvedClipPath: steps.compileContext.resolvedClipPath,
  };
  const previousCompile = previous?.compile;
  const previousReads = previous?.referenceReads ?? [];
  const canon = steps.canon;
  if (
    previous?.resolve?.value != null &&
    previous.compile != null &&
    previousCompile?.diagnostics.length === 0 &&
    preparedDiagnostics.length === 0 &&
    compareCanonicalScopes(previous.resolve.value, canon) &&
    compareScopeCompileInputs(previousCompile.context, compileInputs) &&
    matchWeaveReferences(previousReads, runtime.state.execution.namespaceStack)
  ) {
    restoreWeaveResources(runtime, previousCompile.resources);
    return {
      resolve: { input: child, context: { inheritedStyle: context.inheritance }, value: canon },
      compile: { ...previousCompile, context: compileInputs },
      referenceReads: previousReads,
      reused: true,
    };
  }
  const observation = createWeaveObservation(runtime);
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
    resolve: { input: child, context: { inheritedStyle: context.inheritance }, value: canon },
    compile: {
      ...facts,
      context: compileInputs,
      value: compiled,
      diagnostics: [...preparedDiagnostics, ...facts.diagnostics],
    },
    referenceReads: [...preparedReads, ...observation.reads],
    reused: false,
  };
};
