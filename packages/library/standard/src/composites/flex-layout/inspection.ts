import type { InspectionPrimitive } from '@retikz/core';

import type { ResolvedFlexLayoutInspectLocalOptions, StandardLayoutInspectContext } from '../shared/layout';
import type { FlexLayoutArtifact } from './artifact-types';

import { inspectLayoutArtifactBase } from '../shared/layout/internal';

/** 把 FlexLayout typed artifact lowering 为受限 inspection primitives */
export const inspectFlexLayoutArtifact = (
  artifact: FlexLayoutArtifact,
  context: StandardLayoutInspectContext<ResolvedFlexLayoutInspectLocalOptions>,
): ReadonlyArray<InspectionPrimitive> => {
  const alignmentGuideDimension = artifact.lines[0]?.mainAxis === 'y' ? 'x' : 'y';
  const primitives = inspectLayoutArtifactBase(
    artifact.container,
    artifact.items,
    context.baseOptions,
    alignmentGuideDimension,
  );
  if (context.options.lines) {
    artifact.lines.forEach(line => {
      const horizontal = line.mainAxis === 'x';
      primitives.push({
        kind: 'rect',
        role: 'flex.line',
        x: horizontal ? line.mainStart : line.crossStart,
        y: horizontal ? line.crossStart : line.mainStart,
        width: horizontal ? line.mainSize : line.crossSize,
        height: horizontal ? line.crossSize : line.mainSize,
        presentation: 'outline',
        tone: 'accent',
        lineStyle: 'dotted',
      });
    });
  }
  if (context.options.gaps) {
    const byLine = new Map<number, Array<(typeof artifact.items)[number]>>();
    artifact.items.forEach(item => byLine.set(item.line, [...(byLine.get(item.line) ?? []), item]));
    byLine.forEach((items, lineIndex) => {
      const line = artifact.lines[lineIndex];
      const horizontal = line.mainAxis === 'x';
      const ordered = [...items].sort((left, right) =>
        horizontal ? left.slotBounds.x - right.slotBounds.x : left.slotBounds.y - right.slotBounds.y,
      );
      ordered.slice(1).forEach((item, index) => {
        const previous = ordered[index];
        const start = horizontal
          ? previous.slotBounds.x + previous.slotBounds.width
          : previous.slotBounds.y + previous.slotBounds.height;
        const end = horizontal ? item.slotBounds.x : item.slotBounds.y;
        if (end <= start) return;
        primitives.push({
          kind: 'rect',
          role: 'flex.gap',
          x: horizontal ? start : line.crossStart,
          y: horizontal ? line.crossStart : start,
          width: horizontal ? end - start : line.crossSize,
          height: horizontal ? line.crossSize : end - start,
          presentation: 'fill',
          tone: 'guide',
          opacity: 0.1,
        });
      });
    });
  }
  return primitives;
};
