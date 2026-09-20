import type {
  CompositeCompileChild,
  CompositeCompileScopeProps,
  IRChild,
  IRNode,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
  SpatialHandleDeclaration,
} from '@retikz/core';
import { resolveBoxSpacing } from '@retikz/core';
import { intrinsicLayoutProposal, requiredLayoutProbe, resolveLayoutAxisSize } from '@retikz/layout/compose';

import { RetikzStandardError, RetikzStandardErrorCode } from '../../../errors';
import type { CanonicalCell } from '../../../resolve/cell';
import { surfaceBoundaryPath, surfaceClip } from './surface-geometry';

/** 内容一次自然测量的结果与含 padding 的需求 */
export type MeasuredCell = { cell: CanonicalCell; result: LayoutChildResult; width: number; height: number };
/** 确定的单格边框位置及引用角色 */
export type CellPlacement = {
  measured: MeasuredCell;
  x: number;
  y: number;
  width: number;
  height: number;
  role: 'list-cell' | 'map-key' | 'map-value';
};

/** 在当前组件的样式环境下探测内容，保留结果供最终 replay */
export const measureCellChild = (
  context: LayoutCompositeCompileContext,
  child: IRChild,
  occurrence: number,
  scope: CompositeCompileScopeProps,
): LayoutChildResult =>
  requiredLayoutProbe(
    context,
    {
      child: {
        type: 'scope',
        ...(scope.defaults === undefined ? {} : { defaults: scope.defaults }),
        ...(scope.theme === undefined ? {} : { theme: scope.theme }),
        children: [child],
      },
      occurrence,
    },
    intrinsicLayoutProposal('natural'),
  );

/** 仅测量内容，不为单格构造布局 composite */
export const measureCell = (
  cell: CanonicalCell,
  context: LayoutCompositeCompileContext,
  occurrence: number,
  scope: CompositeCompileScopeProps,
): MeasuredCell => {
  const { font, textColor, color } = cell.style;
  const textStyle = { ...(font === undefined ? {} : { font }), ...(textColor === undefined ? {} : { textColor }) };
  const result = measureCellChild(
    context,
    {
      type: 'scope',
      ...(color === undefined ? {} : { style: { color } }),
      defaults: { node: { style: textStyle }, label: textStyle },
      children: [cell.content],
    },
    occurrence,
    scope,
  );
  const padding = resolveBoxSpacing(cell.layout.padding, 0);
  return {
    cell,
    result,
    width:
      typeof cell.layout.width === 'number' ? cell.layout.width : result.slotSize.width + padding.left + padding.right,
    height:
      typeof cell.layout.height === 'number'
        ? cell.layout.height
        : result.slotSize.height + padding.top + padding.bottom,
  };
};

/** 固定槽位引用载体只提供边界，不输出可见几何 */
const cellReferenceNode = (id: string, bounds: { x: number; y: number; width: number; height: number }): IRNode => ({
  type: 'node',
  id,
  position: [bounds.x + bounds.width / 2, bounds.y + bounds.height / 2],
  shape: 'rectangle',
  style: { fill: 'none', stroke: 'none', strokeWidth: 0 },
  layout: { minimumSize: { width: bounds.width, height: bounds.height }, padding: 0, margin: 0 },
});

