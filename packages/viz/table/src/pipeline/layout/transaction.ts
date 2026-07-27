import type { CompositeCompileChild, IRChild, LayoutChildResult, LayoutCompositeCompileContext } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { BoundsRect } from '@retikz/math';

import type { PresentedTableModel, SemanticTableCell, TableLayoutManifest } from '../../contract';
import type { IRTableBorder, IRTableCellBorders, IRTableSpec } from '../../schemas';
import type { DeepReadonly } from '../../shared';
import type { LowerTablesOptions } from '../types';
import type { ResolvedTableBorderCandidate, TableBorderSide } from './border';
import type {
  ResolvedTableTrackSize,
  TableCellLayout,
  TableLayout,
  TableTrackContribution,
  TableTrackLayout,
} from './types';

import { TableBorderKind, TableBorderMode, TableRowKind, TableSpecSchema } from '../../schemas';
import { deepFreeze } from '../../shared';
import { emitTableBoundsSentinel } from '../lower';
import { emitTableBorderScope } from '../lower';
import { buildTableLayoutManifest } from '../manifest';
import { normalizeTableStructure } from '../normalize';
import { presentTable } from '../presentation';
import { buildTableBorderGraph } from './border';
import { computeTableCellBox, computeTableCellContentBox, computeTableCellOuterSize } from './cell';
import { computeTableCellContentPlacement } from './content';
import { resolveTableLayoutSpec, resolveTableTrackSizes } from './resolve';
import { propagateTableSpanContributions } from './span';
import { solveTableTracks } from './track';

/** 同次 Table compile transaction 的输出 */
export type ResolvedTableTransaction = Readonly<{
  /** 当前 callback 可直接提交的 output children */
  children: ReadonlyArray<IRChild | CompositeCompileChild>;
  /** 与 output children 同源的 immutable manifest */
  manifest: TableLayoutManifest;
}>;

type TableCellProbe = Readonly<{
  semantic: SemanticTableCell;
  content: IRChild;
  intrinsic: LayoutChildResult;
  final: LayoutChildResult;
}>;

type TableTransactionStage = 'intrinsic Cell layout' | 'constrained Cell layout' | 'Border Scope layout';

/** 标记 Table transaction 中失败的精确阶段与可用实体身份 */
export class TableTransactionStageError extends Error {
  constructor(stage: TableTransactionStage, cause: unknown, tableId?: string, cellId?: string) {
    const table = tableId === undefined ? 'table' : `table "${tableId}"`;
    const cell = cellId === undefined ? '' : `: Cell "${cellId}"`;
    const message = cause instanceof Error ? cause.message : String(cause);
    super(`${table}: ${stage}${cell}: ${message}`, { cause });
    this.name = 'TableTransactionStageError';
  }
}

/** 执行一个可诊断 transaction 阶段并保留原始错误 */
const runTableTransactionStage = <T>(
  stage: TableTransactionStage,
  tableId: string | undefined,
  cellId: string | undefined,
  run: () => T,
): T => {
  try {
    return run();
  } catch (error) {
    throw new TableTransactionStageError(stage, error, tableId, cellId);
  }
};

const zeroBounds = (): BoundsRect => ({ x: 0, y: 0, width: 0, height: 0 });

/** 合并两个非空可见 bounds */
const unionBounds = (left: BoundsRect | undefined, right: BoundsRect): BoundsRect => {
  if (left === undefined) return { ...right };
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const maxX = Math.max(left.x + left.width, right.x + right.width);
  const maxY = Math.max(left.y + left.height, right.y + right.height);
  return { x, y, width: maxX - x, height: maxY - y };
};

/** 根据 canonical ids、sizes 与 gap 构造同序轨道几何 */
const trackLayoutsOf = (
  ids: ReadonlyArray<string>,
  sizes: ReadonlyArray<number>,
  gap: number,
): ReadonlyArray<TableTrackLayout> => {
  let offset = 0;
  return sizes.map((size, index) => {
    const track = { id: ids[index], index, offset, size };
    offset += size + (index < sizes.length - 1 ? gap : 0);
    return track;
  });
};

