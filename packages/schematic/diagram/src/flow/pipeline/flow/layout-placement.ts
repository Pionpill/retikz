import type { LayoutCompositeCompileContext } from '@retikz/core';

import { createGroupBodyAllocation } from '@retikz/graph';
import {
  createFlexLayout,
  createGridLayout,
  FlexLayoutDirection,
  LayoutAlignment,
  LayoutItemKind,
} from '@retikz/layout';
import { compileFlexLayout, compileGridLayout, intrinsicLayoutProposal } from '@retikz/layout/compose';

import type {
  FlowLayoutElementInput,
  FlowLayoutExecutionContext,
  FlowLayoutInput,
  FlowLayoutPlacementInput,
} from '../../contract';
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

const placementFailure = (input: FlowLayoutPlacementInput, reason: string, cause?: unknown): never => {
  throw new RetikzDiagramError({
    code: RetikzDiagramErrorCode.FlowMaterializationFailed,
    message: `Flow Layout '${input.layout.id}' could not be placed through Layout ${input.layout.kind}: ${reason}`,
    details: { stage: 'measure', path: [], relatedIds: [input.layout.id], reason },
    cause,
  });
};

/** 使用公开 Flex/Grid compiler 执行一个无绘制 Flow Layout placement */
export const createFlowLayoutExecutionContext = (
  context: LayoutCompositeCompileContext,
  flow: FlowLayoutInput,
): FlowLayoutExecutionContext => ({
  placeLayout: input => {
    try {
      if (input.layout.kind === 'grid') {
        const layout = input.layout;
        const cells = Object.values(layout.placements);
        const grid = createGridLayout({
          columns: Array.from({ length: Math.max(...cells.map(cell => cell.column)) + 1 }, () => ({
            kind: 'content' as const,
            mode: 'natural' as const,
          })),
          rows: Array.from({ length: Math.max(...cells.map(cell => cell.row)) + 1 }, () => ({
            kind: 'content' as const,
            mode: 'natural' as const,
          })),
          rowGap: layout.rowGap,
          columnGap: layout.columnGap,
          justifyItems: LayoutAlignment.Center,
          alignItems: LayoutAlignment.Center,
          children: input.elements.map(element => {
            const cell = layout.placements[element.id];
            const horizontal = Math.max(element.margin.left, element.margin.right);
            const vertical = Math.max(element.margin.top, element.margin.bottom);
            return {
              kind: LayoutItemKind.Grid,
              key: element.id,
              row: { start: cell.row, span: 1 },
              column: { start: cell.column, span: 1 },
              margin: { left: horizontal, right: horizontal, top: vertical, bottom: vertical },
              child: createGroupBodyAllocation({ x: 0, y: 0, width: element.size.width, height: element.size.height }),
            };
          }),
        });
        const compileContext = { ...context, proposal: intrinsicLayoutProposal('natural') };
        // 所有 relation 基于同一输入取最大标签尺寸，避免遍历顺序影响结果
        let rowGap = layout.rowGap;
        let columnGap = layout.columnGap;
        const ownerById = new Map<string, string>();
        const visit = (elements: ReadonlyArray<FlowLayoutElementInput>, owner?: string): void => {
          for (const element of elements) {
            const directOwner = Object.hasOwn(layout.placements, element.id) ? element.id : owner;
            if (directOwner !== undefined) ownerById.set(element.id, directOwner);
            if (element.kind !== 'leaf') visit(element.elements, directOwner);
          }
        };
        visit(flow.elements);
        for (const relation of flow.relations) {
          if (!layout.reserveLabelSpace || relation.labelSize === undefined) continue;
          const sourceId = ownerById.get(relation.source);
          const targetId = ownerById.get(relation.target);
          if (sourceId === undefined || targetId === undefined || sourceId === targetId) continue;
          const sourceCell = layout.placements[sourceId];
          const targetCell = layout.placements[targetId];
          const columns = Math.abs(sourceCell.column - targetCell.column);
          const rows = Math.abs(sourceCell.row - targetCell.row);
          if (columns > 0) {
            columnGap = Math.max(columnGap, layout.columnGap + relation.labelSize.width);
          }
          if (rows > 0) {
            rowGap = Math.max(rowGap, layout.rowGap + relation.labelSize.height);
          }
        }
        const artifact = compileGridLayout({ ...grid, rowGap, columnGap }, compileContext).artifact;
        if (artifact === undefined) return placementFailure(input, 'GridLayout returned no placement artifact.');
        return {
          bounds: artifact.container.allocationBounds,
          elements: artifact.items.map(item => ({ id: item.key, bounds: item.allocationBounds })),
        };
      }
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
    } catch (cause) {
      if (cause instanceof RetikzDiagramError) throw cause;
      return placementFailure(input, 'Layout composition failed.', cause);
    }
  },
});
