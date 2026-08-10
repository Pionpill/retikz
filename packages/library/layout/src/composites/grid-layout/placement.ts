import type { GridAutoFlowValue, GridOverlapValue, IRGridPlacement } from './types';

import { GRID_LAYOUT_MAX_TRACKS_PER_AXIS, GridAutoFlow, GridOverlap } from './constants';

/** Grid placement solver 接受的 authored item 摘要 */
export type GridPlacementItem = Readonly<{
  key: string;
  sourceIndex: number;
  column?: IRGridPlacement;
  row?: IRGridPlacement;
}>;

/** Grid item 求解后的零基 track 区域 */
export type ResolvedGridPlacement = Readonly<{
  key: string;
  sourceIndex: number;
  columnStart: number;
  columnSpan: number;
  rowStart: number;
  rowSpan: number;
}>;

/** Grid placement solver 的完整 extent 与 authored-order 结果 */
export type ResolvedGridPlacements = Readonly<{
  columnCount: number;
  rowCount: number;
  items: ReadonlyArray<ResolvedGridPlacement>;
}>;

type OccupiedRect = Readonly<{
  columnStart: number;
  columnEnd: number;
  rowStart: number;
  rowEnd: number;
}>;

/** 在任何加法前校验单轴 start/span 不超过 track guard */
const guardedEnd = (start: number, span: number, axis: 'column' | 'row', key: string): number => {
  if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(span) || span <= 0) {
    throw new Error(`GridLayout item '${key}' has invalid ${axis} start or span`);
  }
  if (start > GRID_LAYOUT_MAX_TRACKS_PER_AXIS - span) {
    throw new Error(`GridLayout item '${key}' exceeds the ${axis} track guard`);
  }
  return start + span;
};

/** 把已解析 placement 转为半开占位矩形 */
const rectOf = (placement: ResolvedGridPlacement): OccupiedRect => ({
  columnStart: placement.columnStart,
  columnEnd: placement.columnStart + placement.columnSpan,
  rowStart: placement.rowStart,
  rowEnd: placement.rowStart + placement.rowSpan,
});

/** 判断两个半开占位矩形是否相交 */
const overlaps = (first: OccupiedRect, second: OccupiedRect): boolean =>
  first.columnStart < second.columnEnd &&
  second.columnStart < first.columnEnd &&
  first.rowStart < second.rowEnd &&
  second.rowStart < first.rowEnd;

/** 按登记顺序查找首个占位冲突 */
const firstOverlap = (candidate: OccupiedRect, occupied: ReadonlyArray<OccupiedRect>): OccupiedRect | undefined =>
  occupied.find(rect => overlaps(candidate, rect));