/** 把 IR border 候选物化为 graph 消费态 */
const resolveBorderCandidate = (border: DeepReadonly<IRTableBorder>): ResolvedTableBorderCandidate => {
  if (border.kind === TableBorderKind.None) return { kind: 'none', priority: border.priority ?? 0 };
  return {
    kind: 'line',
    priority: border.priority ?? 0,
    line: {
      stroke: border.stroke ?? 'currentColor',
      width: border.width ?? 1,
      strokeOpacity: border.strokeOpacity ?? 1,
      ...(border.dashPattern === undefined ? {} : { dashPattern: [...border.dashPattern] }),
      dashOffset: border.dashOffset ?? 0,
      lineCap: 'butt',
      lineJoin: 'miter',
    },
  };
};

/** 把 Cell 四侧 border 按固定物理顺序物化为 Border Graph 输入 */
const resolveCellBorders = (
  borders: DeepReadonly<IRTableCellBorders>,
): Readonly<Partial<Record<TableBorderSide, ResolvedTableBorderCandidate>>> => ({
  ...(borders.top === undefined ? {} : { top: resolveBorderCandidate(borders.top) }),
  ...(borders.right === undefined ? {} : { right: resolveBorderCandidate(borders.right) }),
  ...(borders.bottom === undefined ? {} : { bottom: resolveBorderCandidate(borders.bottom) }),
  ...(borders.left === undefined ? {} : { left: resolveBorderCandidate(borders.left) }),
});

/** 从单轴 Cell outer sizes 构造 span-aware canonical contributions */
const contributionsOf = (
  cells: ReadonlyArray<SemanticTableCell>,
  tracks: ReadonlyArray<ResolvedTableTrackSize>,
  gap: number,
  axis: 'row' | 'column',
  outerSizeOf: (cell: SemanticTableCell, index: number) => number,
): ReadonlyArray<TableTrackContribution> => {
  const direct: Array<TableTrackContribution> = [];
  const constraints = cells.flatMap((cell, index) => {
    const startIndex = axis === 'column' ? cell.columnIndex : cell.rowIndex;
    const length = axis === 'column' ? cell.span.columns : cell.span.rows;
    const size = outerSizeOf(cell, index);
    if (length === 1) {
      direct.push({ trackIndex: startIndex, size });
      return [];
    }
    return [{ cellId: cell.id, startIndex, length, requiredOuterSize: size }];
  });
  return propagateTableSpanContributions({ tracks, contributions: direct, constraints, gap }).contributions;
};

/** 校验 Presented model 与 canonical semantic Cells 同序同 identity */
const assertPresentedAlignment = (presented: PresentedTableModel): void => {
  if (presented.semantic.cells.length !== presented.cells.length) {
    throw new Error('table: transaction presentation Cell count differs from semantic model');
  }
  presented.semantic.cells.forEach((cell, index) => {
    if (presented.cells[index]?.cellId !== cell.id) {
      throw new Error(`table: transaction presentation Cell ${index} identity differs`);
    }
  });
};

/** 计算单个 Cell 覆盖的 column outer width */
const cellColumnWidth = (
  cell: SemanticTableCell,
  columns: ReadonlyArray<TableTrackLayout>,
  columnGap: number,
): number =>
  columns
    .slice(cell.columnIndex, cell.columnIndex + cell.span.columns)
    .reduce((total, track) => total + track.size, 0) +
  Math.max(0, cell.span.columns - 1) * columnGap;

