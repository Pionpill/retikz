import type { IRPath, IRScope } from '@retikz/core';

import type { IRStandardPathBorderStyle, IRStandardPathStrokeStyle } from '../shared/types';
import type { IRGrid } from './types';

import { enumerateLattice } from '../shared/lattice';
import { GridBorderOrder } from './constants';

type GridLineBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
  lineMinX: number;
  lineMaxX: number;
  lineMinY: number;
  lineMaxY: number;
};

type NormalizedGrid = GridLineBounds & {
  position?: Extract<IRGrid['bounds'], { position: unknown }>['position'];
};

/** 将 Standard Grid 规则确定性下沉为已有 Core Path 或带中心定位的 Scope */
export const lowerGrid = (grid: IRGrid): Array<IRPath | IRScope> => {
  const normalized = normalizeGrid(grid);
  const { minX, minY, maxX, maxY } = normalized;
  const borderPadding = grid.border?.padding ?? 0;
  const lineBounds: GridLineBounds = {
    minX,
    maxX,
    minY,
    maxY,
    lineMinX: grid.border?.extendLines ? minX - borderPadding : minX,
    lineMaxX: grid.border?.extendLines ? maxX + borderPadding : maxX,
    lineMinY: grid.border?.extendLines ? minY - borderPadding : minY,
    lineMaxY: grid.border?.extendLines ? maxY + borderPadding : maxY,
  };
  const paths: Array<IRPath> = [];

  if (grid.border?.order === GridBorderOrder.Behind) {
    paths.push(createGridBorderPath(minX, minY, maxX, maxY, borderPadding, grid.border.style));
  }

  const [spacingX, spacingY] =
    typeof grid.spacing === 'number' ? [grid.spacing, grid.spacing] : [grid.spacing.x, grid.spacing.y];

  if (grid.lines.vertical) {
    appendGridLines(paths, 'vertical', normalized, lineBounds, {
      spacing: spacingX,
      origin: grid.origin?.[0] ?? normalized.minX,
      includeBoundary: grid.lines.includeBoundary,
      style: grid.lines.style,
      major: grid.major,
    });
  }
  if (grid.lines.horizontal) {
    appendGridLines(paths, 'horizontal', normalized, lineBounds, {
      spacing: spacingY,
      origin: grid.origin?.[1] ?? normalized.minY,
      includeBoundary: grid.lines.includeBoundary,
      style: grid.lines.style,
      major: grid.major,
    });
  }

  if (grid.border !== undefined && grid.border.order === GridBorderOrder.Front) {
    paths.push(createGridBorderPath(minX, minY, maxX, maxY, borderPadding, grid.border.style));
  }

  if (normalized.position === undefined) return paths;

  const scope: IRScope = {
    type: 'scope',
    transforms: [{ kind: 'offset-translate', of: normalized.position }],
    children: paths,
  };
  return [scope];
};

const normalizeGrid = (grid: IRGrid): NormalizedGrid => {
  let minX: number;
  let minY: number;
  let maxX: number;
  let maxY: number;
  let position: NormalizedGrid['position'];

  if ('start' in grid.bounds) {
    const [startX, startY] = grid.bounds.start;
    const [endX, endY] = grid.bounds.end;
    minX = Math.min(startX, endX);
    minY = Math.min(startY, endY);
    maxX = Math.max(startX, endX);
    maxY = Math.max(startY, endY);
  } else {
    minX = -grid.bounds.width / 2;
    minY = -grid.bounds.height / 2;
    maxX = grid.bounds.width / 2;
    maxY = grid.bounds.height / 2;
    position = grid.bounds.position;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    position,
    lineMinX: grid.border?.extendLines ? minX - grid.border.padding : minX,
    lineMaxX: grid.border?.extendLines ? maxX + grid.border.padding : maxX,
    lineMinY: grid.border?.extendLines ? minY - grid.border.padding : minY,
    lineMaxY: grid.border?.extendLines ? maxY + grid.border.padding : maxY,
  };
};

const appendGridLines = (
  paths: Array<IRPath>,
  axis: 'vertical' | 'horizontal',
  normalized: NormalizedGrid,
  bounds: GridLineBounds,
  line: {
    spacing: number;
    origin: number;
    includeBoundary: boolean;
    style?: IRStandardPathStrokeStyle;
    major?: IRGrid['major'];
  },
): void => {
  const isVertical = axis === 'vertical';
  const lattice = enumerateLattice({
    min: isVertical ? normalized.minX : normalized.minY,
    max: isVertical ? normalized.maxX : normalized.maxY,
    spacing: line.spacing,
    origin: line.origin,
    includeBoundary: line.includeBoundary,
  });

  lattice.forEach(item => {
    const from: [number, number] = isVertical ? [item.value, bounds.lineMinY] : [bounds.lineMinX, item.value];
    const to: [number, number] = isVertical ? [item.value, bounds.lineMaxY] : [bounds.lineMaxX, item.value];
    const resolvedStyle = isMajorLine(item.index, line.major) ? { ...line.style, ...line.major?.style } : line.style;
    paths.push(createGridLinePath(from, to, resolvedStyle));
  });
};

const isMajorLine = (index: number | undefined, major: IRGrid['major']): boolean => {
  if (major === undefined || index === undefined) return false;
  return (((index - major.offset) % major.every) + major.every) % major.every === 0;
};

const createGridLinePath = (
  from: [number, number],
  to: [number, number],
  style: IRStandardPathStrokeStyle | undefined,
): IRPath => ({
  ...style,
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: from },
    { type: 'step', kind: 'line', to },
  ],
});

const createGridBorderPath = (
  minX: number,
  minY: number,
  maxX: number,
  maxY: number,
  padding: number,
  style: IRStandardPathBorderStyle | undefined,
): IRPath => ({
  ...style,
  type: 'path',
  children: [
    { type: 'step', kind: 'move', to: [minX - padding, minY - padding] },
    { type: 'step', kind: 'line', to: [maxX + padding, minY - padding] },
    { type: 'step', kind: 'line', to: [maxX + padding, maxY + padding] },
    { type: 'step', kind: 'line', to: [minX - padding, maxY + padding] },
    { type: 'step', kind: 'cycle' },
  ],
});
