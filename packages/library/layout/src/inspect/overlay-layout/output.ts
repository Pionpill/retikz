import type { InspectorContext } from '@retikz/inspect';

import type { OverlayLayoutArtifact } from '../../composites/overlay-layout';
import type { LayoutInspectionChild, LayoutInspectionMark } from '../shared';
import type { ResolvedOverlayLayoutInspectOptions } from './types';

import {
  inspectLayoutArtifactBase,
  inspectLayoutLine,
  inspectLayoutOutline,
  lowerLayoutInspectionMarks,
  normalizeLayoutBoundaryGroups,
} from '../shared';

/** 把 Overlay 布局产物转换为普通 Core 辅助子元素 */
export const inspectOverlayLayoutArtifact = (
  artifact: OverlayLayoutArtifact,
  context: InspectorContext<ResolvedOverlayLayoutInspectOptions>,
): ReadonlyArray<LayoutInspectionChild> => {
  const base = inspectLayoutArtifactBase(artifact.container, artifact.items, context.options, context.appearance);
  const structure: Array<LayoutInspectionMark> = [];
  const guides: Array<LayoutInspectionMark> = [];
  const labels: Array<LayoutInspectionMark> = [];
  artifact.items.forEach(item => {
    if (context.options.placements) {
      structure.push(inspectLayoutOutline('overlay.placement', item.slotBounds, context.appearance.scopeColor));
    }
    if (context.options.anchors && item.position !== undefined) {
      const { x, y } = item.position.target;
      guides.push(
        inspectLayoutLine('overlay.anchor', x - 5, y, x + 5, y, context.appearance.semanticColors.guide, false),
        inspectLayoutLine('overlay.anchor', x, y - 5, x, y + 5, context.appearance.semanticColors.guide, false),
      );
    }
    if (context.options.stacking) {
      labels.push({
        kind: 'label',
        role: 'overlay.stacking',
        x: item.slotBounds.x + 3,
        y: item.slotBounds.y + 12,
        text: `z:${item.zIndex}`,
        color: context.appearance.scopeColor,
      });
    }
  });
  const [boxes = [], normalizedStructure = [], underlay = []] = normalizeLayoutBoundaryGroups([
    base.boxes,
    structure,
    base.underlay,
  ]);
  return lowerLayoutInspectionMarks([
    ...underlay,
    ...normalizedStructure,
    ...boxes,
    ...base.warnings,
    ...base.guides,
    ...guides,
    ...base.labels,
    ...labels,
  ]);
};
