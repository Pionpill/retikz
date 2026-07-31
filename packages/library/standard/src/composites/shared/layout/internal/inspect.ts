import type { InspectionPrimitive, ResolvedBaseLayoutInspectOptions } from '@retikz/core';

import type { LayoutArtifactContainer, LayoutArtifactItemBase, LayoutArtifactRect } from '../artifact-types';

const outline = (role: string, rect: LayoutArtifactRect, tone: 'neutral' | 'accent' | 'guide' | 'warning') => ({
  kind: 'rect' as const,
  role,
  ...rect,
  presentation: 'outline' as const,
  tone,
  lineStyle: 'dashed' as const,
});

/** 把三种 layout 共用 artifact 几何 lowering 为基础 inspection primitives */
export const inspectLayoutArtifactBase = (
  container: LayoutArtifactContainer,
  items: ReadonlyArray<LayoutArtifactItemBase>,
  options: ResolvedBaseLayoutInspectOptions,
  alignmentGuideDimension: 'x' | 'y' = 'y',
): Array<InspectionPrimitive> => {
  const primitives: Array<InspectionPrimitive> = [];
  if (options.bounds.container) primitives.push(outline('layout.container', container.allocationBounds, 'neutral'));
  if (options.bounds.content) primitives.push(outline('layout.content', container.contentBounds, 'accent'));
  items.forEach(item => {
    if (options.bounds.slot) primitives.push(outline('layout.slot', item.slotBounds, 'guide'));
    if (options.bounds.allocation) primitives.push(outline('layout.allocation', item.allocationBounds, 'accent'));
    if (options.bounds.visual) primitives.push(outline('layout.visual', item.visualBounds, 'neutral'));
    if (
      options.overflow &&
      (item.overflow.allocation.x ||
        item.overflow.allocation.y ||
        item.overflow.visual.x ||
        item.overflow.visual.y ||
        item.overflow.clipped)
    ) {
      primitives.push({
        kind: 'rect',
        role: 'layout.overflow',
        ...item.visualBounds,
        presentation: 'fill',
        tone: 'warning',
        opacity: 0.14,
      });
    }
    if (options.alignmentGuides && item.alignmentGuide !== undefined) {
      const vertical = alignmentGuideDimension === 'x';
      primitives.push({
        kind: 'line',
        role: 'layout.alignment-guide',
        x1: vertical ? item.alignmentGuide.position : item.slotBounds.x,
        y1: vertical ? item.slotBounds.y : item.alignmentGuide.position,
        x2: vertical ? item.alignmentGuide.position : item.slotBounds.x + item.slotBounds.width,
        y2: vertical ? item.slotBounds.y + item.slotBounds.height : item.alignmentGuide.position,
        tone: 'guide',
        lineStyle: item.alignmentGuide.fallback ? 'dotted' : 'dashed',
      });
    }
    if (options.labels) {
      primitives.push({
        kind: 'label',
        role: 'layout.label',
        x: item.slotBounds.x + 3,
        y: item.slotBounds.y + 12,
        text: item.key,
        tone: 'neutral',
      });
    }
  });
  return primitives;
};
