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

type CanonicalGrid = GridBounds & {
  position?: Extract<IRGrid['bounds'], { position: unknown }>['position'];
};

type GridLineConfig = IRGridLine;
type GridLinePair = { vertical: GridLineConfig; horizontal: GridLineConfig };

/** 将 Standard Grid 规则确定性下沉为已有 Core Path 或带中心定位的 Scope */
export const lowerGrid = (grid: IRGrid): IRScope => {
  const { namespace: _namespace, type: _type, bounds, line, border, ...scopeProps } = grid;
  void _namespace;
  void _type;
  const canonical = normalizeGrid(bounds);
  const { minX, minY, maxX, maxY } = canonical;
  const canonicalLines = normalizeGridLines(line);
  const borderPadding = border?.padding ?? 0;
  const lineBounds: GridLineBounds = {
    minX,
    maxX,
    minY,
    maxY,
    lineMinX: border?.extendLines ? minX - borderPadding : minX,
    lineMaxX: border?.extendLines ? maxX + borderPadding : maxX,
    lineMinY: border?.extendLines ? minY - borderPadding : minY,
    lineMaxY: border?.extendLines ? maxY + borderPadding : maxY,
  };
  const paths: Array<IRPath> = [];

  if (border?.order === GridBorderOrder.Behind) {
    paths.push(createGridBorderPath(minX, minY, maxX, maxY, borderPadding, border.style));
  }

  if (canonicalLines !== false) {
    appendGridLines(paths, 'vertical', canonical, lineBounds, canonicalLines.vertical);
    appendGridLines(paths, 'horizontal', canonical, lineBounds, canonicalLines.horizontal);
  }

  if (border !== undefined && border.order === GridBorderOrder.Front) {
    paths.push(createGridBorderPath(minX, minY, maxX, maxY, borderPadding, border.style));
  }

  const children: Array<IRPath | IRScope> =
    canonical.position === undefined
      ? paths
      : [
          {
            type: 'scope',
            transforms: [{ kind: 'offset-translate', of: canonical.position }],
            children: paths,
          },
        ];
  return { type: 'scope', ...scopeProps, children };
};

const normalizeGrid = (bounds: IRGrid['bounds']): CanonicalGrid => {
  let minX: number;
  let minY: number;
  let maxX: number;
  let maxY: number;
  let position: CanonicalGrid['position'];

  if ('start' in bounds) {
    const [startX, startY] = bounds.start;
    const [endX, endY] = bounds.end;
    minX = Math.min(startX, endX);
    minY = Math.min(startY, endY);
    maxX = Math.max(startX, endX);
    maxY = Math.max(startY, endY);
  } else {
    minX = -bounds.width / 2;
    minY = -bounds.height / 2;
    maxX = bounds.width / 2;
    maxY = bounds.height / 2;
    position = bounds.position;
  }

  return {
    minX,
    maxX,
    minY,
    maxY,
    position,
  };
};

const normalizeGridLines = (line: IRGrid['line'] | undefined): GridLinePair | false => {
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
  canonical: CanonicalGrid,
  bounds: GridLineBounds,
  line: GridLineConfig,
): void => {
  const isVertical = axis === 'vertical';
  const lattice = enumerateLattice({
    min: isVertical ? canonical.minX : canonical.minY,
    max: isVertical ? canonical.maxX : canonical.maxY,
    spacing: line.spacing,
    origin: line.origin ?? (isVertical ? canonical.minX : canonical.minY),
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
    {
      type: 'step',
      kind: 'rectangle',
      from: [minX - padding, minY - padding],
      to: [maxX + padding, maxY + padding],
    },
  ],
});
