import type { InspectionPrimitive } from '@retikz/core';

import type { ResolvedGridLayoutInspectLocalOptions, StandardLayoutInspectContext } from '../shared/layout';
import type { GridLayoutArtifact } from './artifact-types';

import { inspectLayoutArtifactBase } from '../shared/layout/internal';

/** 把 GridLayout typed artifact lowering 为受限 inspection primitives */
export const inspectGridLayoutArtifact = (
  artifact: GridLayoutArtifact,
  context: StandardLayoutInspectContext<ResolvedGridLayoutInspectLocalOptions>,
): ReadonlyArray<InspectionPrimitive> => {
  const primitives = inspectLayoutArtifactBase(artifact.container, artifact.items, context.baseOptions);
  const content = artifact.container.contentBounds;
  if (context.options.tracks) {
    artifact.columns.forEach(track => {
      [track.start, track.start + track.size].forEach(x =>
        primitives.push({
          kind: 'line',
          role: 'grid.track',
          x1: x,
          y1: content.y,
          x2: x,
          y2: content.y + content.height,
          tone: 'guide',
          lineStyle: 'dashed',
        }),
      );
    });
    artifact.rows.forEach(track => {
      [track.start, track.start + track.size].forEach(y =>
        primitives.push({
          kind: 'line',
          role: 'grid.track',
          x1: content.x,
          y1: y,
          x2: content.x + content.width,
          y2: y,
          tone: 'guide',
          lineStyle: 'dashed',
        }),
      );
    });
  }
  if (context.options.cells) {
    artifact.rows.forEach(row =>
      artifact.columns.forEach(column =>
        primitives.push({
          kind: 'rect',
          role: 'grid.cell',
          x: column.start,
          y: row.start,
          width: column.size,
          height: row.size,
          presentation: 'outline',
          tone: 'neutral',
          lineStyle: 'dotted',
        }),
      ),
    );
  }
  if (context.options.gaps) {
    artifact.columns.slice(1).forEach((track, index) => {
      const previous = artifact.columns[index];
      const start = previous.start + previous.size;
      if (track.start <= start) return;
      primitives.push({
        kind: 'rect',
        role: 'grid.gap',
        x: start,
        y: content.y,
        width: track.start - start,
        height: content.height,
        presentation: 'fill',
        tone: 'guide',
        opacity: 0.1,
      });
    });
    artifact.rows.slice(1).forEach((track, index) => {
      const previous = artifact.rows[index];
      const start = previous.start + previous.size;
      if (track.start <= start) return;
      primitives.push({
        kind: 'rect',
        role: 'grid.gap',
        x: content.x,
        y: start,
        width: content.width,
        height: track.start - start,
        presentation: 'fill',
        tone: 'guide',
        opacity: 0.1,
      });
    });
  }
  if (context.options.spans) {
    artifact.items
      .filter(item => item.columnSpan > 1 || item.rowSpan > 1)
      .forEach(item =>
        primitives.push({
          kind: 'rect',
          role: 'grid.span',
          ...item.slotBounds,
          presentation: 'outline',
          tone: 'accent',
          lineStyle: 'dotted',
        }),
      );
  }
  return primitives;
};
