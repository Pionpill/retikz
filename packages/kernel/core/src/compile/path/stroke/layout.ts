import type { WithRequiredProperties } from '@retikz/foundation';

import type { StrokePathResolution } from '../../../resolve';
import { lowerStrokeBody } from './body';
import {
  calculateStrokeEndpointContact,
  createStrokeInterruptionIntervals,
  layoutStrokeLabels,
  layoutStrokeMarks,
  visitStrokeLabels,
} from './decoration';
import type { StrokeInterruptionProtectedRange } from './decoration';
import { createStrokePathGeometry, createStrokePositionModel, lowerStrokePathGeometry } from './geometry';
import type { PreparedStrokePathLayout, StrokePathCompileContext, StrokePathLayout } from './types';

/** 复用调用方提供的布局原子产物，补算完整标准描边布局 */
export const layoutStrokePath = (
  resolution: StrokePathResolution,
  context: StrokePathCompileContext,
  prepared?: PreparedStrokePathLayout,
): WithRequiredProperties<PreparedStrokePathLayout, 'overall'> => {
  if (prepared?.overall !== undefined) return { ...prepared, overall: prepared.overall };
  const geometry = prepared?.geometry !== undefined ? prepared.geometry : lowerStrokePathGeometry(resolution, context);
  if (geometry === null) return { ...prepared, geometry, overall: null };
  const { canon: path } = resolution;
  const needsMetrics =
    path.label?.some((_, index) => prepared?.labels?.host?.[index]?.placement === undefined) ||
    path.marks?.some((_, index) => prepared?.marks?.[index]?.placement === undefined) ||
    path.children?.some(
      (step, index) =>
        'label' in step && step.label !== undefined && prepared?.labels?.steps?.[index]?.placement === undefined,
    ) ||
    (prepared?.body === undefined &&
      (path.label?.some(label => label.interrupt) ||
        path.children?.some(step => 'label' in step && step.label?.interrupt)));
  const metrics =
    prepared?.metrics ?? (needsMetrics ? createStrokePathGeometry(geometry.commands, geometry.stepIndexes) : undefined);
  const positions =
    prepared?.positions ??
    (metrics === undefined ? undefined : createStrokePositionModel(geometry, metrics, prepared?.originalMetrics));
  const labels = layoutStrokeLabels(resolution, positions, context, prepared?.labels);
  const marks = layoutStrokeMarks(resolution, positions, context, prepared?.marks);
  let body = prepared?.body;
  if (body === undefined) {
    const contact = calculateStrokeEndpointContact(resolution, geometry.endpointSource);
    const protectedRanges: Array<StrokeInterruptionProtectedRange> = [];
    const first = metrics?.occurrences.find(occurrence => occurrence.command.kind !== 'close');
    const last = metrics?.occurrences.findLast(occurrence => occurrence.command.kind !== 'close');
    const strokeWidth = path.strokeWidth;
    if (path.arrow?.start !== undefined && first !== undefined)
      protectedRanges.push({
        subPathIndex: first.subPathIndex,
        start: first.logicalStart,
        end: Math.min(first.logicalEnd, first.logicalStart + contact.shrinkStart * strokeWidth + strokeWidth / 2),
      });
    if (path.arrow?.end !== undefined && last !== undefined)
      protectedRanges.push({
        subPathIndex: last.subPathIndex,
        start: Math.max(last.logicalStart, last.logicalEnd - contact.shrinkEnd * strokeWidth - strokeWidth / 2),
        end: last.logicalEnd,
      });
    const interruptions: Array<Parameters<typeof createStrokeInterruptionIntervals>[0][number]> = [];
    visitStrokeLabels(resolution, labels, (label, layout) => {
      const placement = layout?.placement;
      if (label.interrupt && placement?.logicalSample !== undefined)
        interruptions.push({
          sample: placement.logicalSample,
          visualBoundsPoints: placement.boundsPoints,
          gap: label.gap,
        });
    });
    body = lowerStrokeBody(
      geometry.commands,
      metrics,
      createStrokeInterruptionIntervals(interruptions, strokeWidth, protectedRanges),
      contact,
      strokeWidth,
      context.round,
    );
  }
  const overall: StrokePathLayout = { geometry, metrics, positions, labels, marks, body };
  return { geometry, metrics, positions, labels, marks, body, overall };
};
