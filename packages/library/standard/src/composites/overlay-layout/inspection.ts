import type { InspectionPrimitive } from '@retikz/core';

import type { ResolvedOverlayLayoutInspectLocalOptions, StandardLayoutInspectContext } from '../shared/layout';
import type { OverlayLayoutArtifact } from './artifact-types';

import { inspectLayoutArtifactBase } from '../shared/layout/internal';

/** 把 OverlayLayout typed artifact lowering 为受限 inspection primitives */
export const inspectOverlayLayoutArtifact = (
  artifact: OverlayLayoutArtifact,
  context: StandardLayoutInspectContext<ResolvedOverlayLayoutInspectLocalOptions>,
): ReadonlyArray<InspectionPrimitive> => {
  const primitives = inspectLayoutArtifactBase(artifact.container, artifact.items, context.baseOptions);
  artifact.items.forEach(item => {
    if (context.options.placements) {
      primitives.push({
        kind: 'rect',
        role: 'overlay.placement',
        ...item.slotBounds,
        presentation: 'outline',
        tone: 'accent',
        lineStyle: 'dotted',
      });
    }
    if (context.options.anchors && item.position !== undefined) {
      const { x, y } = item.position.target;
      primitives.push({
        kind: 'line',
        role: 'overlay.anchor',
        x1: x - 5,
        y1: y,
        x2: x + 5,
        y2: y,
        tone: 'guide',
        lineStyle: 'solid',
      });
      primitives.push({
        kind: 'line',
        role: 'overlay.anchor',
        x1: x,
        y1: y - 5,
        x2: x,
        y2: y + 5,
        tone: 'guide',
        lineStyle: 'solid',
      });
    }
    if (context.options.stacking) {
      primitives.push({
        kind: 'label',
        role: 'overlay.stacking',
        x: item.slotBounds.x + 3,
        y: item.slotBounds.y + 12,
        text: `z:${item.zIndex}`,
        tone: 'accent',
      });
    }
  });
  return primitives;
};
