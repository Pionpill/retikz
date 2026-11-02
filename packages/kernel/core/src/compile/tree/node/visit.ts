import { formatPropertyPath } from '@retikz/foundation';

import { projectLayoutWithTransform } from '.';
import type { CompileOccurrenceLocator } from '../../../contract';
import type { IRNode } from '../../../schemas';
import type { TreeCompileContext } from '../../context';
import type { CompileOwnerKey } from '../../provenance';
import { createCompileChildPath } from '../../shared';
import { cloneAlignmentGuides } from '../alignment-guide';
import { pushAllocation } from '../allocation';
import type { TreeCompileFrame } from '../frame';
import type { TreeOutputState } from '../output';
import { recordPrimitiveZIndex } from '../output';
import { createTreePositionContext } from '../reference';
import { compileNodeState } from './compile';
import { alignmentGuidesOfNode } from './layout-metrics';
import { emitNodeOutput } from './output';

/** 布局并 emit node，同时注册 id、收集边界点和父 scope layout 输入 */
export const visitNode = (
  context: TreeCompileContext,
  outputState: TreeOutputState,
  child: IRNode,
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
    composedTransform: context.execution.scopeTransformComposer.resolve(scopeChain),
    childProposal: frame.childProposal,
  });

  const { layout } = compilation;
  const globalLayout = projectLayoutWithTransform(layout, context.execution.scopeTransformComposer.resolve(scopeChain));
  if (child.id) {
    context.execution.namespaceStack.register(child.id, { layout: globalLayout, irPath: [...nodeIrPath, 'id'] });
    child.aliasIds?.forEach((id, aliasIndex) =>
      context.execution.namespaceStack.register(id, {
        layout: globalLayout,
        irPath: [...nodeIrPath, 'aliasIds', aliasIndex],
      }),
    );
  }

  frame.publicationSink.push(globalLayout);
  const output = emitNodeOutput(compilation, context.shared, context.workspace);
  const emittedPrimitives =
    context.execution.provenanceTracker?.materializePrimitives(output.primitives) ?? output.primitives;
  if (semanticOwner !== undefined) {
    context.execution.provenanceTracker?.recordPrimitives(emittedPrimitives, semanticOwner, 'node');
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