/** 将已测内容居中放进真实单格，并复用 Surface 的边框与裁切几何 */
const emitCell = (placed: CellPlacement, context: LayoutCompositeCompileContext): CompositeCompileChild => {
  const {
    measured: { cell, result },
    x,
    y,
    width,
    height,
  } = placed;
  const { fill, fillOpacity, cornerRadius, font, textColor, opacity, color, ...border } = cell.style;
  void font;
  void textColor;
  const radius = Math.min(cornerRadius, width / 2, height / 2);
  const padding = resolveBoxSpacing(cell.layout.padding, 0);
  const cx = Math.max(0, Math.min(width, (width + padding.left - padding.right) / 2));
  const cy = Math.max(0, Math.min(height, (height + padding.top - padding.bottom) / 2));
  return context.scope(
    {
      transforms: [{ kind: 'translate', x, y }],
      style: { ...(color === undefined ? {} : { color }), ...(opacity === undefined ? {} : { opacity }) },
    },
    [
      surfaceBoundaryPath(width, height, radius, { zIndex: -1, style: { fill, fillOpacity, stroke: 'none' } }),
      context.scope(
        { zIndex: 0, ...(cell.layout.overflow === 'clip' ? { clip: surfaceClip(width, height, radius) } : {}) },
        [
          context.replay(result, {
            transforms: [
              {
                kind: 'translate',
                x: cx - result.slotSize.width / 2 - result.allocationBounds.x,
                y: cy - result.slotSize.height / 2 - result.allocationBounds.y,
              },
            ],
          }),
        ],
      ),
      surfaceBoundaryPath(width, height, radius, { zIndex: 1, style: { ...border, fill: 'none' } }),
    ],
  );
};

/** 简单排布只解析一次父级尺寸，直接发布单格与引用结果 */
export const compileCells = (
  cells: Array<CellPlacement>,
  width: number,
  height: number,
  scope: CompositeCompileScopeProps,
  context: LayoutCompositeCompileContext,
  extra: Array<CompositeCompileChild> = [],
  decoration: Pick<IRNode, 'label' | 'style'> = {},
): LayoutCompositeCompileResult => {
  const axisSize = (axis: 'x' | 'y', natural: number) =>
    resolveLayoutAxisSize({
      axis,
      policy: { kind: 'content' },
      proposal: context.proposal[axis],
      minimumContribution: natural,
      naturalContribution: natural,
    }).allocationSize;
  const allocationBounds = { x: 0, y: 0, width: axisSize('x', width), height: axisSize('y', height) };
  if (width > allocationBounds.width + 1e-8 || height > allocationBounds.height + 1e-8)
    throw new RetikzStandardError({
      code: RetikzStandardErrorCode.PipelineInvariant,
      message: 'List / Map allocation cannot fit its cells and gaps.',
      details: { width, height, allocation: allocationBounds },
    });
  const handles: Array<SpatialHandleDeclaration> = [{ key: 'container', role: 'container', bounds: allocationBounds }];
  const children: Array<IRChild | CompositeCompileChild> = cells.map(cell => emitCell(cell, context));
  children.push(...extra);
  if (decoration.label !== undefined || scope.id !== undefined) {
    const { font, textColor, color, opacity } = decoration.style ?? {};
    children.push({
      type: 'scope',
      defaults: { reset: ['node'] },
      children: [
        {
          type: 'node',
          position: [allocationBounds.width / 2, allocationBounds.height / 2],
          shape: 'rectangle',
          style: {
            fill: 'none',
            stroke: 'none',
            strokeWidth: 0,
            ...(font === undefined ? {} : { font }),
            ...(textColor === undefined ? {} : { textColor }),
            ...(color === undefined ? {} : { color }),
            ...(opacity === undefined ? {} : { opacity }),
          },
          layout: {
            minimumSize: { width: allocationBounds.width, height: allocationBounds.height },
            padding: 0,
            margin: 0,
          },
          ...(decoration.label === undefined ? {} : { label: decoration.label }),
        },
      ],
    });
  }
  for (const {
    measured: { cell },
    role,
    x,
    y,
    width: cellWidth,
    height: cellHeight,
  } of cells) {
    if (cell.id === undefined) continue;
    const bounds = { x, y, width: cellWidth, height: cellHeight };
    handles.push({ key: `cell:${cell.id}`, role, bounds });
    children.push({ type: 'scope', defaults: { reset: ['node'] }, children: [cellReferenceNode(cell.id, bounds)] });
  }
  return { allocationBounds, children: [context.scope(scope, children, handles)] };
};
