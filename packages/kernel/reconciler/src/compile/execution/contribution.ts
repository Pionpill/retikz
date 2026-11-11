import type { CompileWarning, ScenePrimitive, SceneResource } from '@retikz/core';
import { visitSceneContent } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

import type { CompileOwnerKey, CompileProvenanceSnapshot } from '../provenance';
import type { CompileReferenceRead, CompileRuntime, NamespaceFrameChange } from '../runtime';
import { importSceneResources } from '../shared';
import type { SubtreeCompileState } from './runtime';
import type { TreeOutputState } from './shared';

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

/** 在当前候选重新物化贡献与名称，保持已提交状态只读 */
export const materializeCompileContribution = (
  runtime: CompileRuntime,
  output: TreeOutputState,
  contribution: CompileContribution,
  semanticOwner?: CompileOwnerKey,
): SubtreeCompileState => {
  const { namespaceStack, provenanceTracker } = runtime.state.execution;
  const { paintRegistry, clipRegistry } = runtime.state.workspace;
  importSceneResources(contribution.resources, paintRegistry, clipRegistry);
  const primitives = provenanceTracker?.materializePrimitives(contribution.output.primitives) ?? [
    ...contribution.output.primitives,
  ];
  if (semanticOwner !== undefined && contribution.provenance !== undefined)
    provenanceTracker?.importProvenance(
      contribution.provenance,
      primitives,
      semanticOwner,
      0,
      namespaceStack.identity,
      true,
    );
  for (const [index, primitive] of primitives.entries()) {
    const zIndex = contribution.zIndices[index];
    if (zIndex !== undefined) output.zIndexOf.set(primitive, zIndex);
  }
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
