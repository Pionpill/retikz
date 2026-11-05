import type { PropertyPath } from '@retikz/foundation';

import type { ScenePrimitive } from '../../../contract';
import type { CanonicalStrokePath } from '../../../resolve';
import type { RegisterPaint } from '../../resource';
import { calculateBoundsOfPrimitives } from '../../scene';
import { fallbackMeasurer } from '../../text';
import { emitLabelPrimitive } from '../host';
import { emitPathEndpointArrows, emitPathMarks, pathEndpointArrows } from './decorations';
import { lowerStrokePathGeometry } from './geometry';
import type { StrokeInterruptionProtectedRange } from './interruption';
import {
  createStrokeInterruptionIntervals,
  createStrokePathGeometry,
  splitStrokePathAtInterruptions,
} from './interruption';
import { emitPathBaseProps, wrapPathPrimitiveOutput } from './output';
import { applyArrowShrinks } from './shrink';
import { emitInterruptedPathFragments, splitSubPathsForEndpointArrows } from './split';
import type { EmitPathPrimitiveContext } from './types';

/** 将标准描边几何编译为场景图元 */
export const emitPathPrimitive = (canon: CanonicalStrokePath, context: EmitPathPrimitiveContext) => {
  const { round, measureText = fallbackMeasurer, options: pathEmitOptions = {} } = context;
  const { properties: path, irPath, arrows: resolutionArrows, marks: resolutionMarks } = canon;
  const geometry = lowerStrokePathGeometry(canon, context);
  if (geometry === null) return null;
  const { commands, stepIndexes, boundsPoints, endpointSource, sampling, roundedCommands } = geometry;
  const { labelPrimitives: labelPrims, materializeStepLabels, sampleHostLabel } = sampling;
  const warn = (code: string, message: string, subPath: PropertyPath = []): void => {
    pathEmitOptions.onWarn?.({ code, message, path: [...irPath, ...subPath] });
  };
  const registerPaint: RegisterPaint =
    pathEmitOptions.registerPaint ?? (p => (typeof p === 'string' || p === undefined ? p : undefined));

  const baseProps = emitPathBaseProps(path, {
    registerPaint,
  });
  const strokeWidth = baseProps.strokeWidth;
  const logicalGeometry = createStrokePathGeometry(commands, stepIndexes);
  const stepLabels = materializeStepLabels(logicalGeometry);
  const hostLabels = (path.label ?? []).flatMap(label => {
    const labelSample = sampleHostLabel(logicalGeometry, label.position, roundedCommands);
    if (labelSample === undefined) return [];

    const result = emitLabelPrimitive(label, labelSample.visualSample, {
      measureText,
      round,
      hostOpacity: path.opacity,
      tex: {
        lowerTex: pathEmitOptions.lowerTex,
        warn: (code, message) => warn(code, message, ['label']),
      },
    });
    boundsPoints.push(...result.boundsPoints);

    return [
      { label, primitive: result.primitive, boundsPoints: result.boundsPoints, sample: labelSample.logicalSample },
    ];
  });

  const arrows = emitPathEndpointArrows(path.arrow, {
    registerPaint,
    arrowResolutions: resolutionArrows,
    round,
    irPath,
  });

  // shrink 在 compile 阶段计算，与 emit 落点无关；按视觉输入把首末段端点向内缩短
  // 让 line 端点接在 hollow arrow 尾部外缘，不贯穿 back outline；shrink=0 的实心 shape 跳过
  const shrinkStart = arrows.shrinkStart + (endpointSource.firstAutoBoundary ? arrows.boundaryOuterInsetStart : 0);
  const shrinkEnd = arrows.shrinkEnd + (endpointSource.lastAutoBoundary ? arrows.boundaryOuterInsetEnd : 0);
  const endpointProtectionLength = strokeWidth / 2;
  const endpointProtections: Array<StrokeInterruptionProtectedRange> = [];
  const firstDrawableOccurrence = logicalGeometry.occurrences.find(occurrence => occurrence.command.kind !== 'close');
  const lastDrawableOccurrence = logicalGeometry.occurrences.findLast(
    occurrence => occurrence.command.kind !== 'close',
  );
  if (arrows.arrowStart !== undefined && firstDrawableOccurrence !== undefined) {
    endpointProtections.push({
      subPathIndex: firstDrawableOccurrence.subPathIndex,
      start: firstDrawableOccurrence.logicalStart,
      end: Math.min(
        firstDrawableOccurrence.logicalEnd,
        firstDrawableOccurrence.logicalStart + shrinkStart * strokeWidth + endpointProtectionLength,
      ),
    });
  }

  if (arrows.arrowEnd !== undefined && lastDrawableOccurrence !== undefined) {
    endpointProtections.push({
      subPathIndex: lastDrawableOccurrence.subPathIndex,
      start: Math.max(
        lastDrawableOccurrence.logicalStart,
        lastDrawableOccurrence.logicalEnd - shrinkEnd * strokeWidth - endpointProtectionLength,
      ),
      end: lastDrawableOccurrence.logicalEnd,
    });
  }

  const interruptionIntervals = createStrokeInterruptionIntervals(
    [...stepLabels, ...hostLabels]
      .filter(label => label.label.interrupt)
      .map(label => ({ sample: label.sample, visualBoundsPoints: label.boundsPoints, gap: label.label.gap })),
    strokeWidth,
    endpointProtections,
  );

  const marks = emitPathMarks({
    geometry: logicalGeometry,
    placements: path.marks ?? [],
    markResolutions: resolutionMarks,
    irPath,
    registerPaint,
    baseProps,
    round,
  });
  boundsPoints.push(...marks.boundsPoints);
  const markBounds =
    marks.primitives.length === 0
      ? undefined
      : calculateBoundsOfPrimitives(marks.primitives, pathEmitOptions.resources?.() ?? []);
  if (markBounds !== undefined)
    boundsPoints.push(
      [markBounds.x, markBounds.y],
      [markBounds.x + markBounds.width, markBounds.y + markBounds.height],
    );

  let endpointSpecs = pathEndpointArrows(arrows);
  let primitive: ScenePrimitive;
  if (interruptionIntervals.length === 0) {
    endpointSpecs = applyArrowShrinks(commands, { ...endpointSpecs, shrinkStart, shrinkEnd, strokeWidth, round });
    primitive = splitSubPathsForEndpointArrows(commands, baseProps, endpointSpecs).primitive;
  } else {
    const fragments = splitStrokePathAtInterruptions(logicalGeometry, interruptionIntervals, round, {
      separateTerminalDrawable: endpointSpecs.arrowEnd !== undefined,
    });
    const startFragment = fragments.find(fragment => fragment.hasPathStart);
    const endFragment = fragments.find(fragment => fragment.hasPathEnd);
    if (startFragment !== undefined && startFragment === endFragment) {
      endpointSpecs = applyArrowShrinks(startFragment.commands, {
        ...endpointSpecs,
        shrinkStart,
        shrinkEnd,
        strokeWidth,
        round,
      });
    } else {
      if (startFragment !== undefined) {
        const adjusted = applyArrowShrinks(startFragment.commands, {
          arrowStart: endpointSpecs.arrowStart,
          shrinkStart,
          shrinkEnd: 0,
          strokeWidth,
          round,
        });
        endpointSpecs.arrowStart = adjusted.arrowStart;
      }

      if (endFragment !== undefined) {
        const adjusted = applyArrowShrinks(endFragment.commands, {
          arrowEnd: endpointSpecs.arrowEnd,
          shrinkStart: 0,
          shrinkEnd,
          strokeWidth,
          round,
        });
        endpointSpecs.arrowEnd = adjusted.arrowEnd;
      }
    }

    primitive = emitInterruptedPathFragments(fragments, baseProps, endpointSpecs);
  }

  const bodyPrims: Array<ScenePrimitive> = [
    primitive,
    ...marks.primitives,
    ...labelPrims,
    ...hostLabels.map(label => label.primitive),
  ];

  return wrapPathPrimitiveOutput({ path, primitive, bodyPrims, boundsPoints, round });
};
