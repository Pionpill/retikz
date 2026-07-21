import type { IRPath } from '@retikz/core';

import type { IRStandardPathBorderStyle, IRStandardPathStrokeStyle } from '../shared';
import type { IRGrid } from './types';

import { enumerateGridLattice, isGridMajorLine } from '../../shared';

/** 将 Standard Grid 规则确定性下沉为已有 Core Path */
export const lowerGrid = (grid: IRGrid): Array<IRPath> => {
  const [minX, minY] = grid.bounds.min;
  const [maxX, maxY] = grid.bounds.max;
  const [originX, originY] = grid.origin ?? grid.bounds.min;
  const [spacingX, spacingY] =
    typeof grid.spacing === 'number' ? [grid.spacing, grid.spacing] : [grid.spacing.x, grid.spacing.y];
  const borderPadding = grid.border?.padding ?? 0;
  const lineMinX = grid.border?.extendLines ? minX - borderPadding : minX;
  const lineMaxX = grid.border?.extendLines ? maxX + borderPadding : maxX;
  const lineMinY = grid.border?.extendLines ? minY - borderPadding : minY;
  const lineMaxY = grid.border?.extendLines ? maxY + borderPadding : maxY;
  const vertical = enumerateGridLattice({
    min: minX,
    max: maxX,
    spacing: spacingX,
    origin: originX,
    includeBoundary: grid.lines.includeBoundary,
  });
  const horizontal = enumerateGridLattice({
    min: minY,
    max: maxY,
    spacing: spacingY,
    origin: originY,
    includeBoundary: grid.lines.includeBoundary,
  });
  const paths: Array<IRPath> = [];

  if (grid.border?.order === 'behind') {
    paths.push(createGridBorderPath(minX, minY, maxX, maxY, borderPadding, grid.border.style));
  }

  if (grid.lines.vertical) {
    vertical.forEach(line => {
      paths.push(
        createGridLinePath(
          [line.value, lineMinY],
          [line.value, lineMaxY],
          isGridMajorLine(line, grid.major) ? { ...grid.lines.style, ...grid.major?.style } : grid.lines.style,
        ),
      );
    });
  }

  if (grid.lines.horizontal) {
    horizontal.forEach(line => {
      paths.push(
        createGridLinePath(
          [lineMinX, line.value],
          [lineMaxX, line.value],
          isGridMajorLine(line, grid.major) ? { ...grid.lines.style, ...grid.major?.style } : grid.lines.style,
        ),
      );
    });
  }

  if (grid.border !== undefined && grid.border.order === 'front') {
    paths.push(createGridBorderPath(minX, minY, maxX, maxY, borderPadding, grid.border.style));
  }

  return paths;
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
