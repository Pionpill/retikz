import { arcBoundingPoints, arcEndPoint, curve, ellipseArcBoundingPoints, ellipseArcPoint } from '@retikz/math';

import type { Transform } from '../../../contract';
import type { CanonicalStep, PathGeneratorResolution } from '../../../resolve/path';
import type { PathTargetView } from '../../../resolve/path';
import type { IRPosition, IRTarget } from '../../../schemas';
import type { PathCommandEmitter } from './commands';
import type { StrokeCursor } from './cursor';
import type { StrokeSamplingCollector } from './sampling';

import {
  arcSegmentSample,
  circleSegmentSample,
  cubicSegmentSample,
  ellipseArcSegmentSample,
  ellipseSegmentSample,
  lineSegmentSample,
  rectOutline,
  rectPerimeterSample,
} from '../../../shared/geometry';
import { CompileWarningCode } from '../../constants';
import { nodeIdFromResolvableTarget } from '../../position';
import { clipTarget, isAutoBoundaryTarget, pointOfTarget, samePoint } from '../host';
import { lowerGeneratorStepToCommands } from './lower';

/** 由几何形状或生成器产生路径命令的 shape step */
export type StrokeShapeStep = Extract<
  CanonicalStep,
  { kind: 'generator' | 'cycle' | 'rectangle' | 'arc' | 'circlePath' | 'ellipsePath' | 'smooth' }
>;

/** shape step 降级所需的共享上下文 */
export type LowerShapeStepContext = {
  /** resolving 阶段绑定的 target view */
  targetView: PathTargetView;
  /** 当前 scope 的累计变换链 */
  scopeChain: ReadonlyArray<Transform>;
  /** 坐标取整函数 */
  round: (value: number) => number;
  /** 当前 generator step 在 resolving 阶段绑定的 provider resolution */
  generatorResolution?: PathGeneratorResolution;
  /** path warning 回调 */
  warn: (code: string, message: string, subPath?: string) => void;
  /** path command 写入器 */
  commandEmitter: PathCommandEmitter;
  /** step 游标 */
  cursor: StrokeCursor;
  /** label 与 mark 采样收集器 */
  sampling: StrokeSamplingCollector;
};

/** 判断 step 是否属于 shape family */
export const isStrokeShapeStep = (step: CanonicalStep): step is StrokeShapeStep =>
  step.kind === 'generator' ||
  step.kind === 'cycle' ||
  step.kind === 'rectangle' ||
  step.kind === 'arc' ||
  step.kind === 'circlePath' ||
  step.kind === 'ellipsePath' ||
  step.kind === 'smooth';

/** 将 partial circle/ellipse 的 closed 选项规范化 */
const resolvePartialClosed = (
  closed: 'closed' | 'chord' | 'open' | 'sector' | undefined,
  index: number,
  warn: LowerShapeStepContext['warn'],
): 'chord' | 'open' | 'sector' => {
  if (closed === 'open') return 'open';
  if (closed === 'sector') return 'sector';
  if (closed === 'closed') {
    warn(
      CompileWarningCode.PartialArcClosedInvalid,
      "Partial circle/ellipse (with angles) cannot use closed:'closed'; falling back to 'chord'",
      `children[${index}]`,
    );
  }
  return 'chord';
};

/**
 * 将 shape family step 降级为 path commands
 * @returns `false` 表示 target clipping 或 provider 解析失败，调用方应跳过整个 path
 */
