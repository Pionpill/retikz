import type { InspectionPrimitive } from '@retikz/core';

import type { ResolvedOverlayLayoutInspectLocalOptions, StandardLayoutInspectContext } from '../shared/layout';
import type { OverlayLayoutArtifact } from './artifact-types';

import { inspectLayoutArtifactBase, normalizeLayoutBoundaryGroups } from '../shared/layout/internal';

/** 把 OverlayLayout typed artifact lowering 为受限 inspection primitives */
export const inspectOverlayLayoutArtifact = (
  artifact: OverlayLayoutArtifact,
  context: StandardLayoutInspectContext<ResolvedOverlayLayoutInspectLocalOptions>,
): ReadonlyArray<InspectionPrimitive> => {
  const base = inspectLayoutArtifactBase(artifact.container, artifact.items, context.baseOptions);
  const structure: Array<InspectionPrimitive> = [];
  const guides: Array<InspectionPrimitive> = [];
  const labels: Array<InspectionPrimitive> = [];
  artifact.items.forEach(item => {
    if (context.options.placements) {
      structure.push({
        kind: 'rect',
        role: 'overlay.placement',
        ...item.slotBounds,
        presentation: 'outline',
        tone: 'scope',
        lineStyle: 'dashed',
      });
    }
    if (context.options.anchors && item.position !== undefined) {
      const { x, y } = item.position.target;
      guides.push({
        kind: 'line',
        role: 'overlay.anchor',
        x1: x - 5,
        y1: y,
        x2: x + 5,
        y2: y,
        tone: 'scope',
        lineStyle: 'solid',
      });
      guides.push({
        kind: 'line',
        role: 'overlay.anchor',
        x1: x,
        y1: y - 5,
        x2: x,
        y2: y + 5,
        tone: 'scope',
        lineStyle: 'solid',
      });
    }
    if (context.options.stacking) {
      labels.push({
        kind: 'label',
        role: 'overlay.stacking',
        x: item.slotBounds.x + 3,
        y: item.slotBounds.y + 12,
        text: `z:${item.zIndex}`,
        tone: 'scope',
      });
    }
  });
  const [boxes = [], normalizedStructure = [], underlay = []] = normalizeLayoutBoundaryGroups([
    base.boxes,
    structure,
    base.underlay,
  ]);
  return [
    ...underlay,
    ...normalizedStructure,
    ...boxes,
    ...base.warnings,
    ...base.guides,
    ...guides,
    ...base.labels,
    ...labels,
  ];
};
