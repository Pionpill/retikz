import type {
  CompositeCompileChild,
  IRChild,
  IRJsonObject,
  LayoutAxisProposal,
  LayoutChildProbe,
  LayoutChildResult,
  LayoutCompositeCompileContext,
} from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import type { BoundsRect } from '@retikz/math';

import {
  ChildSchema,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  NaturalLayoutProposal,
  resolveCoreThemeColors,
  ThemeMode,
  ThemeStyle,
} from '@retikz/core';
import { ScalarValueSchema } from '@retikz/data';
import { z } from 'zod';

import type { PresentedTableModel, SemanticTableCell, TableLayoutManifest } from '../../contract';
import type { ResolvedTableThemeTokens } from '../../providers/style';
import type {
  IRTableBorder,
  IRTableCellBorders,
  IRTableLayout,
  IRTableSpec,
  IRTableThemeTokenBorder,
} from '../../schemas';
import type { DeepReadonly } from '../../shared';
import type { ResolvedTablePlan, TableCellAppearanceTrace } from '../rule';
import type { LowerTablesOptions } from '../types';
import type { ResolvedTableBorderCandidate, TableBorderSide } from './border';
import type {
  ResolvedTableTrackSize,
  TableCellLayout,
  TableLayout,
  TableTrackContribution,
  TableTrackLayout,
} from './types';

import { resolveTableThemeTokens } from '../../providers/style';
import {
  TableBorderKind,
  TableBorderMode,
  TableCellAppearanceSchema,
  TableCellPayloadKind,
  TableRowKind,
  TableSpecSchema,
} from '../../schemas';
import { deepFreeze } from '../../shared';
import { formatTable } from '../formatter';
import { emitTableBorderScope, emitTableBoundsSentinel, emitTableCellBackground } from '../lower';
import { buildTableLayoutManifest } from '../manifest';
import { normalizeTableStructure } from '../normalize';
import { presentTable } from '../presentation';
import { presentationInputsOfTableCellPlans, resolveTableCellPlans } from '../rule';
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

/** 已完成 presentation 的 Table 后半布局事务输入 */
export type PresentedTableTransactionInput = Readonly<{
  /** 可选 Table root identity */
  tableId?: string;
  /** 透传到 Table root Scope 的 JSON metadata */
  meta?: IRJsonObject;
  /** Table 轨道、间距与默认 border 配置 */
  layout?: IRTableLayout;
  /** 与 canonical semantic model 严格对齐的呈现结果 */
  presented: PresentedTableModel;
  /** 同次 style resolution 与选择值 */
  theme?: LayoutCompositeCompileContext['theme'];
  tableThemeTokens?: ResolvedTableThemeTokens;
  /** 同次 Cell/encoding plan bundle */
  plan?: ResolvedTablePlan;
}>;

type TableCellProbe = Readonly<{
  semantic: SemanticTableCell;
  content: IRChild;
  intrinsic: LayoutChildResult;
  final: LayoutChildResult;
}>;

type TableTransactionStage = 'intrinsic Cell layout' | 'constrained Cell layout' | 'Border Scope layout';

/** Presented model 进入布局事务前的闭合 Cell 运行时合同 */
const PresentedTableCellSchema = z.discriminatedUnion('kind', [
  z.strictObject({
    kind: z.literal(TableCellPayloadKind.Value),
    cellId: z.string().min(1),
    rawValue: ScalarValueSchema,
    value: ScalarValueSchema,
    formatterName: z.string().min(1),
    presentationName: z.string().min(1),
    appearance: TableCellAppearanceSchema,
    content: ChildSchema,
  }),
  z.strictObject({
    kind: z.literal(TableCellPayloadKind.Content),
    cellId: z.string().min(1),
    appearance: TableCellAppearanceSchema,
    content: ChildSchema,
  }),
]);

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

/** 给选中 failure 的同一错误对象补充 Table 阶段上下文，保留 Core identity brand */
const runTableTransactionStage = <T>(
  stage: TableTransactionStage,
  tableId: string | undefined,
  cellId: string | undefined,
  run: () => T,
): T => {
  try {
    return run();
  } catch (error) {
    const contextual = new TableTransactionStageError(stage, error, tableId, cellId);
    if (error instanceof Error) {
      error.message = contextual.message;
      throw error;
    }
    throw contextual;
  }
};

