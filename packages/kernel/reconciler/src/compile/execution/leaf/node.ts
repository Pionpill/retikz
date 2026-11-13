import type {
  CompileOccurrenceLocator,
  IRNode,
  CanonicalNode,
  CompiledNode,
  NodeCompileContext,
  NodeResolveContext,
} from '@retikz/core';
import { compileNode, projectLayoutWithTransform, projectNodeGeometry, resolveNode } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';

import type { CompileOwnerKey } from '../../provenance';
import type { CompileRuntime } from '../../runtime';
import { createCompileObservation } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import type { TreeOutputState } from '../shared';
import { createTreePositionContext } from '../shared';
import type { SubtreeCompileRuntime } from '../subtree';

/** 布局并 emit node，同时注册 id、收集边界点和父 scope layout 输入 */
export const visitNode = (
  runtime: CompileRuntime,
  outputState: TreeOutputState,
  child: IRNode,
  index: number,
  frame: SubtreeCompileRuntime,
  occurrence?: CompileOccurrenceLocator,
  semanticOwner?: CompileOwnerKey,
): void => {
  const nodeIrPath = createCompileChildPath(frame.context.pathPrefix, index);
  const observation = runtime.onCompiled === undefined ? undefined : createCompileObservation(runtime);
  const local = observation?.runtime ?? runtime;
  const canon = resolveNode(child, createNodeResolveContext(local, nodeIrPath, frame.context));
  const context = createNodeCompileContext(local, canon, nodeIrPath, frame.context);
  const compiled =
    observation === undefined
      ? compileNode(canon, context)
      : runtime.state.execution.namespaceStack.observeReferences(observation.read, () => compileNode(canon, context));
  runtime.onCompiled?.(nodeIrPath, frame.context, { kind: 'node', canon, compiled }, observation!.facts());
  assembleNodeOutput(runtime, outputState, child, nodeIrPath, frame, compiled, semanticOwner);
};

/** 发布已完成的 Node 产物，不选择计算或缓存 */
export const assembleNodeOutput = (
  runtime: CompileRuntime,
  outputState: TreeOutputState,
  child: IRNode,
  nodeIrPath: PropertyPath,
  frame: SubtreeCompileRuntime,
  compilation: CompiledNode,
  semanticOwner?: CompileOwnerKey,
): void => {
  const {
    context: { transformChains: scopeChain, layout: layoutContext },
    state: {
      primitives,
      geometries: layouts,
      publications,
      bounds,
      allocations,
      alignmentGuides: frameAlignmentGuides,
    },
  } = frame;
  const layout = projectNodeGeometry(compilation);
  const boundaryState = runtime.state.workspace.boundaryStore.getOrCreateState(layout.shape);
  boundaryState.irPath = nodeIrPath;
  boundaryState.warn = (code, message) =>
    runtime.state.workspace.diagnosticCollector.collect({ code, message, path: nodeIrPath });
  if (child.id) {
    const globalLayout = projectLayoutWithTransform(
      layout,
      runtime.state.execution.scopeTransformComposer.resolve(scopeChain),
    );
    runtime.state.execution.namespaceStack.register(child.id, {
      geometry: globalLayout,
      irPath: [...nodeIrPath, 'id'],
    });
    child.aliasIds?.forEach((id, aliasIndex) =>
      runtime.state.execution.namespaceStack.register(id, {
        geometry: globalLayout,
        irPath: [...nodeIrPath, 'aliasIds', aliasIndex],
      }),
    );
    publications.push(globalLayout);
  }

  const output = compilation.emit.overall;
  const emittedPrimitives =
    runtime.state.execution.provenanceTracker?.materializePrimitives(output.primitives) ?? output.primitives;
  if (semanticOwner !== undefined) {
    runtime.state.execution.provenanceTracker?.recordPrimitives(emittedPrimitives, semanticOwner, 'node');
  }

  for (const prim of emittedPrimitives) {
    primitives.push(prim);
    if (child.zIndex !== undefined) outputState.zIndexMap.set(prim, child.zIndex);
  }

  bounds.push(...output.bounds);
  allocations.push({
    boundsPoints: output.bounds[0].boundsPoints,
    skipAllocation: layoutContext?.skipAllocation,
  });
  const alignmentGuides = compilation.alignmentGuides;
  if (alignmentGuides !== undefined) {
    frameAlignmentGuides.push(...alignmentGuides);
  }

  layouts.push(layout);
};

/** 创建全量与增量共用的 Node 确定化上下文 */
export const createNodeResolveContext = (
  runtime: CompileRuntime,
  irPath: PropertyPath,
  context: SubtreeCompileRuntime['context'],
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
  context: SubtreeCompileRuntime['context'],
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
