import type {
  LayoutAlignmentGuide,
  LayoutAxisProposal,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutCompositeCompileResult,
  LayoutProposal,
} from '@retikz/core';

import {
  LayoutAlignmentGuideDimension,
  LayoutAlignmentGuideName,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
} from '@retikz/core';

import type { LayoutTrackSourceKindValue } from '../shared/layout';
import type { LayoutInsets, LayoutRect } from '../shared/layout/internal';
import type { GridLayoutArtifact } from './artifact-types';
import type { GridTrackConstraint } from './tracks';
import type { IRGridLayout, IRGridLayoutItem } from './types';

import { LayoutAlignment, LayoutAxisSizeKind, LayoutOverflow, LayoutTrackSourceKind } from '../shared/layout';
import {
  alignAllocationInSlot,
  alignResolvedLayoutSlot,
  compensatedLayoutSum,
  contentRectOf,
  createLayoutArtifactAlignmentGuide,
  createLayoutArtifactContainer,
  createLayoutArtifactItem,
  layoutClipOf,
  layoutEpsilon,
  normalizeLayoutSpacing,
  resolveLayoutAxisSize,
} from '../shared/layout/internal';
import { resolveGridPlacements } from './placement';
import {
  gridItemSlot,
  gridSpanRange,
  gridStructuralGuideOffset,
  materializeGridTracks,
  positionGridTracks,
  resolveGridRowMetrics,
} from './solve';
import { solveGridTracks } from './tracks';

type MeasuredGridItem = Readonly<{
  authored: IRGridLayoutItem;
  sourceIndex: number;
  margin: LayoutInsets;
  columnStart: number;
  columnSpan: number;
  rowStart: number;
  rowSpan: number;
}>;

type PlacedGridItem = Readonly<{
  sourceIndex: number;
  columnStart: number;
  columnSpan: number;
  rowStart: number;
  rowSpan: number;
  margin: LayoutInsets;
  slotBounds: LayoutRect;
  alignment: IRGridLayout['alignItems'];
  result: LayoutChildResult;
  translation: Readonly<{ x: number; y: number }>;
}>;

/** 把 Grid track 定义归一为公开 artifact 的稳定来源类别 */
const trackSourceKindOf = (track: IRGridLayout['columns'][number]): LayoutTrackSourceKindValue => {
  if (track.kind === 'fixed') return LayoutTrackSourceKind.Fixed;
  if (track.kind === 'fraction') return LayoutTrackSourceKind.Fraction;
  if (track.kind === 'minmax') return LayoutTrackSourceKind.Minmax;
  return track.mode === 'minimum' ? LayoutTrackSourceKind.ContentMinimum : LayoutTrackSourceKind.ContentNatural;
};

/** 创建 intrinsic 单轴 proposal */
const intrinsicProposal = (mode: 'minimum' | 'natural'): LayoutAxisProposal => ({
  kind: LayoutAxisProposalKind.Intrinsic,
  mode: mode === 'minimum' ? LayoutIntrinsicMode.Minimum : LayoutIntrinsicMode.Natural,
});

/** 创建 exact 单轴 proposal */
const exactProposal = (value: number): LayoutAxisProposal => ({ kind: LayoutAxisProposalKind.Exact, value });

/** 创建从零开始的有限 range proposal */
const boundedProposal = (max: number): LayoutAxisProposal => ({
  kind: LayoutAxisProposalKind.Range,
  min: 0,
  max,
});

