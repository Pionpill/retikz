import {
  alignmentGuidesOfNode,
  cloneAlignmentGuides,
  emitNodeOutput,
  layoutNode,
  projectLayoutWithTransform,
  resolveNode,
} from '@retikz/core';
import type { CompileOccurrenceLocator, IRNode } from '@retikz/core';
import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOwnerKey } from '../../provenance';
import { runCompileStage } from '../../runtime';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';
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
    context: {
      transformChains: scopeChain,
      pathPrefix: locatorPrefix,
      style: { defaults: scopeDefaults },
    },
    state: { primitives, layouts },
  } = frame;
  const nodeIrPath = createCompileChildPath(locatorPrefix, index);

  const staged = runCompileStage(
    runtime,
    nodeIrPath,
    'node',
    { child, style: frame.context.style, scopeChain, proposal: frame.context.layout?.childProposal },
    stageRuntime => {
      const warn = (code: string, message: string, path: PropertyPath = nodeIrPath): void =>
        stageRuntime.state.workspace.diagnosticCollector.collect({ code, message, path });
      const resolution = resolveNode(child, {
        ...stageRuntime.context.registries,
        ...stageRuntime.context.layout,
        scopeDefaults,
        mode: frame.context.style.theme.mode,
        irPath: nodeIrPath,
        warn,
      });
      const compilation = layoutNode(resolution, {
        measureText: stageRuntime.context.host.measureText,
        nodeBoundaryStore: stageRuntime.state.workspace.nodeBoundaryStore,
        positionContext: createTreePositionContext(stageRuntime, scopeChain),
        composedTransform: stageRuntime.state.execution.scopeTransformComposer.resolve(scopeChain),
        scopeChain,
        rootFontSize: stageRuntime.context.layout.rootFontSize,
        allocationWidthProposal: frame.context.layout?.childProposal?.x,
        texLowering: { lowerTex: stageRuntime.context.host.lowerTex, warn },
        warn,
      });

      return {
        compiled: compilation,
        output: emitNodeOutput(compilation, {
          round: stageRuntime.context.layout.round,
          registerPaint: stageRuntime.state.workspace.paintRegistry.register,
        }),
      };
    },
  );
  const compilation = staged.compiled;

  const { layout } = compilation;
  const boundaryState = runtime.state.workspace.nodeBoundaryStore.get(layout);
  boundaryState.irPath = nodeIrPath;
  boundaryState.warn = (code, message) =>
    runtime.state.workspace.diagnosticCollector.collect({ code, message, path: nodeIrPath });
  if (child.id) {
    const globalLayout = projectLayoutWithTransform(
      layout,
      runtime.state.execution.scopeTransformComposer.resolve(scopeChain),
    );
    runtime.state.execution.namespaceStack.register(child.id, { layout: globalLayout, irPath: [...nodeIrPath, 'id'] });
    child.aliasIds?.forEach((id, aliasIndex) =>
      runtime.state.execution.namespaceStack.register(id, {
        layout: globalLayout,
        irPath: [...nodeIrPath, 'aliasIds', aliasIndex],
      }),
    );
    frame.state.publications.push(globalLayout);
  }

  const output = staged.output;
  const emittedPrimitives =
    runtime.state.execution.provenanceTracker?.materializePrimitives(output.primitives) ?? output.primitives;
  if (semanticOwner !== undefined) {
    runtime.state.execution.provenanceTracker?.recordPrimitives(emittedPrimitives, semanticOwner, 'node');
  }

  for (const prim of emittedPrimitives) {
    primitives.push(prim);
    if (child.zIndex !== undefined) outputState.zIndexOf.set(prim, child.zIndex);
  }

  frame.state.bounds.push(...output.bounds);
  frame.state.allocations.push({
    boundsPoints: output.bounds[0].boundsPoints,
    skipAllocation: frame.context.layout?.skipAllocation,
  });
  const alignmentGuides = alignmentGuidesOfNode(layout, runtime.context.layout.round);
  if (alignmentGuides !== undefined) {
    frame.state.alignmentGuides.push(
      ...cloneAlignmentGuides(alignmentGuides, `Node '${formatPropertyPath(nodeIrPath)}'`),
    );
  }

  layouts.push(layout);
};
