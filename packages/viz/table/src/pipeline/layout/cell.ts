import type { BoundsInsets, BoundsRect } from '@retikz/math';

import type { TableTrackLayout } from './types';

import { deepFreeze } from '../../shared';

/** Cell 几何计算支持的轴向对齐值 */
export type TableCellAlignment = 'start' | 'center' | 'end';

/** allocation bounds 与 padding 合成的 Cell 外部尺寸 */
export type TableCellOuterSize = Readonly<{
  /** 横向 finite nonnegative 外部尺寸 */
  width: number;
  /** 纵向 finite nonnegative 外部尺寸 */
  height: number;
}>;

/** replay root 外层使用的 Table-local 数值平移 */
export type TableCellTranslation = Readonly<{
  /** finite 横向平移 */
  x: number;
  /** finite 纵向平移 */
  y: number;
}>;

/** 由 canonical tracks 计算 spanning Cell box 的输入 */
export type ComputeTableCellBoxInput = Readonly<{
  /** canonical row tracks */
  rows: ReadonlyArray<TableTrackLayout>;
  /** canonical column tracks */
  columns: ReadonlyArray<TableTrackLayout>;
  /** 起始 canonical row index */
  rowIndex: number;
  /** 起始 canonical column index */
  columnIndex: number;
  /** 连续覆盖的 row 数量 */
  rowSpan: number;
  /** 连续覆盖的 column 数量 */
  columnSpan: number;
  /** 相邻 row 间 finite nonnegative gap */
  rowGap: number;
  /** 相邻 column 间 finite nonnegative gap */
  columnGap: number;
}>;

/** Cell content box 与 Core allocation bounds 的对齐输入 */
export type ComputeTableCellTranslationInput = Readonly<{
  /** padding 收缩后的 Table-local content box */
  contentBox: BoundsRect;
  /** replay root 未放置局部坐标系的 Core allocation bounds */
  allocationBounds: BoundsRect;
  /** 横向对齐 */
  horizontalAlign: TableCellAlignment;
  /** 纵向对齐 */
  verticalAlign: TableCellAlignment;
}>;

const assertFiniteNonnegative = (value: number, name: string): void => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`table: ${name} must be a finite nonnegative number`);
  }
};

const validateBoundsRect = (rect: BoundsRect, name: string): void => {
  if (!Number.isFinite(rect.x) || !Number.isFinite(rect.y)) {
    throw new Error(`table: ${name} must have finite x and y`);
  }
  assertFiniteNonnegative(rect.width, `${name} width`);
  assertFiniteNonnegative(rect.height, `${name} height`);
};

const validatePadding = (padding: Readonly<BoundsInsets>): void => {
  assertFiniteNonnegative(padding.top, 'padding top');
  assertFiniteNonnegative(padding.right, 'padding right');
  assertFiniteNonnegative(padding.bottom, 'padding bottom');
  assertFiniteNonnegative(padding.left, 'padding left');
};

const validateTrackLayouts = (tracks: ReadonlyArray<TableTrackLayout>, axis: string): void => {
  tracks.forEach((track, index) => {
    if (track.index !== index) {
      throw new Error(`table: ${axis} track ${index} has non-canonical index ${track.index}`);
    }
    if (!Number.isFinite(track.offset)) {
      throw new Error(`table: ${axis} track ${index} offset must be finite`);
    }
    assertFiniteNonnegative(track.size, `${axis} track ${index} size`);
  });
};

const validateStartAndSpan = (start: number, span: number, count: number, axis: string): void => {
  if (!Number.isInteger(start) || start < 0) {
    throw new Error(`table: ${axis}Index must be a nonnegative integer`);
  }
  if (!Number.isInteger(span) || span <= 0) {
    throw new Error(`table: ${axis}Span must be a positive integer`);
  }
  if (start + span > count) {
    throw new Error(`table: ${axis} span range exceeds ${count} tracks`);
  }
};

