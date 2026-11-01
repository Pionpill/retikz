import { formatPropertyPath } from '@retikz/foundation';

import type { CompileOccurrenceLocator } from '../../../contract';
import type { CompileOwnerKey } from '../../provenance';
import { createCompileChildPath } from '../../shared';
import { cloneAlignmentGuides } from '../alignment-guide';
import { pushAllocation } from '../allocation';
import { createTreePositionContext } from '../context/execution';
import type { CompileExecutionContext } from '../context/execution';
import type { TreeCompileFrame } from '../frame';
import type { TreeOutputState } from '../output';
import { recordPrimitiveZIndex } from '../output';
import type { NodeChild } from '../types';
import { compileNodeState } from './compile';
import { alignmentGuidesOfNode } from './layout-metrics';
import { emitNodeOutput } from './output';

/** 布局并 emit node，同时注册 id、收集边界点和父 scope layout 输入 */
export const visitNode = (
  context: CompileExecutionContext,
  outputState: TreeOutputState,
  child: NodeChild,
  index: number,
  frame: TreeCompileFrame,
  occurrence?: CompileOccurrenceLocator,
  semanticOwner?: CompileOwnerKey,
): void => {
  const { scopeChain, primitiveSink, locatorPrefix, layoutSink, scopeDefaults } = frame;
  const nodeIrPath = createCompileChildPath(locatorPrefix, index);

  const compilation = compileNodeState(child, nodeIrPath, {
    ...context,
    scopeDefaults,
    mode: frame.theme.mode,
    scopeChain,
    positionContext: createTreePositionContext(context, scopeChain),
    composedTransform: context.scopeTransformComposer.resolve(scopeChain),
    childProposal: frame.childProposal,
  });

  const { layout } = compilation;
  const globalLayout = context.scopeTransformComposer.project(layout, scopeChain);
  if (child.id) {
    context.namespaceStack.register(child.id, globalLayout, [...nodeIrPath, 'id']);
    child.aliasIds?.forEach((id, aliasIndex) =>
      context.namespaceStack.register(id, globalLayout, [...nodeIrPath, 'aliasIds', aliasIndex]),
    );
  }

  frame.publicationSink.push(globalLayout);
  const output = emitNodeOutput(compilation, context.shared, context.workspace);
  const emittedPrimitives = context.provenanceTracker?.materializePrimitives(output.primitives) ?? output.primitives;
  if (semanticOwner !== undefined) {
    context.provenanceTracker?.recordPrimitives(emittedPrimitives, semanticOwner, 'node');
  }

  for (const prim of emittedPrimitives) {
    primitiveSink.push(prim);
    recordPrimitiveZIndex(outputState.zIndexOf, prim, child.zIndex);
  }

  frame.boundsSink.push(...output.bounds);
  pushAllocation(frame.allocationSink, output.bounds[0].boundsPoints, frame.allocationBoundary);
  const alignmentGuides = alignmentGuidesOfNode(layout, context.shared.layout.round);
  if (alignmentGuides !== undefined) {
    frame.alignmentGuideSink.push(...cloneAlignmentGuides(alignmentGuides, `Node '${formatPropertyPath(nodeIrPath)}'`));
  }

  layoutSink.push(layout);
};
