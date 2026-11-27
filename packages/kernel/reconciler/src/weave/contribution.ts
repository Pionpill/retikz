import type { ScenePrimitive, SceneResources, CompileOccurrenceLocator } from '@retikz/core';
import { isPropertyPathEqual } from '@retikz/foundation';

import type {
  CompileNamespaceKey,
  CompileOwnerKey,
  CompileProvenanceOwner,
  CompileRuntime,
  NamespaceFrameChange,
  SubtreeCompileState,
  TreeOutputState,
} from '../compile';
import { captureLeafProvenance, compileWarningOccurrenceOf, importSceneResources } from '../compile';
import { collectContributionResources } from './shared';
import type { WeaveContribution } from './shared';

/** 从已完成的局部输出捕获可复用贡献，不执行领域计算 */
export const captureWeaveContribution = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  state: SubtreeCompileState,
  bindings: ReadonlyArray<NamespaceFrameChange>,
  resources: SceneResources,
  occurrence: CompileOccurrenceLocator,
  isLeaf: boolean,
  semanticOwner?: CompileOwnerKey,
): WeaveContribution => {
  const primitives = state.primitives as Array<ScenePrimitive>;
  const workspace = runtime.state.workspace;
  const captureProvenance = () => {
    const tracker = runtime.state.execution.provenanceTracker;
    if (semanticOwner === undefined || tracker === undefined) return;
    if (isLeaf) return tracker[captureLeafProvenance](primitives, semanticOwner);
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
    // ⚡基础元素只扫描已记录的局部资源，避免逐元素重建全局资源索引
    resources: collectContributionResources(primitives, resources),
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
): WeaveContribution['output'] => {
  const { provenanceTracker } = runtime.state.execution;
  const { paintRegistry, clipRegistry } = runtime.state.workspace;
  importSceneResources(contribution.resources, paintRegistry, clipRegistry);
  const primitives =
    provenanceTracker?.materializePrimitives(contribution.output.primitives) ?? contribution.output.primitives;
  if (semanticOwner !== undefined && contribution.provenance !== undefined)
    provenanceTracker?.importProvenance(contribution.provenance, primitives, semanticOwner, 0, namespace, true);
  for (const [index, primitive] of primitives.entries()) {
    const zIndex = contribution.zIndices[index];
    if (zIndex !== undefined) output.zIndexMap.set(primitive, zIndex);
  }
  // ⚡父容器只读取并追加这些数组；来源重绑仅替换图元，不复制其余只读贡献
  return primitives === contribution.output.primitives ? contribution.output : { ...contribution.output, primitives };
};

/** 在计算工作区物化贡献并重放其已确认有效的名称 */
export const materializeWeaveContribution = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  contribution: WeaveContribution,
  semanticOwner?: CompileOwnerKey,
): WeaveContribution['output'] => {
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