/** 求解 explicit、partial 与 non-dense auto placement */
export const resolveGridPlacements = (
  items: ReadonlyArray<GridPlacementItem>,
  options: Readonly<{
    explicitColumns: number;
    explicitRows: number;
    autoFlow: GridAutoFlowValue;
    overlap: GridOverlapValue;
  }>,
): ResolvedGridPlacements => {
  if (options.explicitColumns < 1 || options.explicitColumns > GRID_LAYOUT_MAX_TRACKS_PER_AXIS) {
    throw new Error('GridLayout explicit column count is outside the track guard');
  }
  if (options.explicitRows < 0 || options.explicitRows > GRID_LAYOUT_MAX_TRACKS_PER_AXIS) {
    throw new Error('GridLayout explicit row count is outside the track guard');
  }
  let columnCount = options.explicitColumns;
  let rowCount = Math.max(options.explicitRows, 1);
  const occupied: Array<OccupiedRect> = [];
  const resolved: Array<ResolvedGridPlacement | undefined> = Array.from({ length: items.length });

  const register = (placement: ResolvedGridPlacement, allowOverlap = false): void => {
    const rect = rectOf(placement);
    if (!allowOverlap && firstOverlap(rect, occupied) !== undefined) {
      throw new Error(`GridLayout item '${placement.key}' overlaps an occupied explicit area`);
    }
    occupied.push(rect);
    resolved[placement.sourceIndex] = Object.freeze(placement);
    columnCount = Math.max(columnCount, rect.columnEnd);
    rowCount = Math.max(rowCount, rect.rowEnd);
  };

  for (const item of items) {
    const columnStart = item.column?.start;
    const rowStart = item.row?.start;
    if (columnStart === undefined || rowStart === undefined) continue;
    const columnSpan = item.column?.span ?? 1;
    const rowSpan = item.row?.span ?? 1;
    guardedEnd(columnStart, columnSpan, 'column', item.key);
    guardedEnd(rowStart, rowSpan, 'row', item.key);
    register(
      {
        key: item.key,
        sourceIndex: item.sourceIndex,
        columnStart,
        columnSpan,
        rowStart,
        rowSpan,
      },
      options.overlap === GridOverlap.Allow,
    );
  }

  for (const item of items) {
    const hasColumn = item.column?.start !== undefined;
    const hasRow = item.row?.start !== undefined;
    if (hasColumn === hasRow) continue;
    if (hasRow) {
      const rowStart = item.row.start!;
      const rowSpan = item.row.span;
      const columnSpan = item.column?.span ?? 1;
      const rowEnd = guardedEnd(rowStart, rowSpan, 'row', item.key);
      rowCount = Math.max(rowCount, rowEnd);
      let columnStart = 0;
      for (;;) {
        const columnEnd = guardedEnd(columnStart, columnSpan, 'column', item.key);
        const collision = firstOverlap({ columnStart, columnEnd, rowStart, rowEnd }, occupied);
        if (collision === undefined) break;
        columnStart = collision.columnEnd;
      }
      register({
        key: item.key,
        sourceIndex: item.sourceIndex,
        columnStart,
        columnSpan,
        rowStart,
        rowSpan,
      });
    } else {
      const column = item.column!;
      const columnStart = column.start!;
      const columnSpan = column.span;
      const rowSpan = item.row?.span ?? 1;
      const columnEnd = guardedEnd(columnStart, columnSpan, 'column', item.key);
      columnCount = Math.max(columnCount, columnEnd);
      let rowStart = 0;
      for (;;) {
        const rowEnd = guardedEnd(rowStart, rowSpan, 'row', item.key);
        const collision = firstOverlap({ columnStart, columnEnd, rowStart, rowEnd }, occupied);
        if (collision === undefined) break;
        rowStart = collision.rowEnd;
      }
      register({
        key: item.key,
        sourceIndex: item.sourceIndex,
        columnStart,
        columnSpan,
        rowStart,
        rowSpan,
      });
    }
  }

  let cursorColumn = 0;
  let cursorRow = 0;
  for (const item of items) {
    if (item.column?.start !== undefined || item.row?.start !== undefined) continue;
    const columnSpan = item.column?.span ?? 1;
    const rowSpan = item.row?.span ?? 1;
    if (options.autoFlow === GridAutoFlow.Row) {
      guardedEnd(0, columnSpan, 'column', item.key);
      columnCount = Math.max(columnCount, columnSpan);
    } else {
      guardedEnd(0, rowSpan, 'row', item.key);
      rowCount = Math.max(rowCount, rowSpan);
    }
    for (;;) {
      if (options.autoFlow === GridAutoFlow.Row && cursorColumn > columnCount - columnSpan) {
        cursorColumn = 0;
        cursorRow += 1;
      }
      if (options.autoFlow === GridAutoFlow.Column && cursorRow > rowCount - rowSpan) {
        cursorRow = 0;
        cursorColumn += 1;
      }
      const columnEnd = guardedEnd(cursorColumn, columnSpan, 'column', item.key);
      const rowEnd = guardedEnd(cursorRow, rowSpan, 'row', item.key);
      const collision = firstOverlap({ columnStart: cursorColumn, columnEnd, rowStart: cursorRow, rowEnd }, occupied);
      if (collision === undefined) break;
      if (options.autoFlow === GridAutoFlow.Row) cursorColumn = collision.columnEnd;
      else cursorRow = collision.rowEnd;
    }
    const placement = {
      key: item.key,
      sourceIndex: item.sourceIndex,
      columnStart: cursorColumn,
      columnSpan,
      rowStart: cursorRow,
      rowSpan,
    };
    register(placement);
    if (options.autoFlow === GridAutoFlow.Row) cursorColumn += columnSpan;
    else cursorRow += rowSpan;
  }

  return Object.freeze({
    columnCount,
    rowCount,
    items: Object.freeze(
      resolved.map(value => {
        if (value === undefined) throw new Error('GridLayout placement did not resolve every item');
        return value;
      }),
    ),
  });
};
