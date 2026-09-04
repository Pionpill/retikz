import type { LayoutCompositeCompileContext } from '@retikz/core';

import { createGroupBodyAllocation } from '@retikz/graph';
import { createFlexLayout, FlexLayoutDirection, LayoutAlignment, LayoutItemKind } from '@retikz/layout';
import { compileFlexLayout, intrinsicLayoutProposal } from '@retikz/layout/compose';

import type { FlowLayoutExecutionContext, FlowLayoutPlacementInput } from '../../contract';
import type { FlowDirectionValue, FlowLayoutAlignmentValue } from '../../shared';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';

const flexDirection = (direction: FlowDirectionValue) => {
  if (direction === 'right') return FlexLayoutDirection.Row;
  if (direction === 'left') return FlexLayoutDirection.RowReverse;
  if (direction === 'down') return FlexLayoutDirection.Column;
  return FlexLayoutDirection.ColumnReverse;
};

const flexAlignment = (alignment: FlowLayoutAlignmentValue) => {
  if (alignment === 'start') return LayoutAlignment.Start;
  if (alignment === 'end') return LayoutAlignment.End;
  return LayoutAlignment.Center;
};

const placementFailure = (input: FlowLayoutPlacementInput, reason: string): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowMaterializationFailed,
    message: `Flow Layout '${input.layout.id}' could not be placed through Layout Flex: ${reason}`,
    details: { stage: 'measure', path: [], relatedIds: [input.layout.id], reason },
  });
};

/** 使用 canonical Flex compiler 执行一个无绘制 Flow Layout placement */
export const createFlowLayoutExecutionContext = (
  context: LayoutCompositeCompileContext,
): FlowLayoutExecutionContext => ({
  placeLayout: input => {
    const flex = createFlexLayout({
      direction: flexDirection(input.layout.direction),
      gap: input.layout.gap,
      alignItems: flexAlignment(input.layout.align),
      children: input.elements.map(element => ({
        kind: LayoutItemKind.Flex,
        key: element.id,
        child: createGroupBodyAllocation({ x: 0, y: 0, width: element.size.width, height: element.size.height }),
        margin: element.margin,
      })),
    });
    const artifact = compileFlexLayout(flex, {
      ...context,
      proposal: intrinsicLayoutProposal('natural'),
    }).artifact;
    if (artifact === undefined) return placementFailure(input, 'FlexLayout returned no placement artifact.');
    return {
      bounds: artifact.container.allocationBounds,
      elements: artifact.items.map(item => ({ id: item.key, bounds: item.allocationBounds })),
    };
  },
});
