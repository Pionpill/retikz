import { formatPropertyPath } from '@retikz/foundation';

import { projectLayoutWithTransform } from '.';
import type { CompileOccurrenceLocator } from '../../../contract';
import type { IRNode } from '../../../schemas';
import type { CompileOwnerKey } from '../../provenance';
import type { CompileRuntime } from '../../runtime';
import { createCompileChildPath } from '../../shared';
import { createTreePositionContext } from '../reference';
import type { SubtreeCompileRuntime } from '../runtime';
import { cloneAlignmentGuides } from '../shared';
import type { TreeOutputState } from '../shared';
import { compileNodeState } from './compile';
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

  const compilation = compileNodeState(child, nodeIrPath, {
    shared: runtime.context,
    workspace: runtime.state.workspace,
    scopeDefaults,
    mode: frame.context.style.theme.mode,
    scopeChain,
    positionContext: createTreePositionContext(runtime, scopeChain),
    composedTransform: runtime.state.execution.scopeTransformComposer.resolve(scopeChain),
    childProposal: frame.context.layout?.childProposal,
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

  const output = emitNodeOutput(compilation, runtime.context, runtime.state.workspace);
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
