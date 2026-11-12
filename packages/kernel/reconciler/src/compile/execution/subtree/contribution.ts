import type { CompileOccurrenceLocator, CompileWarning, ScenePrimitive, SceneResource } from '@retikz/core';
import { visitSceneContent } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { isPropertyPathEqual } from '@retikz/foundation';

import type { CompileOwnerKey, CompileNamespaceKey, CompileProvenanceSnapshot } from '../../provenance';
import type { CompileReferenceRead, CompileRuntime, NamespaceFrameChange } from '../../runtime';
import { importSceneResources, compileWarningOccurrenceOf } from '../../shared';
import type { TreeOutputState } from '../shared';
import type { SubtreeCompileState } from './compile';

/** 作者实例已经完成的输出贡献，不包含 probe token、回调或可写工作区 */
export type CompileContribution = {
  /** 局部输出与父布局贡献 */
  output: Omit<SubtreeCompileState, 'primitives' | 'paths'> & { primitives: Array<ScenePrimitive> };
  /** 与局部图元对应的绘制顺序 */
  zIndices: Array<number | undefined>;
  /** 实例向当前名称空间提交的声明 */
  bindings: Array<NamespaceFrameChange>;
  /** 实例实际读取的外部或内部名称 */
  reads: Array<CompileReferenceRead>;
  /** 图元引用的资源闭包 */
  resources: Array<SceneResource>;
  /** 实例诊断；有诊断时由驱动决定重新计算 */
  diagnostics: Array<CompileWarning>;
  /** 可重新绑定到当前来源树的局部事实 */
  provenance?: CompileProvenanceSnapshot;
};

/** 驱动持有贡献有效性和存储，组装层只消费已选定的贡献 */
export type CompileContributionController = {
  write: (path: PropertyPath, contribution: CompileContribution) => void;
};

/** 从已物化图元收集真实资源依赖，避免保留其它实例的资源 */
export const collectContributionResources = (
  primitives: Array<ScenePrimitive>,
  resources: Array<SceneResource>,
): Array<SceneResource> => {
  const retained = new Set<string>();
  visitSceneContent({ primitives, resources }, primitive => {
    if (primitive.type === 'group') {
      if (primitive.clipRef !== undefined) retained.add(primitive.clipRef);
    } else if (primitive.type !== 'text') {
      for (const paint of [primitive.fill, primitive.stroke])
        if (typeof paint === 'object' && paint.kind === 'resourceRef') retained.add(paint.id);
    }
  });
  return resources.filter(resource => retained.has(resource.id));
};

/** 从已完成的局部输出捕获可复用贡献，不执行领域计算 */
export const captureCompileContribution = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  state: SubtreeCompileState,
  bindings: Array<NamespaceFrameChange>,
  reads: Array<CompileReferenceRead>,
  occurrence: CompileOccurrenceLocator,
  semanticOwner?: CompileOwnerKey,
): CompileContribution => {
  const primitives = state.primitives as Array<ScenePrimitive>;
  const workspace = runtime.state.workspace;
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
    zIndices: primitives.map(primitive => output.zIndexOf.get(primitive)),
    bindings,
    reads,
    resources: collectContributionResources(primitives, [
      ...workspace.paintRegistry.getResources(),
      ...workspace.clipRegistry.getResources(),
    ]),
    diagnostics: workspace.diagnosticCollector.warnings.filter(warning =>
      isPropertyPathEqual(compileWarningOccurrenceOf(warning).sourcePath, occurrence.sourcePath),
    ),
    provenance:
      semanticOwner === undefined
        ? undefined
        : runtime.state.execution.provenanceTracker?.captureContribution(primitives, semanticOwner),
  };
};

/** 只物化绘制、资源与来源，不建立计算环境或重新发布名称 */
export const materializeCompileOutput = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  contribution: CompileContribution,
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
    if (zIndex !== undefined) output.zIndexOf.set(primitive, zIndex);
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
export const materializeCompileContribution = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  contribution: CompileContribution,
  semanticOwner?: CompileOwnerKey,
): SubtreeCompileState => {
  const state = materializeCompileOutput(runtime, output, contribution, semanticOwner);
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
