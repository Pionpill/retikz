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
import type { BoundsRect } from '@retikz/math';
import { boundsToRect, mergeBounds, rectToBounds } from '@retikz/math';

import { RetikzDiagramError, RetikzDiagramErrorCode } from '../../../errors';
import type {
  FlowLayoutElementInput,
  FlowLayoutExecutionContext,
  FlowLayoutInput,
  FlowLayoutPlacementInput,
  FlowLayoutPlacementOutput,
} from '../../contract';
import type { FlowDirectionValue, FlowLayoutAlignmentValue } from '../../shared';

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

type GridCell = Readonly<{ row: number; column: number }>;

type GridPlacements = ReadonlyArray<ReadonlyArray<string | null>> | Readonly<Record<string, GridCell>>;

const isGridPlacementMatrix = (placements: GridPlacements): placements is ReadonlyArray<ReadonlyArray<string | null>> =>
  Array.isArray(placements);

/** 将 Grid 的两种公开 placement 结构投影为按 child identity 查询的位置 */
const gridCellsById = (placements: GridPlacements): ReadonlyMap<string, GridCell> => {
  if (!isGridPlacementMatrix(placements)) return new Map(Object.entries(placements));
  const cells = new Map<string, { row: number; column: number }>();
  placements.forEach((row, rowIndex) => {
    row.forEach((child, columnIndex) => {
      if (child !== null) cells.set(child, { row: rowIndex, column: columnIndex });
    });
  });
  return cells;
};

/** 返回 Grid 两个轴由当前 placement 结构确定的轨道数 */
const gridTrackCount = (
  placements: GridPlacements,
  cellsById: ReadonlyMap<string, GridCell>,
  axis: 'row' | 'column',
) => {
  if (isGridPlacementMatrix(placements)) {
    if (axis === 'row') return placements.length;
    return Math.max(...placements.map(row => row.length));
  }
  return Math.max(...Array.from(cellsById.values(), cell => cell[axis])) + 1;
};

/** 保留完整局部排列，只投影 Layout 对父级贡献的结构边界 */
const projectPlacementBounds = (
  input: FlowLayoutPlacementInput,
  output: FlowLayoutPlacementOutput,
  flow: FlowLayoutInput,
): FlowLayoutPlacementOutput => {
  const excluded = input.layout.excludeFromBounds;
  if (excluded === undefined || excluded.length === 0) return output;
  const findLayout = (elements: ReadonlyArray<FlowLayoutElementInput>): FlowLayoutElementInput | undefined => {
    for (const element of elements) {
      if (element.id === input.layout.id) return element;
      if (element.kind !== 'leaf') {
        const found = findLayout(element.elements);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  };
  const owner = findLayout(flow.elements)!;
  const children = owner.kind === 'leaf' ? [] : owner.elements;
  let contribution: BoundsRect | undefined;
  for (const element of output.elements) {
    if (excluded.includes(element.id)) continue;
    const child = children.find(candidate => candidate.id === element.id)!;
    const margin = child.kind === 'leaf' ? child.margin : { top: 0, right: 0, bottom: 0, left: 0 };
    const bounds = {
      x: element.bounds.x - margin.left,
      y: element.bounds.y - margin.top,
      width: element.bounds.width + margin.left + margin.right,
      height: element.bounds.height + margin.top + margin.bottom,
    };
    contribution =
      contribution === undefined
        ? bounds
        : boundsToRect(mergeBounds(rectToBounds(contribution), rectToBounds(bounds))!);
  }
  const bounds = contribution!;
  return {
    bounds: { ...bounds, x: 0, y: 0 },
    elements: output.elements.map(element => ({
      ...element,
      bounds: { ...element.bounds, x: element.bounds.x - bounds.x, y: element.bounds.y - bounds.y },
    })),
  };
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
        const cellsById = gridCellsById(layout.placements);
        const grid = createGridLayout({
          columns: Array.from({ length: gridTrackCount(layout.placements, cellsById, 'column') }, () => ({
            kind: 'content' as const,
            mode: 'natural' as const,
          })),
          rows: Array.from({ length: gridTrackCount(layout.placements, cellsById, 'row') }, () => ({
            kind: 'content' as const,
            mode: 'natural' as const,
          })),
          rowGap: layout.rowGap,
          columnGap: layout.columnGap,
          justifyItems: LayoutAlignment.Center,
          alignItems: LayoutAlignment.Center,
          children: input.elements.map(element => {
            const cell = cellsById.get(element.id)!;
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
            const directOwner = cellsById.has(element.id) ? element.id : owner;
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
          const sourceCell = cellsById.get(sourceId)!;
          const targetCell = cellsById.get(targetId)!;
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
        return projectPlacementBounds(
          input,
          {
            bounds: artifact.container.allocationBounds,
            elements: artifact.items.map(item => ({ id: item.key, bounds: item.allocationBounds })),
          },
          flow,
        );
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
      return projectPlacementBounds(
        input,
        {
          bounds: artifact.container.allocationBounds,
          elements: artifact.items.map(item => ({ id: item.key, bounds: item.allocationBounds })),
        },
        flow,
      );
    } catch (cause) {
      if (cause instanceof RetikzDiagramError) throw cause;
      return placementFailure(input, 'Layout composition failed.', cause);
    }
  },
});
