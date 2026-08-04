import type { IRPath, IRScope } from '@retikz/core';

import type { IRStandardPathBorderStyle, IRStandardPathStrokeStyle } from '../shared/types';
import type { IRGrid, IRGridLine } from './types';

import { enumerateLattice } from '../shared/lattice';
import { DEFAULT_GRID_LINE_SPACING, GridBorderOrder } from './constants';

type GridBounds = {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
};

type GridLineBounds = GridBounds & {
  lineMinX: number;
  lineMaxX: number;
  lineMinY: number;
  lineMaxY: number;
};

type NormalizedGrid = GridBounds & {
  position?: Extract<IRGrid['bounds'], { position: unknown }>['position'];
};

type GridLineConfig = IRGridLine;
type GridLinePair = { vertical: GridLineConfig; horizontal: GridLineConfig };

/** 将 Standard Grid 规则确定性下沉为已有 Core Path 或带中心定位的 Scope */
export const lowerGrid = (grid: IRGrid): Array<IRPath | IRScope> => {
  const normalized = normalizeGrid(grid);
  const { minX, minY, maxX, maxY } = normalized;
  const line = normalizeGridLine(grid.line);
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

  if (line !== false) {
    appendGridLines(paths, 'vertical', normalized, lineBounds, line.vertical);
    appendGridLines(paths, 'horizontal', normalized, lineBounds, line.horizontal);
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
  };
};

const normalizeGridLine = (line: IRGrid['line'] | undefined): GridLinePair | false => {
  if (line === false) return false;
  if (line === true || line === undefined) {
    const defaultLine: GridLineConfig = {
      spacing: DEFAULT_GRID_LINE_SPACING,
      includeBoundary: false,
    };
    return { vertical: defaultLine, horizontal: defaultLine };
  }
  if ('vertical' in line) return line;
  return { vertical: line, horizontal: line };
};

const appendGridLines = (
  paths: Array<IRPath>,
  axis: 'vertical' | 'horizontal',
  normalized: NormalizedGrid,
  bounds: GridLineBounds,
  line: GridLineConfig,
): void => {
  const isVertical = axis === 'vertical';
  const lattice = enumerateLattice({
    min: isVertical ? normalized.minX : normalized.minY,
    max: isVertical ? normalized.maxX : normalized.maxY,
    spacing: line.spacing,
    origin: line.origin ?? (isVertical ? normalized.minX : normalized.minY),
    includeBoundary: line.includeBoundary,
  });

  lattice.forEach(item => {
    const from: [number, number] = isVertical ? [item.value, bounds.lineMinY] : [bounds.lineMinX, item.value];
    const to: [number, number] = isVertical ? [item.value, bounds.lineMaxY] : [bounds.lineMaxX, item.value];
    const resolvedStyle = isMajorLine(item.index, line.major) ? { ...line.style, ...line.major?.style } : line.style;
    paths.push(createGridLinePath(from, to, resolvedStyle));
  });
};

const isMajorLine = (index: number | undefined, major: GridLineConfig['major']): boolean => {
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
