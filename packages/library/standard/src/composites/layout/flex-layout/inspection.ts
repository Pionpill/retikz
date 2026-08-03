import type { InspectionLinePrimitive, InspectionPrimitive } from '@retikz/core';

import type { ResolvedFlexLayoutInspectLocalOptions, StandardLayoutInspectContext } from '../shared';
import type { FlexLayoutArtifact } from './artifact-types';

import {
  inspectLayoutArtifactBase,
  inspectLayoutSpacing,
  inspectLayoutStructureRect,
  normalizeLayoutBoundaryGroups,
} from '../internal';

/** 把 FlexLayout typed artifact lowering 为受限 inspection primitives */
export const inspectFlexLayoutArtifact = (
  artifact: FlexLayoutArtifact,
  context: StandardLayoutInspectContext<ResolvedFlexLayoutInspectLocalOptions>,
): ReadonlyArray<InspectionPrimitive> => {
  const alignmentGuideDimension = artifact.lines[0]?.mainAxis === 'y' ? 'x' : 'y';
  const base = inspectLayoutArtifactBase(
    artifact.container,
    artifact.items,
    context.baseOptions,
    alignmentGuideDimension,
  );
  const structureLines: Array<InspectionLinePrimitive> = [];
  if (context.options.lines) {
    artifact.lines.forEach(line => {
      const horizontal = line.mainAxis === 'x';
      structureLines.push(
        ...inspectLayoutStructureRect('flex.line', {
          x: horizontal ? line.mainStart : line.crossStart,
          y: horizontal ? line.crossStart : line.mainStart,
          width: horizontal ? line.mainSize : line.crossSize,
          height: horizontal ? line.crossSize : line.mainSize,
        }),
      );
    });
  }
  const spacing = inspectLayoutSpacing('flex', artifact.spacing, context.options);
  const [boxes = [], structure = [], underlay = [], normalizedSpacing = []] = normalizeLayoutBoundaryGroups([
    base.boxes,
    structureLines,
    base.underlay,
    spacing,
  ]);
  return [...underlay, ...normalizedSpacing, ...structure, ...boxes, ...base.warnings, ...base.guides, ...base.labels];
};
