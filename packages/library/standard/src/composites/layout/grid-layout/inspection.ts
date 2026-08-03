import type { InspectionLinePrimitive, InspectionPrimitive } from '@retikz/core';

import type { ResolvedGridLayoutInspectLocalOptions, StandardLayoutInspectContext } from '../shared';
import type { GridLayoutArtifact } from './types';

import { inspectLayoutArtifactBase, inspectLayoutSpacing, normalizeLayoutBoundaryGroups } from '../internal';

/** 把 GridLayout typed artifact lowering 为受限 inspection primitives */
export const inspectGridLayoutArtifact = (
  artifact: GridLayoutArtifact,
  context: StandardLayoutInspectContext<ResolvedGridLayoutInspectLocalOptions>,
): ReadonlyArray<InspectionPrimitive> => {
  const base = inspectLayoutArtifactBase(artifact.container, artifact.items, context.baseOptions);
  const structure: Array<InspectionPrimitive> = [];
  const content = artifact.container.contentBounds;
  if (context.options.tracks) {
    const trackLines: Array<InspectionLinePrimitive> = [];
    artifact.columns.forEach(track => {
      [track.start, track.start + track.size].forEach(x =>
        trackLines.push({
          kind: 'line',
          role: 'grid.track',
          x1: x,
          y1: content.y,
          x2: x,
          y2: content.y + content.height,
          tone: 'scope',
          lineStyle: 'dashed',
        }),
      );
    });
    artifact.rows.forEach(track => {
      [track.start, track.start + track.size].forEach(y =>
        trackLines.push({
          kind: 'line',
          role: 'grid.track',
          x1: content.x,
          y1: y,
          x2: content.x + content.width,
          y2: y,
          tone: 'scope',
          lineStyle: 'dashed',
        }),
      );
    });
    structure.push(...trackLines);
  }
  if (context.options.cells) {
    artifact.rows.forEach(row =>
      artifact.columns.forEach(column =>
        structure.push({
          kind: 'rect',
          role: 'grid.cell',
          x: column.start,
          y: row.start,
          width: column.size,
          height: row.size,
          presentation: 'outline',
          tone: 'scope',
          lineStyle: 'dashed',
        }),
      ),
    );
  }
  if (context.options.spans) {
    artifact.items
      .filter(item => item.columnSpan > 1 || item.rowSpan > 1)
      .forEach(item =>
        structure.push({
          kind: 'rect',
          role: 'grid.span',
          ...item.slotBounds,
          presentation: 'outline',
          tone: 'scope',
          lineStyle: 'dashed',
        }),
      );
  }
  const spacing = inspectLayoutSpacing('grid', artifact.spacing, context.options);
  const [boxes = [], normalizedStructure = [], underlay = [], normalizedSpacing = []] = normalizeLayoutBoundaryGroups([
    base.boxes,
    structure,
    base.underlay,
    spacing,
  ]);
  return [
    ...underlay,
    ...normalizedSpacing,
    ...normalizedStructure,
    ...boxes,
    ...base.warnings,
    ...base.guides,
    ...base.labels,
  ];
};
