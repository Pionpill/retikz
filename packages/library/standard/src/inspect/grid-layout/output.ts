import type { InspectorContext } from '@retikz/inspect';

import type { GridLayoutArtifact } from '../../composites/layout/grid-layout';
import type { LayoutInspectionChild, LayoutInspectionLineMark, LayoutInspectionMark } from '../shared';
import type { ResolvedGridLayoutInspectOptions } from './types';

import {
  inspectLayoutArtifactBase,
  inspectLayoutLine,
  inspectLayoutOutline,
  inspectLayoutSpacing,
  lowerLayoutInspectionMarks,
  normalizeLayoutBoundaryGroups,
} from '../shared';

/** 把 Grid 布局产物转换为普通 Core 辅助子元素 */
export const inspectGridLayoutArtifact = (
  artifact: GridLayoutArtifact,
  context: InspectorContext<ResolvedGridLayoutInspectOptions>,
): ReadonlyArray<LayoutInspectionChild> => {
  const base = inspectLayoutArtifactBase(artifact.container, artifact.items, context.options, context.appearance);
  const structure: Array<LayoutInspectionMark> = [];
  const content = artifact.container.contentBounds;
  if (context.options.tracks) {
    const trackLines: Array<LayoutInspectionLineMark> = [];
    artifact.columns.forEach(track => {
      [track.start, track.start + track.size].forEach(x =>
        trackLines.push(
          inspectLayoutLine(
            'grid.track',
            x,
            content.y,
            x,
            content.y + content.height,
            context.appearance.scopeColor,
            true,
          ),
        ),
      );
    });
    artifact.rows.forEach(track => {
      [track.start, track.start + track.size].forEach(y =>
        trackLines.push(
          inspectLayoutLine(
            'grid.track',
            content.x,
            y,
            content.x + content.width,
            y,
            context.appearance.scopeColor,
            true,
          ),
        ),
      );
    });
    structure.push(...trackLines);
  }
  if (context.options.cells) {
    artifact.rows.forEach(row =>
      artifact.columns.forEach(column =>
        structure.push(
          inspectLayoutOutline(
            'grid.cell',
            { x: column.start, y: row.start, width: column.size, height: row.size },
            context.appearance.scopeColor,
          ),
        ),
      ),
    );
  }
  if (context.options.spans) {
    artifact.items
      .filter(item => item.columnSpan > 1 || item.rowSpan > 1)
      .forEach(item =>
        structure.push(inspectLayoutOutline('grid.span', item.slotBounds, context.appearance.scopeColor)),
      );
  }
  const spacing = inspectLayoutSpacing('grid', artifact.spacing, context.options, context.appearance);
  const [boxes = [], normalizedStructure = [], underlay = [], normalizedSpacing = []] = normalizeLayoutBoundaryGroups([
    base.boxes,
    structure,
    base.underlay,
    spacing,
  ]);
  return lowerLayoutInspectionMarks([
    ...underlay,
    ...normalizedSpacing,
    ...normalizedStructure,
    ...boxes,
    ...base.warnings,
    ...base.guides,
    ...base.labels,
  ]);
};