/** 执行一次必需的 child probe，并在失败时保留 Core occurrence 提升错误 */
const requiredProbe = (
  context: LayoutCompositeCompileContext,
  child: IRGridLayoutItem['child'],
  proposal: LayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(child, proposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

/** 计算 y policy 当前可确定的有限 content-box 上限 */
const finiteYLimitOf = (
  node: IRGridLayout,
  proposal: LayoutAxisProposal,
  padding: LayoutInsets,
): number | undefined => {
  const policy = node.size.y;
  let allocation: number | undefined;
  if (policy.kind === LayoutAxisSizeKind.Fixed) {
    allocation = policy.value;
  } else if (policy.kind === LayoutAxisSizeKind.Fill) {
    allocation = resolveLayoutAxisSize({
      axis: 'y',
      policy,
      proposal,
      minimumContribution: 0,
      naturalContribution: 0,
    }).allocationSize;
  } else if (proposal.kind === LayoutAxisProposalKind.Exact) {
    allocation = resolveLayoutAxisSize({
      axis: 'y',
      policy,
      proposal,
      minimumContribution: 0,
      naturalContribution: 0,
    }).allocationSize;
  } else if (proposal.kind === LayoutAxisProposalKind.Range && proposal.max !== undefined) {
    allocation = resolveLayoutAxisSize({
      axis: 'y',
      policy,
      proposal: exactProposal(proposal.max),
      minimumContribution: 0,
      naturalContribution: 0,
    }).allocationSize;
  }
  return allocation === undefined ? undefined : Math.max(0, allocation - padding.top - padding.bottom);
};

/** 把 slot 与 margin 转为扣除 span 内部 gaps 后的 track target */
const trackTargetOf = (
  result: LayoutChildResult,
  axis: 'x' | 'y',
  margin: LayoutInsets,
  internalGap: number,
): number => {
  const slot = axis === 'x' ? result.slotSize.width : result.slotSize.height;
  const marginSize = axis === 'x' ? margin.left + margin.right : margin.top + margin.bottom;
  return Math.max(0, compensatedLayoutSum([slot, marginSize, -internalGap]));
};

/** 计算一个 profile 连同 gaps 与 padding 的容器 contribution */
const axisContribution = (
  profile: ReadonlyArray<number>,
  gap: number,
  paddingStart: number,
  paddingEnd: number,
): number => compensatedLayoutSum([paddingStart, paddingEnd, ...profile, gap * Math.max(0, profile.length - 1)]);

/** 从 final alignment 决定 item 单轴 exact 或 bounded range proposal */
const itemAxisProposal = (alignment: string, size: number): LayoutAxisProposal =>
  alignment === LayoutAlignment.Stretch ? exactProposal(size) : boundedProposal(size);

/** 读取 placement 后的真实 guide 或 allocation edge */
const placedGuideCoordinate = (
  placed: PlacedGridItem,
  name: 'first-baseline' | 'last-baseline',
): Readonly<{ coordinate: number; real: boolean }> => {
  const guide = placed.result.alignmentGuides?.find(
    value => value.dimension === LayoutAlignmentGuideDimension.Y && value.name === name,
  );
  if (guide !== undefined) return { coordinate: guide.position + placed.translation.y, real: true };
  const edge =
    name === LayoutAlignmentGuideName.FirstBaseline
      ? placed.result.allocationBounds.y
      : placed.result.allocationBounds.y + placed.result.allocationBounds.height;
  return { coordinate: edge + placed.translation.y, real: false };
};

/** 为物理 row 选择 participant、真实 guide 或稳定 edge fallback */
const outgoingRowGuide = (name: 'first-baseline' | 'last-baseline', items: ReadonlyArray<PlacedGridItem>): number => {
  const ordered = [...items].sort((first, second) => first.sourceIndex - second.sourceIndex);
  const participants = ordered.filter(item => item.alignment === name);
  if (participants.length > 0) {
    const candidates = participants.map(item => ({ item, ...placedGuideCoordinate(item, name) }));
    const canonical = candidates.find(candidate => candidate.real) ?? candidates[0];
    for (const candidate of candidates) {
      if (
        Math.abs(candidate.coordinate - canonical.coordinate) >
        layoutEpsilon(candidate.coordinate, canonical.coordinate)
      ) {
        throw new Error(`GridLayout ${name} participants did not resolve to one aligned coordinate`);
      }
    }
    return canonical.coordinate;
  }
  const traversal = name === LayoutAlignmentGuideName.FirstBaseline ? ordered : [...ordered].reverse();
  const real = traversal.map(item => placedGuideCoordinate(item, name)).find(candidate => candidate.real);
  if (real !== undefined) return real.coordinate;
  const fallback = traversal[0];
  return placedGuideCoordinate(fallback, name).coordinate;
};

/** 编译 Standard GridLayout 的 placement、双轴 probe、track 求解与 replay 流程 */
export const compileGridLayout = (
  node: IRGridLayout,
  context: LayoutCompositeCompileContext,
): LayoutCompositeCompileResult<GridLayoutArtifact> => {
  const padding = normalizeLayoutSpacing(node.padding);
  const placements = resolveGridPlacements(
    node.children.map((item, sourceIndex) => ({
      key: item.key,
      sourceIndex,
      ...(item.column === undefined ? {} : { column: item.column }),
      ...(item.row === undefined ? {} : { row: item.row }),
    })),
    {
      explicitColumns: node.columns.length,
      explicitRows: node.rows.length,
      autoFlow: node.autoFlow,
      overlap: node.overlap,
    },
  );
  const columns = materializeGridTracks(node.columns, node.implicitColumn, placements.columnCount);
  const rows = materializeGridTracks(node.rows, node.implicitRow, placements.rowCount);
  const measured: ReadonlyArray<MeasuredGridItem> = node.children.map((authored, sourceIndex) => {
    const placement = placements.items[sourceIndex];
    return Object.freeze({
      authored,
      sourceIndex,
      margin: normalizeLayoutSpacing(authored.margin),
      columnStart: placement.columnStart,
      columnSpan: placement.columnSpan,
      rowStart: placement.rowStart,
      rowSpan: placement.rowSpan,
    });
  });
  const finiteYLimit = finiteYLimitOf(node, context.proposal.y, padding);
  const xCrossProposal = finiteYLimit === undefined ? intrinsicProposal('natural') : boundedProposal(finiteYLimit);
  const xMinimum = measured.map(item =>
    requiredProbe(context, item.authored.child, { x: intrinsicProposal('minimum'), y: xCrossProposal }),
  );
  const xNatural = measured.map(item =>
    requiredProbe(context, item.authored.child, { x: intrinsicProposal('natural'), y: xCrossProposal }),
  );
  const columnConstraints: ReadonlyArray<GridTrackConstraint> = measured.map((item, index) => ({
    start: item.columnStart,
    span: item.columnSpan,
    minimum: trackTargetOf(xMinimum[index], 'x', item.margin, node.columnGap * (item.columnSpan - 1)),
    natural: trackTargetOf(xNatural[index], 'x', item.margin, node.columnGap * (item.columnSpan - 1)),
  }));
  const intrinsicColumns = solveGridTracks(columns, columnConstraints, {
    gap: node.columnGap,
    distribution: node.justifyContent,
  });
  const width = resolveLayoutAxisSize({
    axis: 'x',
    policy: node.size.x,
    proposal: context.proposal.x,
    minimumContribution: axisContribution(intrinsicColumns.minimumProfile, node.columnGap, padding.left, padding.right),
    naturalContribution: axisContribution(intrinsicColumns.naturalProfile, node.columnGap, padding.left, padding.right),
  }).allocationSize;
  const preliminary = contentRectOf({ x: 0, y: 0, width, height: 0 }, padding);
  const solvedColumns = solveGridTracks(columns, columnConstraints, {
    gap: node.columnGap,
    availableSize: preliminary.width,
    distribution: node.justifyContent,
  });
  const positionedColumns = positionGridTracks(
    preliminary.x,
    solvedColumns.sizes,
    solvedColumns.leading,
    solvedColumns.between,
  );

  const yMinimum = measured.map(item => {
    const column = gridSpanRange(positionedColumns, item.columnStart, item.columnSpan);
    const innerWidth = Math.max(0, column.size - item.margin.left - item.margin.right);
    const justify = item.authored.justifySelf ?? node.justifyItems;
    return requiredProbe(context, item.authored.child, {
      x: itemAxisProposal(justify, innerWidth),
      y: intrinsicProposal('minimum'),
    });
  });
  const yNatural = measured.map(item => {
    const column = gridSpanRange(positionedColumns, item.columnStart, item.columnSpan);
    const innerWidth = Math.max(0, column.size - item.margin.left - item.margin.right);
    const justify = item.authored.justifySelf ?? node.justifyItems;
    return requiredProbe(context, item.authored.child, {
      x: itemAxisProposal(justify, innerWidth),
      y: intrinsicProposal('natural'),
    });
  });
  const rowConstraints: Array<GridTrackConstraint> = measured.map((item, index) => ({
    start: item.rowStart,
    span: item.rowSpan,
    minimum: trackTargetOf(yMinimum[index], 'y', item.margin, node.rowGap * (item.rowSpan - 1)),
    natural: trackTargetOf(yNatural[index], 'y', item.margin, node.rowGap * (item.rowSpan - 1)),
  }));
  for (let rowIndex = 0; rowIndex < rows.length; rowIndex += 1) {
    const singleRow = measured.filter(item => item.rowStart === rowIndex && item.rowSpan === 1);
    if (singleRow.length === 0) continue;
    const minimumMetrics = resolveGridRowMetrics(
      singleRow.map(item => ({
        sourceIndex: item.sourceIndex,
        alignment: item.authored.alignSelf ?? node.alignItems,
        margin: item.margin,
        result: yMinimum[item.sourceIndex],
      })),
    );
    const naturalMetrics = resolveGridRowMetrics(
      singleRow.map(item => ({
        sourceIndex: item.sourceIndex,
        alignment: item.authored.alignSelf ?? node.alignItems,
        margin: item.margin,
        result: yNatural[item.sourceIndex],
      })),
    );
    rowConstraints.push({
      start: rowIndex,
      span: 1,
      minimum: minimumMetrics.size,
      natural: naturalMetrics.size,
    });
  }
  const intrinsicRows = solveGridTracks(rows, rowConstraints, {
    gap: node.rowGap,
    distribution: node.alignContent,
  });
  const height = resolveLayoutAxisSize({
    axis: 'y',
    policy: node.size.y,
    proposal: context.proposal.y,
    minimumContribution: axisContribution(intrinsicRows.minimumProfile, node.rowGap, padding.top, padding.bottom),
    naturalContribution: axisContribution(intrinsicRows.naturalProfile, node.rowGap, padding.top, padding.bottom),
  }).allocationSize;
  const allocation: LayoutRect = Object.freeze({ x: 0, y: 0, width, height });
  const content = contentRectOf(allocation, padding);
  const solvedRows = solveGridTracks(rows, rowConstraints, {
    gap: node.rowGap,
    availableSize: content.height,
    distribution: node.alignContent,
  });
  const positionedRows = positionGridTracks(content.y, solvedRows.sizes, solvedRows.leading, solvedRows.between);

  const finalResults = measured.map(item => {
    const column = gridSpanRange(positionedColumns, item.columnStart, item.columnSpan);
    const row = gridSpanRange(positionedRows, item.rowStart, item.rowSpan);
    const slot = gridItemSlot({ x: column.start, y: row.start, width: column.size, height: row.size }, item.margin);
    return requiredProbe(context, item.authored.child, {
      x: itemAxisProposal(item.authored.justifySelf ?? node.justifyItems, slot.width),
      y: itemAxisProposal(item.authored.alignSelf ?? node.alignItems, slot.height),
    });
  });
  const finalRowMetrics = rows.map((_, rowIndex) => {
    const singleRow = measured.filter(item => item.rowStart === rowIndex && item.rowSpan === 1);
    return resolveGridRowMetrics(
      singleRow.map(item => ({
        sourceIndex: item.sourceIndex,
        alignment: item.authored.alignSelf ?? node.alignItems,
        margin: item.margin,
        result: finalResults[item.sourceIndex],
      })),
    );
  });
  const placedBySource: Array<PlacedGridItem | undefined> = Array.from({ length: measured.length });
  for (const item of measured) {
    const result = finalResults[item.sourceIndex];
    const column = gridSpanRange(positionedColumns, item.columnStart, item.columnSpan);
    const row = gridSpanRange(positionedRows, item.rowStart, item.rowSpan);
    const slot = gridItemSlot({ x: column.start, y: row.start, width: column.size, height: row.size }, item.margin);
    const justify = item.authored.justifySelf ?? node.justifyItems;
    const alignment = item.authored.alignSelf ?? node.alignItems;
    let resolvedSlot = alignResolvedLayoutSlot(slot, result, justify, alignment);
    const x = alignAllocationInSlot(slot, result.allocationBounds, 'x', justify);
    let y: number;
    if (item.rowSpan === 1 && alignment === LayoutAlignment.FirstBaseline) {
      const metrics = finalRowMetrics[item.rowStart];
      const target = row.start + (metrics.firstTarget ?? 0);
      const guide = result.alignmentGuides?.find(
        value =>
          value.dimension === LayoutAlignmentGuideDimension.Y && value.name === LayoutAlignmentGuideName.FirstBaseline,
      );
      y = target - (guide?.position ?? result.allocationBounds.y);
      resolvedSlot = Object.freeze({
        ...resolvedSlot,
        y: target - gridStructuralGuideOffset(result, LayoutAlignmentGuideName.FirstBaseline).offset,
      });
    } else if (item.rowSpan === 1 && alignment === LayoutAlignment.LastBaseline) {
      const metrics = finalRowMetrics[item.rowStart];
      const target = row.start + row.size - (metrics.size - (metrics.lastTarget ?? metrics.size));
      const guide = result.alignmentGuides?.find(
        value =>
          value.dimension === LayoutAlignmentGuideDimension.Y && value.name === LayoutAlignmentGuideName.LastBaseline,
      );
      y = target - (guide?.position ?? result.allocationBounds.y + result.allocationBounds.height);
      resolvedSlot = Object.freeze({
        ...resolvedSlot,
        y: target - gridStructuralGuideOffset(result, LayoutAlignmentGuideName.LastBaseline).offset,
      });
    } else {
      y = alignAllocationInSlot(slot, result.allocationBounds, 'y', alignment);
    }
    placedBySource[item.sourceIndex] = Object.freeze({
      sourceIndex: item.sourceIndex,
      columnStart: item.columnStart,
      columnSpan: item.columnSpan,
      rowStart: item.rowStart,
      rowSpan: item.rowSpan,
      margin: item.margin,
      slotBounds: resolvedSlot,
      alignment,
      result,
      translation: Object.freeze({ x, y }),
    });
  }
  const outputChildren = placedBySource.map(placed => {
    if (placed === undefined) throw new Error('GridLayout failed to place an authored item');
    return context.replay(placed.result, {
      transforms: [{ kind: 'translate', x: placed.translation.x, y: placed.translation.y }],
    });
  });
  const scope = context.scope(
    node.overflow === LayoutOverflow.Clip ? { clip: layoutClipOf(allocation) } : {},
    outputChildren,
  );

  const rowsWithItems = positionedRows
    .map((row, rowIndex) => ({
      row,
      rowIndex,
      items: placedBySource.filter(
        (placed): placed is PlacedGridItem =>
          placed !== undefined && placed.rowStart === rowIndex && placed.rowSpan === 1,
      ),
    }))
    .filter(value => value.items.length > 0)
    .sort((first, second) => first.row.start - second.row.start || first.rowIndex - second.rowIndex);
  let alignmentGuides: ReadonlyArray<LayoutAlignmentGuide> | undefined;
  if (rowsWithItems.length > 0) {
    alignmentGuides = Object.freeze([
      Object.freeze({
        name: LayoutAlignmentGuideName.FirstBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: outgoingRowGuide(LayoutAlignmentGuideName.FirstBaseline, rowsWithItems[0].items),
      }),
      Object.freeze({
        name: LayoutAlignmentGuideName.LastBaseline,
        dimension: LayoutAlignmentGuideDimension.Y,
        position: outgoingRowGuide(LayoutAlignmentGuideName.LastBaseline, rowsWithItems.at(-1)!.items),
      }),
    ]);
  }
  const items = placedBySource.map((placed, sourceIndex) => {
    if (placed === undefined) throw new Error('GridLayout failed to artifact an authored item');
    const authored = measured[sourceIndex].authored;
    const usesBaseline =
      placed.rowSpan === 1 &&
      (placed.alignment === LayoutAlignment.FirstBaseline || placed.alignment === LayoutAlignment.LastBaseline);
    return Object.freeze({
      ...createLayoutArtifactItem({
        key: authored.key,
        sourceIndex,
        margin: placed.margin,
        slotBounds: placed.slotBounds,
        result: placed.result,
        translation: placed.translation,
        containerAllocation: allocation,
        overflow: node.overflow,
        ...(usesBaseline
          ? {
              alignmentGuide: createLayoutArtifactAlignmentGuide(
                placed.result,
                placed.translation,
                placed.alignment,
              ),
            }
          : {}),
      }),
      column: placed.columnStart,
      row: placed.rowStart,
      columnSpan: placed.columnSpan,
      rowSpan: placed.rowSpan,
    });
  });
  const trackArtifacts = (tracks: typeof columns, positioned: typeof positionedColumns, explicitCount: number) =>
    positioned.map((track, index) =>
      Object.freeze({
        index,
        start: track.start,
        size: track.size,
        sourceKind: trackSourceKindOf(tracks[index]),
        implicit: index >= explicitCount,
      }),
    );
  return {
    children: [scope],
    allocationBounds: allocation,
    ...(alignmentGuides === undefined ? {} : { alignmentGuides }),
    artifact: Object.freeze({
      kind: 'grid',
      container: createLayoutArtifactContainer(allocation, content, items, node.overflow),
      items,
      columns: trackArtifacts(columns, positionedColumns, node.columns.length),
      rows: trackArtifacts(rows, positionedRows, node.rows.length),
    }),
  };
};
