import {
  calculateScopeEnvelopeBounds,
  compileScopeRectangleEnvelope,
  ScopeBoundingShape,
  compileScope,
  resolveScope,
} from '@retikz/core';
import type { IRScope, CompileWarning } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { jsonStructuralEquals, formatPropertyPath } from '@retikz/foundation';

import type { CompileRuntime, ScopeExecutionSteps, SubtreeCompileContext } from '../../../compile';
import { createWeaveObservation, matchWeaveReferences, restoreWeaveResources } from '../../shared';
import type { WeaveStages, WeaveScopeState, WeaveReferenceRead } from '../../shared';
import { compareScopeCompileProperties, compareScopeCompileInputs, retainCanonicalScope } from './compare';
import { updateWeaveScopeEnvelope } from './envelope';

/** 在后代执行前，按自身输入与继承上下文复用或解析 Scope 配置 */
export const resolveWeaveScope = (
  runtime: CompileRuntime,
  child: Omit<IRScope, 'children'>,
  path: PropertyPath,
  context: SubtreeCompileContext,
  previous?: WeaveStages<WeaveScopeState>,
  themePath?: string,
) => {
  // 1. 输入与继承上下文相同且旧编译无诊断时，复用供后代继承的 canon
  if (
    previous?.resolve?.value != null &&
    previous.compile?.diagnostics.length === 0 &&
    jsonStructuralEquals(previous.resolve.input, child) &&
    jsonStructuralEquals(previous.resolve.context.inheritedStyle, context.inheritance)
  )
    return previous.resolve.value;

  // 2. 重新解析自身配置，并保留与旧值等价的子产物
  return retainCanonicalScope(
    previous?.resolve?.value,
    resolveScope(child, {
      nodeDistance: runtime.context.layout.nodeDistance,
      parent: context.inheritance,
      ...runtime.context.registries,
      irPath: path,
      themePath: themePath ?? `${formatPropertyPath(path)}.theme`,
    }),
  );
};

/** 子布局就绪后，按 Scope 配置、编译上下文与引用依赖复用或重新计算包络 */
export const executeWeaveScope = (
  runtime: CompileRuntime,
  child: Omit<IRScope, 'children'>,
  context: SubtreeCompileContext,
  steps: ScopeExecutionSteps,
  preparedDiagnostics: ReadonlyArray<CompileWarning>,
  preparedReads: ReadonlyArray<WeaveReferenceRead>,
  previous?: WeaveStages<WeaveScopeState>,
) => {
  // 1. 以已完成的准备结果、子布局和变换等通道作为编译复用依据
  const compileInputs = {
    preparation: steps.preparation,
    layouts: steps.compileContext.layouts,
    scopeChain: context.transformChains,
    childCount: steps.childFrame.state.primitives.length,
    preResolvedClipPath: steps.compileContext.resolvedClipPath,
  };
  const previousCompile = previous?.compile;
  const previousReads = previous?.referenceReads ?? [];
  const canon = steps.canon;

  // 2. 配置、编译上下文与引用均有效且新旧诊断为空时，恢复资源并复用包络
  if (
    previous?.resolve?.value != null &&
    previous.compile != null &&
    previousCompile?.diagnostics.length === 0 &&
    preparedDiagnostics.length === 0 &&
    compareScopeCompileProperties(previous.resolve.value, canon) &&
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

  // 3. 重新计算包络，并合并准备阶段与本轮编译的诊断和读取事实
  const envelopeBounds =
    steps.unusedEnvelope !== undefined || canon.envelope.kind === ScopeBoundingShape.Circle
      ? undefined
      : previousCompile?.envelopeBounds !== undefined &&
          previous?.resolve?.value.envelope.kind !== ScopeBoundingShape.Circle
        ? updateWeaveScopeEnvelope(
            compileInputs.layouts,
            previousCompile.context.layouts,
            previousCompile.envelopeBounds,
          )
        : calculateScopeEnvelopeBounds(compileInputs.layouts);
  const envelope =
    steps.unusedEnvelope ??
    (canon.envelope.kind === ScopeBoundingShape.Circle ? undefined : compileScopeRectangleEnvelope(envelopeBounds));
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
      { layout: { preparation: steps.preparation, envelope } },
    ),
  );
  const facts = observation.facts();
  return {
    resolve: { input: child, context: { inheritedStyle: context.inheritance }, value: canon },
    compile: {
      ...facts,
      envelopeBounds,
      context: compileInputs,
      value: compiled,
      diagnostics: [...preparedDiagnostics, ...facts.diagnostics],
    },
    referenceReads: [...preparedReads, ...observation.reads],
    reused: false,
  };
};
