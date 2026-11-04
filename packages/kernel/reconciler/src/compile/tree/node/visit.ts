import {
  emitNodeOutput,
  compileNode,
  createNodeGeometryContext,
  projectLayoutWithTransform,
  resolveNode,
} from '@retikz/core';
import type { CompileOccurrenceLocator, IRNode } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import { compareCanonicalNodes } from '../../compare';
import type { CompileOwnerKey } from '../../provenance';
import { runCompileStage } from '../../runtime';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';
import { cloneAlignmentGuides } from '../shared';
import type { TreeOutputState } from '../shared';

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
  const {
    context: { transformChains: scopeChain, pathPrefix: locatorPrefix, inheritance: style, layout: layoutContext },
    state: {
      primitives,
      layoutContexts: layouts,
      publications,
      bounds,
      allocations,
      alignmentGuides: frameAlignmentGuides,
    },
  } = frame;
  const { defaults: scopeDefaults, theme } = style;
  const nodeIrPath = createCompileChildPath(locatorPrefix, index);

  const staged = runCompileStage(
    runtime,
    nodeIrPath,
    'node',
    { child, style, scopeChain, proposal: layoutContext?.childProposal },
    {
      resolveInputs: { child, style },
      compileInputs: { scopeChain, proposal: layoutContext?.childProposal },
      equals: compareCanonicalNodes,
      resolve: stageRuntime =>
        resolveNode(child, {
          ...stageRuntime.context.registries,
          ...stageRuntime.context.layout,
          gatingOn: stageRuntime.context.host.lowerTex !== undefined,
          scopeDefaults,
          mode: theme.mode,
          irPath: nodeIrPath,
          warn: (code, message, path = nodeIrPath) =>
            stageRuntime.state.workspace.diagnosticCollector.collect({ code, message, path }),
        }),
      compile: (stageRuntime, resolution, previous) => {
        const warn = (code: string, message: string, path: PropertyPath = nodeIrPath): void =>
          stageRuntime.state.workspace.diagnosticCollector.collect({ code, message, path });
        const compilation = compileNode(
          resolution,
          {
            round: stageRuntime.context.layout.round,
            registerPaint: stageRuntime.state.workspace.paintRegistry.register,
            irPath: nodeIrPath,
            measureText: stageRuntime.context.host.measureText,
            nodeBoundaryStore: stageRuntime.state.workspace.nodeBoundaryStore,
            positionContext: createTreePositionContext(stageRuntime, scopeChain),
            composedTransform: stageRuntime.state.execution.scopeTransformComposer.resolve(scopeChain),
            scopeChain,
            allocationWidthProposal: layoutContext?.childProposal?.x,
            texLowering: { lowerTex: stageRuntime.context.host.lowerTex, warn },
            warn,
          },
          previous,
        );

        return {
          canon: resolution,
          compiled: compilation,
        };
      },
    },
  );
  const compilation = staged.compiled;

  const layout = createNodeGeometryContext(staged.canon, compilation);
  const boundaryState = runtime.state.workspace.nodeBoundaryStore.get(layout);
  boundaryState.irPath = nodeIrPath;
  boundaryState.warn = (code, message) =>
    runtime.state.workspace.diagnosticCollector.collect({ code, message, path: nodeIrPath });
  if (child.id) {
    const globalLayout = projectLayoutWithTransform(
      layout,
      runtime.state.execution.scopeTransformComposer.resolve(scopeChain),
    );
    runtime.state.execution.namespaceStack.register(child.id, { context: globalLayout, irPath: [...nodeIrPath, 'id'] });
    child.aliasIds?.forEach((id, aliasIndex) =>
      runtime.state.execution.namespaceStack.register(id, {
        context: globalLayout,
        irPath: [...nodeIrPath, 'aliasIds', aliasIndex],
      }),
    );
    publications.push(globalLayout);
  }

  const output = emitNodeOutput(compilation, runtime.context.layout.round);
  const emittedPrimitives =
    runtime.state.execution.provenanceTracker?.materializePrimitives(output.primitives) ?? output.primitives;
  if (semanticOwner !== undefined) {
    runtime.state.execution.provenanceTracker?.recordPrimitives(emittedPrimitives, semanticOwner, 'node');
  }

  for (const prim of emittedPrimitives) {
    primitives.push(prim);
    if (child.zIndex !== undefined) outputState.zIndexOf.set(prim, child.zIndex);
  }

  bounds.push(...output.bounds);
  allocations.push({
    boundsPoints: output.bounds[0].boundsPoints,
    skipAllocation: layoutContext?.skipAllocation,
  });
  const alignmentGuides = compilation.layout.alignmentGuides;
  if (alignmentGuides !== undefined) {
    frameAlignmentGuides.push(...cloneAlignmentGuides(alignmentGuides, `Node '${formatPropertyPath(nodeIrPath)}'`));
  }

  layouts.push(layout);
};