/** 创建最终 Cell runtime Scope，并只 replay selected child result */
const cellOutputOf = (
  context: LayoutCompositeCompileContext,
  probe: TableCellProbe,
  geometry: TableCellLayout,
): CompositeCompileChild => {
  const placement = computeTableCellContentPlacement({
    sourceAllocationBounds: probe.final.allocationBounds,
    sourceVisualOverflowBounds: probe.final.visualBounds,
    contentBox: geometry.contentBox,
    horizontalAlign: probe.semantic.layout.horizontalAlign,
    verticalAlign: probe.semantic.layout.verticalAlign,
    fit: probe.semantic.layout.fit,
    overflow: probe.semantic.layout.overflow,
  });
  const meta = {
    role: 'tableCell',
    cellId: probe.semantic.id,
    rowIndex: probe.semantic.rowIndex,
    columnIndex: probe.semantic.columnIndex,
    span: { ...probe.semantic.span },
    location: probe.semantic.location,
    roles: [...probe.semantic.roles],
    ...(probe.semantic.source === undefined ? {} : { source: probe.semantic.source }),
  };
  if (!placement.replayContent) return context.scope({ id: probe.semantic.id, meta }, []);
  const replay = context.replay(probe.final);
  const transformed = context.scope(
    {
      transforms: [
        { kind: 'translate', x: placement.translation.x, y: placement.translation.y },
        { kind: 'scale', x: placement.scale.x, y: placement.scale.y },
      ],
    },
    [replay],
  );
  return context.scope(
    {
      id: probe.semantic.id,
      meta,
      ...(placement.clipBounds === undefined
        ? {}
        : {
            clip: {
              kind: 'rect',
              x: placement.clipBounds.x,
              y: placement.clipBounds.y,
              width: placement.clipBounds.width,
              height: placement.clipBounds.height,
            },
          }),
    },
    [transformed],
  );
};

