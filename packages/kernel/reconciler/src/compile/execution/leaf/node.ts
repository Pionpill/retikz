import type { IRNode, CanonicalNode, CompiledNode, NodeCompileContext, NodeResolveContext } from '@retikz/core';
import { compileNode, projectLayoutWithTransform, projectNodeGeometry, resolveNode } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

import type { CompileOwnerKey } from '../../provenance';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import type { TreeOutputState } from '../shared';
import { createTreePositionContext } from '../shared';
import type { SubtreeCompileContext, SubtreeCompileRuntime } from '../subtree';

/** 布局并 emit node，同时注册 id、收集边界点和父 scope layout 输入 */
export const visitNode = (
  runtime: CompileRuntime,
  outputState: TreeOutputState,
  ir: IRNode,
  index: number,
  frame: SubtreeCompileRuntime,
  semanticOwner?: CompileOwnerKey,
): void => {
  const nodeIrPath = createCompileChildPath(frame.context.pathPrefix, index);
  const canon = resolveNode(ir, createNodeResolveContext(runtime, nodeIrPath, frame.context));
  const compiled = compileNode(canon, createNodeCompileContext(runtime, canon, nodeIrPath, frame.context));
  assembleNode(runtime, outputState, ir, nodeIrPath, frame, compiled, semanticOwner);
};

/** 发布已完成的 Node 产物，不选择计算或缓存 */
export const assembleNode = (
  runtime: CompileRuntime,
  outputState: TreeOutputState,
  ir: IRNode,
  nodeIrPath: PropertyPath,
  frame: SubtreeCompileRuntime,
  compiled: CompiledNode,
  semanticOwner?: CompileOwnerKey,
): void => {
  const {
    context: { transformChains, layout },
    state: { primitives, geometries, publications, bounds, allocations, alignmentGuides },
  } = frame;
  const nodeGeometry = projectNodeGeometry(compiled);
  const boundaryState = runtime.state.workspace.boundaryStore.getOrCreateState(nodeGeometry.shape);
  boundaryState.irPath = nodeIrPath;
  boundaryState.warn = (code, message) =>
    runtime.state.workspace.diagnosticCollector.collect({ code, message, path: nodeIrPath });
  if (ir.id) {
    const globalLayout = projectLayoutWithTransform(
      nodeGeometry,
      runtime.state.execution.scopeTransformComposer.resolve(transformChains),
    );
    runtime.state.execution.namespaceStack.register(ir.id, {
      geometry: globalLayout,
      irPath: [...nodeIrPath, 'id'],
    });
    ir.aliasIds?.forEach((id, aliasIndex) =>
      runtime.state.execution.namespaceStack.register(id, {
        geometry: globalLayout,
        irPath: [...nodeIrPath, 'aliasIds', aliasIndex],
      }),
    );
    publications.push(globalLayout);
  }

  const output = compiled.emit.overall;
  const emittedPrimitives =
    runtime.state.execution.provenanceTracker?.materializePrimitives(output.primitives) ?? output.primitives;
  if (semanticOwner !== undefined) {
    runtime.state.execution.provenanceTracker?.recordPrimitives(emittedPrimitives, semanticOwner, 'node');
  }

  for (const prim of emittedPrimitives) {
    primitives.push(prim);
    if (ir.zIndex !== undefined) outputState.zIndexMap.set(prim, ir.zIndex);
  }

  bounds.push(...output.bounds);
  allocations.push({
    boundsPoints: output.bounds[0].boundsPoints,
    skipAllocation: layout?.skipAllocation,
  });
  const nodeAlignmentGuides = compiled.alignmentGuides;
  if (nodeAlignmentGuides !== undefined) {
    alignmentGuides.push(...nodeAlignmentGuides);
  }

  if (!frame.context.skipGeometries) geometries.push(nodeGeometry);
};

/** 创建全量与增量共用的 Node 确定化上下文 */
export const createNodeResolveContext = (
  runtime: CompileRuntime,
  irPath: PropertyPath,
  context: SubtreeCompileContext,
): NodeResolveContext => ({
  ...runtime.context.registries,
  ...runtime.context.layout,
  gatingOn: runtime.context.host.lowerTex !== undefined,
  scopeDefaults: context.inheritance.defaults,
  mode: context.inheritance.theme.mode,
  irPath,
  warn: (code, message, path = irPath) => runtime.state.workspace.diagnosticCollector.collect({ code, message, path }),
});

/** 创建 Node 计算上下文，不选择缓存 */
export const createNodeCompileContext = (
  runtime: CompileRuntime,
  canon: CanonicalNode,
  irPath: PropertyPath,
  context: SubtreeCompileContext,
): NodeCompileContext => {
  const warn = (code: string, message: string, path: PropertyPath = irPath): void =>
    runtime.state.workspace.diagnosticCollector.collect({ code, message, path });
  const boundaryState = runtime.state.workspace.boundaryStore.getOrCreateState(canon.shape);
  boundaryState.warn = warn;
  boundaryState.irPath = irPath;
  return {
    round: runtime.context.layout.round,
    registerPaint: runtime.state.workspace.paintRegistry.register,
    irPath,
    measureText: runtime.context.host.measureText,
    boundaryState,
    positionContext: createTreePositionContext(runtime, context.transformChains),
    composedTransform: runtime.state.execution.scopeTransformComposer.resolve(context.transformChains),
    scopeChain: context.transformChains,
    allocationWidthProposal: context.layout?.childProposal?.x,
    texLowering: { lowerTex: runtime.context.host.lowerTex, warn },
    warn,
  };
};