/** 只为可恢复 probe failure 补充 Table 阶段上下文，Core fatal error 在 layoutChild 调用点直接穿透 */
const resultOfTableProbe = (
  context: LayoutCompositeCompileContext,
  probe: LayoutChildProbe,
  stage: TableTransactionStage,
  tableId: string | undefined,
  cellId: string | undefined,
): LayoutChildResult => {
  if (probe.kind === LayoutChildProbeKind.Resolved) return probe.result;
  return runTableTransactionStage(stage, tableId, cellId, () => context.raise(probe.failure));
};

const zeroBounds = (): BoundsRect => ({ x: 0, y: 0, width: 0, height: 0 });

/** 把父级水平 proposal 映射为 Table column solver 的有限可用尺寸 */
const availableColumnSizeOf = (proposal: LayoutAxisProposal): number | undefined => {
  if (proposal.kind === LayoutAxisProposalKind.Exact) return proposal.value;
  if (proposal.kind === LayoutAxisProposalKind.Range) return proposal.max;
  return undefined;
};

/** 合并两个非空可见 bounds */
const unionBounds = (left: BoundsRect | undefined, right: BoundsRect): BoundsRect => {
  if (left === undefined) return { ...right };
  const x = Math.min(left.x, right.x);
  const y = Math.min(left.y, right.y);
  const maxX = Math.max(left.x + left.width, right.x + right.width);
  const maxY = Math.max(left.y + left.height, right.y + right.height);
  return { x, y, width: maxX - x, height: maxY - y };
};

/** 判断 bounds 是否具有二维可见面积 */
const hasArea = (bounds: BoundsRect): boolean => bounds.width > 0 && bounds.height > 0;

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

/** 把 style border token 物化为带 provenance 的低优先级 graph candidate */
const resolveStyleBorderCandidate = (
  key:
    | 'table.border.top'
    | 'table.border.right'
    | 'table.border.bottom'
    | 'table.border.left'
    | 'table.border.horizontal'
    | 'table.border.vertical'
    | 'columnHeader.border.bottom',
  border: DeepReadonly<IRTableThemeTokenBorder>,
  tokens: ResolvedTableThemeTokens,
): ResolvedTableBorderCandidate => {
  const resolved = resolveBorderCandidate({ ...structuredClone(border), priority: -100 });
  if (resolved.kind !== 'line') throw new Error('table: internal style border must resolve to a line');
  return {
    ...resolved,
    styleToken: {
      key,
      source: tokens.sources[key].kind,
      path: tokens.sources[key].path,
    },
  };
};