/** 执行一次 Table layout-aware compile transaction */
export const resolveTableTransaction = (
  spec: IRTableSpec,
  datasets: ExternalDatasets,
  options: LowerTablesOptions,
  context: LayoutCompositeCompileContext,
): ResolvedTableTransaction => {
  const parsed = TableSpecSchema.parse(spec);
  const semantic = normalizeTableStructure(parsed.structure, {
    data: parsed.data,
    datasets,
    structureDefinitions: options.structureDefinitions,
  });
  const presented = presentTable(semantic, options.presentationDefinitions);
  assertPresentedAlignment(presented);
  const resolved = resolveTableLayoutSpec(parsed.layout);

  const intrinsic = presented.cells.map(cell =>
    runTableTransactionStage('intrinsic Cell layout', parsed.id, cell.cellId, () =>
      context.layoutChild(cell.content, { kind: 'intrinsic' }),
    ),
  );
  const columnTracks = resolveTableTrackSizes(
    semantic.columns.map(() => resolved.columnSize),
    resolved.columns,
  );
  const columnContributions = contributionsOf(
    semantic.cells,
    columnTracks,
    resolved.columnGap,
    'column',
    (cell, index) => computeTableCellOuterSize(intrinsic[index].allocationBounds, cell.layout.padding).width,
  );
  const columnSizes = solveTableTracks({
    tracks: columnTracks,
    contributions: columnContributions,
    gap: resolved.columnGap,
    ...(context.constraint.kind === 'constrained' ? { availableSize: context.constraint.maxWidth } : {}),
  });
  const columns = trackLayoutsOf(
    semantic.columns.map(column => column.id),
    columnSizes,
    resolved.columnGap,
  );

  const probes: Array<TableCellProbe> = semantic.cells.map((cell, index) => {
    const presentedCell = presented.cells[index];
    const contentWidth = Math.max(
      0,
      cellColumnWidth(cell, columns, resolved.columnGap) - cell.layout.padding.left - cell.layout.padding.right,
    );
    const final = cell.layout.wrap
      ? runTableTransactionStage('constrained Cell layout', parsed.id, cell.id, () =>
          context.layoutChild(presentedCell.content, { kind: 'constrained', maxWidth: contentWidth }),
        )
      : intrinsic[index];
    return { semantic: cell, content: presentedCell.content, intrinsic: intrinsic[index], final };
  });

  const rowDefaults = semantic.rows.map(row =>
    row.kind === TableRowKind.ColumnHeader ? resolved.headerRowSize : resolved.rowSize,
  );
  const rowTracks = resolveTableTrackSizes(rowDefaults, resolved.rows);
  const rowContributions = contributionsOf(
    semantic.cells,
    rowTracks,
    resolved.rowGap,
    'row',
    (cell, index) => computeTableCellOuterSize(probes[index].final.allocationBounds, cell.layout.padding).height,
  );
  const rowSizes = solveTableTracks({ tracks: rowTracks, contributions: rowContributions, gap: resolved.rowGap });
  const rows = trackLayoutsOf(
    semantic.rows.map(row => row.id),
    rowSizes,
    resolved.rowGap,
  );

  const placements = probes.map(probe => {
    const box = computeTableCellBox({
      rows,
      columns,
      rowIndex: probe.semantic.rowIndex,
      columnIndex: probe.semantic.columnIndex,
      rowSpan: probe.semantic.span.rows,
      columnSpan: probe.semantic.span.columns,
      rowGap: resolved.rowGap,
      columnGap: resolved.columnGap,
    });
    const contentBox = computeTableCellContentBox(box, probe.semantic.layout.padding);
    const placement = computeTableCellContentPlacement({
      sourceAllocationBounds: probe.final.allocationBounds,
      sourceVisualOverflowBounds: probe.final.visualBounds,
      contentBox,
      horizontalAlign: probe.semantic.layout.horizontalAlign,
      verticalAlign: probe.semantic.layout.verticalAlign,
      fit: probe.semantic.layout.fit,
      overflow: probe.semantic.layout.overflow,
    });
    return {
      cellId: probe.semantic.id,
      box,
      contentBox,
      sourceAllocationBounds: { ...probe.final.allocationBounds },
      sourceVisualOverflowBounds: { ...probe.final.visualBounds },
      contentAllocationBounds: placement.contentAllocationBounds,
      visualOverflowBounds: placement.visualOverflowBounds,
    } satisfies TableCellLayout;
  });

  const graph = buildTableBorderGraph({
    rows,
    columns,
    cells: semantic.cells.map(cell => ({
      cellId: cell.id,
      rowIndex: cell.rowIndex,
      columnIndex: cell.columnIndex,
      rowSpan: cell.span.rows,
      columnSpan: cell.span.columns,
      ...(cell.layout.borders === undefined
        ? {}
        : {
            borders: resolveCellBorders(cell.layout.borders),
          }),
    })),
    mode: resolved.borders?.mode ?? TableBorderMode.Collapse,
    defaults: {
      ...(resolved.borders?.outer === undefined ? {} : { outer: resolveBorderCandidate(resolved.borders.outer) }),
      ...(resolved.borders?.horizontal === undefined
        ? {}
        : { horizontal: resolveBorderCandidate(resolved.borders.horizontal) }),
      ...(resolved.borders?.vertical === undefined
        ? {}
        : { vertical: resolveBorderCandidate(resolved.borders.vertical) }),
    },
  });
  const borderResult =
    graph.edges.length === 0
      ? undefined
      : runTableTransactionStage('Border Scope layout', parsed.id, undefined, () =>
          context.layoutChild(emitTableBorderScope(graph.edges, parsed.id), { kind: 'intrinsic' }),
        );

  const width =
    columnSizes.reduce((total, size) => total + size, 0) + Math.max(0, columns.length - 1) * resolved.columnGap;
  const height = rowSizes.reduce((total, size) => total + size, 0) + Math.max(0, rows.length - 1) * resolved.rowGap;
  let visual: BoundsRect | undefined;
  placements.forEach(cell => {
    if (cell.visualOverflowBounds.width > 0 && cell.visualOverflowBounds.height > 0) {
      visual = unionBounds(visual, cell.visualOverflowBounds);
    }
  });
  if (borderResult !== undefined && borderResult.visualBounds.width > 0 && borderResult.visualBounds.height > 0) {
    visual = unionBounds(visual, borderResult.visualBounds);
  }
  const layout: TableLayout = deepFreeze({
    allocationBounds: { x: 0, y: 0, width, height },
    visualOverflowBounds: visual ?? zeroBounds(),
    rows,
    columns,
    cells: placements,
  });
  const cellOutputs = probes.map((probe, index) => cellOutputOf(context, probe, placements[index]));
  const root = context.scope(
    {
      localNamespace: true,
      ...(parsed.id === undefined ? {} : { id: parsed.id }),
      ...(parsed.meta === undefined ? {} : { meta: parsed.meta }),
    },
    [
      emitTableBoundsSentinel(layout),
      ...cellOutputs,
      ...(borderResult === undefined ? [] : [context.replay(borderResult)]),
    ],
  );
  return deepFreeze({
    children: [root],
    manifest: buildTableLayoutManifest(parsed.id, semantic, layout, graph.edges),
  });
};