export const lowerShapeStep = (step: StrokeShapeStep, index: number, context: LowerShapeStepContext): boolean => {
  const { targetView, scopeChain, round, generatorResolution, warn, commandEmitter, cursor, sampling } = context;
  const { boundsPoints, emitMove, emitLine, emitClose, emitQuad, emitCubic, emitArc, emitEllipseArc, startSegment } =
    commandEmitter;

  if (step.kind === 'generator') {
    const previous = cursor.previous();
    const from: IRPosition = commandEmitter.getLastEnd() ?? (previous ? previous.anchor : [0, 0]);
    const resolvedTo = step.to !== undefined ? pointOfTarget(step.to, targetView, scopeChain) : null;
    const to = resolvedTo ?? undefined;
    const generated = lowerGeneratorStepToCommands({
      resolution:
        generatorResolution ??
        (() => {
          throw new Error(`Path generator '${step.name}' has no resolving-phase provider binding.`);
        })(),
      from,
      ...(to !== undefined ? { to } : {}),
      round,
      resolveTargetParam: value => pointOfTarget(value as IRTarget, targetView, scopeChain) ?? undefined,
    });

    startSegment(from);
    for (const command of generated) {
      switch (command.kind) {
        case 'move':
          startSegment(command.to);
          break;
        case 'line':
          emitLine(command.to);
          break;
        case 'quad':
          emitQuad(command.control, command.to);
          break;
        case 'cubic':
          emitCubic({ control1: command.control1, control2: command.control2, to: command.to });
          break;
        case 'arc':
          emitArc({
            center: command.center,
            radius: command.radius,
            startAngle: command.startAngle,
            endAngle: command.endAngle,
          });
          break;
        case 'ellipseArc':
          emitEllipseArc({
            center: command.center,
            radiusX: command.radiusX,
            radiusY: command.radiusY,
            startAngle: command.startAngle,
            endAngle: command.endAngle,
          });
          break;
        case 'close':
          emitClose();
          break;
      }
    }

    const end = commandEmitter.getLastEnd() ?? from;
    sampling.collect(step, t => lineSegmentSample(from, end, t));
    cursor.setPenOverride(commandEmitter.getLastEnd());
    return true;
  }

  if (step.kind === 'cycle') {
    const usedOverride = cursor.takePenOverride();
    const moveTo = cursor.lastMoveTarget();
    const previous = cursor.previous();
    if (!moveTo || (!previous && !usedOverride)) return true;
    const moveAnchor = pointOfTarget(moveTo, targetView, scopeChain);
    if (!moveAnchor) return false;

    const fromClip =
      usedOverride ?? (previous ? clipTarget(previous.step.to, moveAnchor, { targetView, scopeChain }) : null);
    const toClip = clipTarget(moveTo, fromClip ?? previous?.anchor ?? moveAnchor, {
      targetView,
      scopeChain,
    });
    if (!fromClip || !toClip) return false;

    sampling.addSampler(t => lineSegmentSample(fromClip, toClip, t));
    if (samePoint(fromClip, commandEmitter.getLastEnd()) && samePoint(toClip, commandEmitter.getSubPathStart())) {
      emitClose();
      return true;
    }
    startSegment(fromClip, usedOverride === null && previous !== null && isAutoBoundaryTarget(previous.step.to));
    emitLine(toClip, isAutoBoundaryTarget(moveTo));
    return true;
  }

  if (step.kind === 'rectangle') {
    const from = pointOfTarget(step.from, targetView, scopeChain);
    const to = pointOfTarget(step.to, targetView, scopeChain);
    if (!from || !to) {
      const fromId = nodeIdFromResolvableTarget(step.from);
      const toId = nodeIdFromResolvableTarget(step.to);
      if (!from && fromId !== undefined) {
        warn(
          CompileWarningCode.UnresolvedNodeReference,
          `Rectangle from references undefined node id '${fromId}'; the entire path is skipped`,
          `children[${index}].from`,
        );
      }
      if (!to && toId !== undefined) {
        warn(
          CompileWarningCode.UnresolvedNodeReference,
          `Rectangle to references undefined node id '${toId}'; the entire path is skipped`,
          `children[${index}].to`,
        );
      }
      return false;
    }

    let rectangleStart: IRPosition | null = null;
    for (const operation of rectOutline(from, to, step.cornerRadius)) {
      if (operation.kind === 'move') {
        emitMove(operation.to);
        rectangleStart = operation.to;
      } else if (operation.kind === 'line') {
        emitLine(operation.to);
      } else if (operation.kind === 'arc') {
        emitArc({
          center: operation.center,
          radius: operation.radius,
          startAngle: operation.startAngle,
          endAngle: operation.endAngle,
        });
      } else {
        emitClose();
      }
    }
    const minX = Math.min(from[0], to[0]);
    const maxX = Math.max(from[0], to[0]);
    const minY = Math.min(from[1], to[1]);
    const maxY = Math.max(from[1], to[1]);
    boundsPoints.push([minX, minY], [maxX, minY], [maxX, maxY], [minX, maxY]);
    sampling.addSampler(t => rectPerimeterSample(from, to, t));
    if (rectangleStart) cursor.setPenOverride(rectangleStart);
    return true;
  }

  const previous = cursor.previous();
  if (!previous) {
    warn(
      CompileWarningCode.PathTooShort,
      `Step '${step.kind}' requires a previous position; the entire path is skipped`,
      `children[${index}]`,
    );
    return false;
  }

  if (step.kind === 'arc') {
    let center: IRPosition;
    if (step.center !== undefined) {
      const resolved = pointOfTarget(step.center, targetView, scopeChain);
      if (!resolved) {
        const centerId = nodeIdFromResolvableTarget(step.center);
        if (centerId !== undefined) {
          warn(
            CompileWarningCode.UnresolvedNodeReference,
            `Arc step center references undefined node id '${centerId}'; the entire path is skipped`,
            `children[${index}].center`,
          );
        }
        return false;
      }
      center = resolved;
    } else {
      center = previous.anchor;
    }

    if (typeof step.radius === 'object') {
      const radiusX = step.radius.x;
      const radiusY = step.radius.y;
      startSegment(ellipseArcPoint({ center, radiusX, radiusY, angleDeg: step.startAngle }));
      emitEllipseArc({
        center,
        radiusX,
        radiusY,
        startAngle: step.startAngle,
        endAngle: step.endAngle,
      });
      boundsPoints.push(
        ...ellipseArcBoundingPoints({
          center,
          radiusX,
          radiusY,
          startAngleDeg: step.startAngle,
          endAngleDeg: step.endAngle,
        }),
      );
      sampling.collect(step, t => ellipseArcSegmentSample(center, radiusX, radiusY, step.startAngle, step.endAngle, t));
      cursor.setPenOverride(ellipseArcPoint({ center, radiusX, radiusY, angleDeg: step.endAngle }));
      return true;
    }

    if (typeof step.radius === 'number') {
      const radius = step.radius;
      startSegment(arcEndPoint(center, radius, step.startAngle));
      emitArc({ center, radius, startAngle: step.startAngle, endAngle: step.endAngle });
      boundsPoints.push(
        ...arcBoundingPoints({
          center,
          radius,
          startAngleDeg: step.startAngle,
          endAngleDeg: step.endAngle,
        }),
      );
      sampling.collect(step, t => arcSegmentSample(center, radius, step.startAngle, step.endAngle, t));
      cursor.setPenOverride(arcEndPoint(center, radius, step.endAngle));
      return true;
    }

    warn(
      CompileWarningCode.ArcMissingRadius,
      'Arc step requires radius; the entire path is skipped',
      `children[${index}]`,
    );
    return false;
  }

  if (step.kind === 'circlePath') {
    const center = previous.anchor;
    const radius = step.radius;
    if (step.startAngle !== undefined && step.endAngle !== undefined) {
      const startAngle = step.startAngle;
      const endAngle = step.endAngle;
      startSegment(ellipseArcPoint({ center, radiusX: radius, radiusY: radius, angleDeg: startAngle }));
      emitEllipseArc({ center, radiusX: radius, radiusY: radius, startAngle, endAngle });
      boundsPoints.push(
        ...ellipseArcBoundingPoints({
          center,
          radiusX: radius,
          radiusY: radius,
          startAngleDeg: startAngle,
          endAngleDeg: endAngle,
        }),
      );
      sampling.collect(step, t => ellipseArcSegmentSample(center, radius, radius, startAngle, endAngle, t));
      const closing = resolvePartialClosed(step.closed, index, warn);
      if (closing === 'chord') {
        emitClose();
        cursor.setPenOverride(ellipseArcPoint({ center, radiusX: radius, radiusY: radius, angleDeg: startAngle }));
      } else if (closing === 'sector') {
        emitLine(center);
        emitClose();
        cursor.setPenOverride(center);
      } else {
        cursor.setPenOverride(ellipseArcPoint({ center, radiusX: radius, radiusY: radius, angleDeg: endAngle }));
      }
      return true;
    }

    if (step.startAngle !== undefined || step.endAngle !== undefined) {
      warn(
        CompileWarningCode.PartialArcNeedsBothAngles,
        'circlePath needs both startAngle and endAngle for a partial circle; treated as a full circle',
        `children[${index}]`,
      );
    }
    startSegment([center[0] + radius, center[1]]);
    emitEllipseArc({ center, radiusX: radius, radiusY: radius, startAngle: 0, endAngle: 360 });
    boundsPoints.push(
      [center[0] + radius, center[1]],
      [center[0] - radius, center[1]],
      [center[0], center[1] + radius],
      [center[0], center[1] - radius],
    );
    sampling.collect(step, t => circleSegmentSample(center, radius, t));
    cursor.setPenOverride(center);
    return true;
  }

  if (step.kind === 'ellipsePath') {
    const center = previous.anchor;
    const radiusX = step.radius.x;
    const radiusY = step.radius.y;
    if (step.startAngle !== undefined && step.endAngle !== undefined) {
      const startAngle = step.startAngle;
      const endAngle = step.endAngle;
      startSegment(ellipseArcPoint({ center, radiusX, radiusY, angleDeg: startAngle }));
      emitEllipseArc({ center, radiusX, radiusY, startAngle, endAngle });
      boundsPoints.push(
        ...ellipseArcBoundingPoints({
          center,
          radiusX,
          radiusY,
          startAngleDeg: startAngle,
          endAngleDeg: endAngle,
        }),
      );
      sampling.collect(step, t => ellipseArcSegmentSample(center, radiusX, radiusY, startAngle, endAngle, t));
      const closing = resolvePartialClosed(step.closed, index, warn);
      if (closing === 'chord') {
        emitClose();
        cursor.setPenOverride(ellipseArcPoint({ center, radiusX, radiusY, angleDeg: startAngle }));
      } else if (closing === 'sector') {
        emitLine(center);
        emitClose();
        cursor.setPenOverride(center);
      } else {
        cursor.setPenOverride(ellipseArcPoint({ center, radiusX, radiusY, angleDeg: endAngle }));
      }
      return true;
    }

    if (step.startAngle !== undefined || step.endAngle !== undefined) {
      warn(
        CompileWarningCode.PartialArcNeedsBothAngles,
        'ellipsePath needs both startAngle and endAngle for a partial ellipse; treated as a full ellipse',
        `children[${index}]`,
      );
    }
    startSegment([center[0] + radiusX, center[1]]);
    emitEllipseArc({ center, radiusX, radiusY, startAngle: 0, endAngle: 360 });
    boundsPoints.push(
      [center[0] + radiusX, center[1]],
      [center[0] - radiusX, center[1]],
      [center[0], center[1] + radiusY],
      [center[0], center[1] - radiusY],
    );
    sampling.collect(step, t => ellipseSegmentSample(center, radiusX, radiusY, t));
    cursor.setPenOverride(center);
    return true;
  }

  const usedOverride = cursor.getPenOverride();
  const resolvedPoints: Array<IRPosition> = [];
  for (let pointIndex = 0; pointIndex < step.points.length; pointIndex++) {
    const point = step.points[pointIndex];
    const resolved = pointOfTarget(point, targetView, scopeChain);
    if (!resolved) {
      const pointId = nodeIdFromResolvableTarget(point);
      if (pointId !== undefined) {
        warn(
          CompileWarningCode.UnresolvedNodeReference,
          `Smooth step point references undefined node id '${pointId}'; the entire path is skipped`,
          `children[${index}].points[${pointIndex}]`,
        );
      }
      return false;
    }
    resolvedPoints.push(resolved);
  }

  const fromClip = usedOverride ?? clipTarget(previous.step.to, resolvedPoints[0], { targetView, scopeChain });
  if (!fromClip) return false;
  const segments = curve.catmullRomToCubic([fromClip, ...resolvedPoints], step.tension);
  startSegment(fromClip, usedOverride === null && isAutoBoundaryTarget(previous.step.to));
  for (const segment of segments) {
    emitCubic({ control1: segment.control1, control2: segment.control2, to: segment.to });
  }
  sampling.collect(step, t => {
    const segmentCount = segments.length;
    const scaled = t * segmentCount;
    const segmentIndex = Math.min(Math.floor(scaled), segmentCount - 1);
    const localT = t === 1 ? 1 : scaled - segmentIndex;
    const from = segmentIndex === 0 ? fromClip : segments[segmentIndex - 1].to;
    const segment = segments[segmentIndex];
    return cubicSegmentSample(from, segment.control1, segment.control2, segment.to, localT);
  });
  cursor.setPenOverride(commandEmitter.getLastEnd());
  return true;
};
