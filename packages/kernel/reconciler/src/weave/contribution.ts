import type { ScenePrimitive, CompileOccurrenceLocator } from '@retikz/core';
import { isPropertyPathEqual } from '@retikz/foundation';

import type { SubtreeCompileState, TreeOutputState } from '../compile/execution';
import type { CompileOwnerKey, CompileNamespaceKey, CompileProvenanceOwner } from '../compile/provenance';
import type { CompileRuntime, NamespaceFrameChange } from '../compile/runtime';
import { importSceneResources, compileWarningOccurrenceOf } from '../compile/shared';
import { collectContributionResources } from './shared';
import type { WeaveContribution, WeaveContributionRead } from './shared';

/** 从已完成的局部输出捕获可复用贡献，不执行领域计算 */
export const captureWeaveContribution = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  state: SubtreeCompileState,
  bindings: ReadonlyArray<NamespaceFrameChange>,
  reads: ReadonlyArray<WeaveContributionRead>,
  occurrence: CompileOccurrenceLocator,
  semanticOwner?: CompileOwnerKey,
): WeaveContribution => {
  const primitives = state.primitives as Array<ScenePrimitive>;
  const workspace = runtime.state.workspace;
  const captureProvenance = () => {
    const tracker = runtime.state.execution.provenanceTracker;
    if (semanticOwner === undefined || tracker === undefined) return;
    const snapshot = tracker.capture(primitives);
    const owners = new Map<CompileOwnerKey, CompileProvenanceOwner>();
    owners.set(semanticOwner, snapshot.ownerMap.get(semanticOwner)!);
    for (const [key, entry] of snapshot.ownerMap)
      if (entry.parent !== undefined && owners.has(entry.parent)) owners.set(key, entry);
    return { root: semanticOwner, ownerMap: owners };
  };
  return {
    output: {
      primitives,
      geometries: state.geometries,
      publications: state.publications,
      bounds: state.bounds,
      allocations: state.allocations,
      alignmentGuides: state.alignmentGuides,
      artifacts: state.artifacts,
    },
    zIndices: primitives.map(primitive => output.zIndexMap.get(primitive)),
    bindings,
    reads,
    resources: collectContributionResources(primitives, {
      paints: workspace.paintRegistry.getResources(),
      clips: workspace.clipRegistry.getResources(),
    }),
    diagnostics: workspace.diagnosticCollector.warnings.filter(warning =>
      isPropertyPathEqual(compileWarningOccurrenceOf(warning).sourcePath, occurrence.sourcePath),
    ),
    provenance: captureProvenance(),
  };
};

/** 只物化绘制、资源与来源，不建立计算环境或重新发布名称 */
export const materializeWeaveOutput = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  contribution: WeaveContribution,
  semanticOwner?: CompileOwnerKey,
  namespace: CompileNamespaceKey = runtime.state.execution.namespaceStack.identity,
): SubtreeCompileState => {
  const { provenanceTracker } = runtime.state.execution;
  const { paintRegistry, clipRegistry } = runtime.state.workspace;
  importSceneResources(contribution.resources, paintRegistry, clipRegistry);
  const primitives = provenanceTracker?.materializePrimitives(contribution.output.primitives) ?? [
    ...contribution.output.primitives,
  ];
  if (semanticOwner !== undefined && contribution.provenance !== undefined)
    provenanceTracker?.importProvenance(contribution.provenance, primitives, semanticOwner, 0, namespace, true);
  for (const [index, primitive] of primitives.entries()) {
    const zIndex = contribution.zIndices[index];
    if (zIndex !== undefined) output.zIndexMap.set(primitive, zIndex);
  }
  return {
    primitives,
    paths: [],
    geometries: [...contribution.output.geometries],
    publications: [...contribution.output.publications],
    bounds: [...contribution.output.bounds],
    allocations: [...contribution.output.allocations],
    alignmentGuides: [...contribution.output.alignmentGuides],
    artifacts: [...contribution.output.artifacts],
  };
};

/** 在计算工作区物化贡献并重放其已确认有效的名称 */
export const materializeWeaveContribution = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  contribution: WeaveContribution,
  semanticOwner?: CompileOwnerKey,
): SubtreeCompileState => {
  const state = materializeWeaveOutput(runtime, output, contribution, semanticOwner);
  const namespaceStack = runtime.state.execution.namespaceStack;
  const scopeIds = new Map<string, string>();
  for (const binding of contribution.bindings) {
    const oldScopeId = binding.entry.scopeId;
    let scopeId: string | undefined;
    if (oldScopeId !== undefined) {
      scopeId = scopeIds.get(oldScopeId);
      if (scopeId === undefined) scopeIds.set(oldScopeId, (scopeId = namespaceStack.allocateScopeId()));
    }
    namespaceStack.commitForkChange({ ...binding, entry: { ...binding.entry, scopeId } });
  }
  return state;
};
