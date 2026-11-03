import type { PropertyPath } from '@retikz/foundation';
import { formatPropertyPath } from '@retikz/foundation';

import { projectLayoutWithTransform } from '.';
import type { CompileOccurrenceLocator } from '../../../contract';
import { resolveNode } from '../../../resolve';
import type { IRNode } from '../../../schemas';
import type { CompileOwnerKey } from '../../provenance';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';
import { cloneAlignmentGuides } from '../shared';
import type { TreeOutputState } from '../shared';
import { layoutNode } from './layout';
import { alignmentGuidesOfNode } from './layout-metrics';
import { emitNodeOutput } from './output';

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

  const warn = (code: string, message: string, path: PropertyPath = nodeIrPath): void =>
    runtime.state.workspace.diagnosticCollector.collect({ code, message, path });
  const resolution = resolveNode(child, {
    ...runtime.context.registries,
    ...runtime.context.layout,
    scopeDefaults,
    mode: frame.context.style.theme.mode,
    irPath: nodeIrPath,
    warn,
  });
  const compilation = layoutNode(resolution, {
    measureText: runtime.context.host.measureText,
    nodeBoundaryStore: runtime.state.workspace.nodeBoundaryStore,
    positionContext: createTreePositionContext(runtime, scopeChain),
    composedTransform: runtime.state.execution.scopeTransformComposer.resolve(scopeChain),
    scopeChain,
    rootFontSize: runtime.context.layout.rootFontSize,
    allocationWidthProposal: frame.context.layout?.childProposal?.x,
    texLowering: { lowerTex: runtime.context.host.lowerTex, warn },
    warn,
  });

  const { layout } = compilation;
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

  const output = emitNodeOutput(compilation, {
    round: runtime.context.layout.round,
    registerPaint: runtime.state.workspace.paintRegistry.register,
  });
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