/** 按轴向对齐值选择矩形的 min、center 或 max anchor */
const alignmentAnchor = (start: number, size: number, alignment: TableCellAlignment, name: string): number => {
  switch (alignment) {
    case 'start':
      return start;
    case 'center':
      return start + size / 2;
    case 'end':
      return start + size;
    default:
      throw new Error(`table: ${name} must be start, center, or end`);
  }
};

/** 根据 allocation bounds 与 resolved padding 计算外部 contribution 尺寸 */
export const computeTableCellOuterSize = (
  allocationBounds: BoundsRect,
  padding: Readonly<BoundsInsets>,
): TableCellOuterSize => {
  validateBoundsRect(allocationBounds, 'allocationBounds');
  validatePadding(padding);
  const width = allocationBounds.width + padding.left + padding.right;
  const height = allocationBounds.height + padding.top + padding.bottom;
  if (!Number.isFinite(width) || !Number.isFinite(height)) {
    throw new Error('table: Cell outer size must be finite');
  }
  return deepFreeze({ width, height });
};

/** 从 canonical row / column tracks 计算包含内部 gaps 的 Cell box */
export const computeTableCellBox = (input: ComputeTableCellBoxInput): BoundsRect => {
  validateTrackLayouts(input.rows, 'row');
  validateTrackLayouts(input.columns, 'column');
  validateStartAndSpan(input.rowIndex, input.rowSpan, input.rows.length, 'row');
  validateStartAndSpan(input.columnIndex, input.columnSpan, input.columns.length, 'column');
  assertFiniteNonnegative(input.rowGap, 'rowGap');
  assertFiniteNonnegative(input.columnGap, 'columnGap');

  const row = input.rows[input.rowIndex];
  const column = input.columns[input.columnIndex];
  const width =
    input.columns
      .slice(input.columnIndex, input.columnIndex + input.columnSpan)
      .reduce((total, track) => total + track.size, 0) +
    (input.columnSpan - 1) * input.columnGap;
  const height =
    input.rows.slice(input.rowIndex, input.rowIndex + input.rowSpan).reduce((total, track) => total + track.size, 0) +
    (input.rowSpan - 1) * input.rowGap;
  const box = { x: column.offset, y: row.offset, width, height };
  validateBoundsRect(box, 'Cell box');
  return deepFreeze(box);
};

/** 按 resolved padding 向内收缩 Cell box */
export const computeTableCellContentBox = (box: BoundsRect, padding: Readonly<BoundsInsets>): BoundsRect => {
  validateBoundsRect(box, 'Cell box');
  validatePadding(padding);
  const contentBox = {
    x: box.x + Math.min(padding.left, box.width),
    y: box.y + Math.min(padding.top, box.height),
    width: Math.max(0, box.width - padding.left - padding.right),
    height: Math.max(0, box.height - padding.top - padding.bottom),
  };
  validateBoundsRect(contentBox, 'Cell contentBox');
  return deepFreeze(contentBox);
};

/** 按真实 allocation bounds anchor 计算 Table-local finite translation */
export const computeTableCellTranslation = (input: ComputeTableCellTranslationInput): TableCellTranslation => {
  validateBoundsRect(input.contentBox, 'contentBox');
  validateBoundsRect(input.allocationBounds, 'allocationBounds');
  const x =
    alignmentAnchor(input.contentBox.x, input.contentBox.width, input.horizontalAlign, 'horizontalAlign') -
    alignmentAnchor(input.allocationBounds.x, input.allocationBounds.width, input.horizontalAlign, 'horizontalAlign');
  const y =
    alignmentAnchor(input.contentBox.y, input.contentBox.height, input.verticalAlign, 'verticalAlign') -
    alignmentAnchor(input.allocationBounds.y, input.allocationBounds.height, input.verticalAlign, 'verticalAlign');
  if (!Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error('table: Cell translation must contain finite x and y');
  }
  return deepFreeze({ x, y });
};