/** 把 Cell 四侧 border 按固定物理顺序物化为 Border Graph 输入 */
const resolveCellBorders = (
  borders: DeepReadonly<IRTableCellBorders>,
  trace?: TableCellAppearanceTrace,
): Readonly<Partial<Record<TableBorderSide, ResolvedTableBorderCandidate>>> => ({
  ...Object.fromEntries(
    (['top', 'right', 'bottom', 'left'] as const).flatMap(side => {
      const border = borders[side];
      if (border === undefined) return [];
      const resolved = resolveBorderCandidate(border);
      const source = trace?.[`/borders/${side}`];
      return [
        [
          side,
          source?.kind === 'styleToken' && resolved.kind === 'line'
            ? {
                ...resolved,
                styleToken: { key: source.tokenKey, source: source.tokenSource, path: source.tokenPath },
              }
            : resolved,
        ],
      ];
    }),
  ),
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
    const presentedCell = presented.cells[index];
    const guarded = PresentedTableCellSchema.safeParse(presentedCell);
    if (!guarded.success) {
      const issue = guarded.error.issues[0];
      const path = issue.path.length === 0 ? '' : ` at ${issue.path.join('.')}`;
      throw new Error(`table: transaction presentation Cell ${index} shape differs${path}: ${issue.message}`);
    }
    if (presentedCell.cellId !== cell.id) {
      throw new Error(`table: transaction presentation Cell ${index} identity differs`);
    }
    if (presentedCell.kind !== cell.payload.kind) {
      throw new Error(`table: transaction presentation Cell ${index} kind differs`);
    }
    if (
      presentedCell.kind === TableCellPayloadKind.Value &&
      cell.payload.kind === TableCellPayloadKind.Value &&
      presentedCell.rawValue !== cell.payload.value
    ) {
      throw new Error(`table: transaction presentation Cell ${index} raw value differs`);
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

/** 从 Presented model 执行完整 Table layout-aware 后半事务 */
export const resolvePresentedTableTransaction = (
  input: PresentedTableTransactionInput,
  context: LayoutCompositeCompileContext,
): ResolvedTableTransaction => {
  const { tableId, meta, presented } = input;
  assertPresentedAlignment(presented);
  const semantic = presented.semantic;
  const resolved = resolveTableLayoutSpec(input.layout);
  const manifestTheme =
    input.theme ??
    ({
      style: ThemeStyle.Clean,
      mode: ThemeMode.Light,
      tokens: {},
      colors: resolveCoreThemeColors(ThemeStyle.Clean, ThemeMode.Light),
    } as const);
  const tableThemeTokens = input.tableThemeTokens ?? resolveTableThemeTokens(manifestTheme);

  const intrinsic = presented.cells.map(cell =>
    resultOfTableProbe(
      context,
      context.layoutChild(cell.content, NaturalLayoutProposal),
      'intrinsic Cell layout',
      tableId,
      cell.cellId,
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
  const availableColumnSize = availableColumnSizeOf(context.proposal.x);
  const columnSizes = solveTableTracks({
    tracks: columnTracks,
    contributions: columnContributions,
    gap: resolved.columnGap,
    ...(availableColumnSize === undefined ? {} : { availableSize: availableColumnSize }),
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
      ? resultOfTableProbe(
          context,
          context.layoutChild(presentedCell.content, {
            x: { kind: LayoutAxisProposalKind.Range, min: 0, max: contentWidth },
            y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          }),
          'constrained Cell layout',
          tableId,
          cell.id,
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

  const backgroundOutputs: Array<IRChild> = [];
  const placements = probes.map((probe, index) => {
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
    const background = emitTableCellBackground(presented.cells[index].appearance.background, box);
    if (background !== undefined) backgroundOutputs.push(background);
    const visualOverflowBounds =
      background === undefined
        ? placement.visualOverflowBounds
        : hasArea(placement.visualOverflowBounds)
          ? unionBounds(placement.visualOverflowBounds, box)
          : { ...box };
    return {
      cellId: probe.semantic.id,
      box,
      contentBox,
      sourceAllocationBounds: { ...probe.final.allocationBounds },
      sourceVisualOverflowBounds: { ...probe.final.visualBounds },
      contentAllocationBounds: placement.contentAllocationBounds,
      visualOverflowBounds,
    } satisfies TableCellLayout;
  });

  const graph = buildTableBorderGraph({
    rows,
    columns,
    cells: semantic.cells.map((cell, index) => ({
      cellId: cell.id,
      rowIndex: cell.rowIndex,
      columnIndex: cell.columnIndex,
      rowSpan: cell.span.rows,
      columnSpan: cell.span.columns,
      ...(presented.cells[index].appearance.borders === undefined
        ? {}
        : {
            borders: resolveCellBorders(
              presented.cells[index].appearance.borders,
              input.plan?.cells[index].trace.appearance,
            ),
          }),
    })),
    mode: resolved.borders?.mode ?? TableBorderMode.Collapse,
    defaults: {
      ...(() => {
        if (resolved.borders?.outer !== undefined) {
          const candidate = resolveBorderCandidate(resolved.borders.outer);
          return { outer: { top: candidate, right: candidate, bottom: candidate, left: candidate } };
        }
        const keys = {
          top: 'table.border.top',
          right: 'table.border.right',
          bottom: 'table.border.bottom',
          left: 'table.border.left',
        } as const;
        const outer = Object.fromEntries(
          Object.entries(keys).flatMap(([side, key]) => {
            const border = tableThemeTokens.tokens[key];
            return border === null ? [] : [[side, resolveStyleBorderCandidate(key, border, tableThemeTokens)]];
          }),
        );
        return Object.keys(outer).length === 0 ? {} : { outer };
      })(),
      ...(resolved.borders?.horizontal === undefined
        ? tableThemeTokens.tokens['table.border.horizontal'] === null
          ? {}
          : {
              horizontal: resolveStyleBorderCandidate(
                'table.border.horizontal',
                tableThemeTokens.tokens['table.border.horizontal'],
                tableThemeTokens,
              ),
            }
        : { horizontal: resolveBorderCandidate(resolved.borders.horizontal) }),
      ...(resolved.borders?.vertical === undefined
        ? tableThemeTokens.tokens['table.border.vertical'] === null
          ? {}
          : {
              vertical: resolveStyleBorderCandidate(
                'table.border.vertical',
                tableThemeTokens.tokens['table.border.vertical'],
                tableThemeTokens,
              ),
            }
        : { vertical: resolveBorderCandidate(resolved.borders.vertical) }),
    },
  });
  const borderResult =
    graph.edges.length === 0
      ? undefined
      : resultOfTableProbe(
          context,
          context.layoutChild(emitTableBorderScope(graph.edges, tableId), NaturalLayoutProposal),
          'Border Scope layout',
          tableId,
          undefined,
        );

  const width =
    columnSizes.reduce((total, size) => total + size, 0) + Math.max(0, columns.length - 1) * resolved.columnGap;
  const height = rowSizes.reduce((total, size) => total + size, 0) + Math.max(0, rows.length - 1) * resolved.rowGap;
  let visual: BoundsRect | undefined;
  placements.forEach(cell => {
    if (hasArea(cell.visualOverflowBounds)) {
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
      ...(tableId === undefined ? {} : { id: tableId }),
      ...(meta === undefined ? {} : { meta }),
    },
    [
      emitTableBoundsSentinel(layout),
      ...backgroundOutputs,
      ...cellOutputs,
      ...(borderResult === undefined ? [] : [context.replay(borderResult)]),
    ],
  );
  return deepFreeze({
    children: [root],
    manifest: buildTableLayoutManifest(tableId, semantic, layout, graph.edges, {
      style: manifestTheme.style,
      themeMode: manifestTheme.mode,
      tableThemeTokens,
      presented,
      ...(input.plan === undefined ? {} : { plans: input.plan.cells, encodings: input.plan.encodings }),
      legendDescriptors: input.plan?.legendDescriptors ?? [],
    }),
  });
};

/** 解析 Table spec 与 definitions，并执行一次 layout-aware compile transaction */
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
  const tableThemeTokens = resolveTableThemeTokens(context.theme, parsed.tableThemeTokens);
  const plan = resolveTableCellPlans(semantic, {
    rules: parsed.rules,
    encodings: parsed.encodings,
    visualScaleDefinitions: options.visualScaleDefinitions,
    tableThemeTokens,
    scaleContext: {
      categoricalColors: tableThemeTokens.tokens['data.categorical'],
      sequentialColors: [tableThemeTokens.tokens['data.sequential'][0], tableThemeTokens.tokens['data.sequential'][1]],
    },
  });
  const formatted = formatTable(semantic, { cells: plan.cells, formatterDefinitions: options.formatterDefinitions });
  const presented = presentTable(formatted, {
    cells: presentationInputsOfTableCellPlans(plan.cells),
    presentationDefinitions: options.presentationDefinitions,
  });
  return resolvePresentedTableTransaction(
    {
      ...(parsed.id === undefined ? {} : { tableId: parsed.id }),
      ...(parsed.meta === undefined ? {} : { meta: parsed.meta }),
      ...(parsed.layout === undefined ? {} : { layout: parsed.layout }),
      presented,
      theme: context.theme,
      tableThemeTokens,
      plan,
    },
    context,
  );
};
