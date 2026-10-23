import type {
  IRChild,
  IRCoordinate,
  IRNode,
  IRNodeLabel,
  IRNodeTarget,
  IRPath,
  IRStep,
  IRStepLabel,
  IRTarget,
} from '@retikz/core';
import { FoldStepVia } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';
import { resolveFieldPath } from '@retikz/data';

import type {
  AnchorOwner,
  MarkInstance,
  MarkInstanceInput,
  CoordinateFrame,
  FieldCollector,
  MarkChannels,
  MarkLoweringContext,
  PolarCoordinateFrame,
} from '../../../contract';
import { markProperty, markInstances, positionValue, positionField, mapPositionInput } from '../../../contract';
import { RetikzPlotError } from '../../../error';
import type {
  IRPlotPositionInput,
  IRPlotRelationEndpointGlyph,
  IRPlotRelationMark,
  IRPlotRelationPrimitiveStyle,
  IRPlotRelationRouteStep,
  IRPlotRelationRouting,
  IRPlotRelationStepLabel,
  IRPlotTargetRef,
} from '../../../schemas';
import {
  PolarInterpolation,
  RelationGeometryKind,
  RelationMarkSchema,
  RelationOrthogonalLabelStep,
  RelationRouteStepKind,
  RelationRoutingKind,
} from '../../../schemas';
import type { PolarVertex } from '../../coordinate';
import { densifyPolarSegments, isPolarCoordinateFrame } from '../../coordinate';
import type { MarkPaint } from '../shared';
import {
  applyPathChannelDeliveries,
  attachMarkLayer,
  channelDefaultOf,
  channelValueOf,
  collectAnchorIdFields,
  collectMarkLabelFields,
  collectPathChannelFields,
  decorateDatum,
  DEFAULT_FILL,
  pathChannelKinds,
  resolveGeometryMarkLabels,
} from '../shared';
import type { MarkDefinition } from '../types';
import { POINT_DEFAULT_RADIUS } from './point-glyph';
import { pointGlyphStyle } from './point-glyph';

/** 为锚点注册恢复当前真实实例，不存储重复的行身份 */
const relationInstance = (row: ExternalRow | undefined, transformedIndex: number | undefined): MarkInstance =>
  row === undefined ? { kind: 'single' } : { kind: 'row', row, transformedIndex: transformedIndex! };

type TargetResolution = {
  target: IRTarget;
  coordinates: Array<IRCoordinate>;
  position?: [number, number];
  polarVertex?: PolarVertex;
};

const targetOwner = (
  mark: IRPlotRelationMark,
  ctx: MarkLoweringContext,
  transformedIndex: number | undefined,
  role: string,
): AnchorOwner => ({
  markType: mark.type,
  markId: mark.id,
  markIndex: ctx.markIndex,
  ...(transformedIndex === undefined ? { kind: 'single' } : { kind: 'row', transformedIndex }),
  role,
});

const relationGeneratedCoordinateId = (
  mark: IRPlotRelationMark,
  ctx: MarkLoweringContext,
  transformedIndex: number | undefined,
  role: string,
): string => {
  const base = `${mark.id ?? `relation.${ctx.markIndex}`}.${transformedIndex ?? 'single'}.${role}`;
  return ctx.plotId === undefined ? base : `${ctx.plotId}.${base}`;
};

const targetExtras = (ref?: IRPlotTargetRef): Omit<IRNodeTarget, 'id'> => {
  if (ref === undefined) return {};
  const boundary = ref.boundary === true ? 'shape' : ref.boundary === false ? undefined : ref.boundary;
  return {
    ...(ref.anchor !== undefined ? { anchor: ref.anchor } : {}),
    ...(ref.offset !== undefined ? { offset: ref.offset } : {}),
    ...(boundary !== undefined ? { boundary } : {}),
  };
};

const shiftedPoint = (position: [number, number], offset: [number, number] | undefined): [number, number] =>
  offset === undefined ? position : [position[0] + offset[0], position[1] + offset[1]];

type TargetEncoding = NonNullable<IRPlotRelationMark['encodings']>['source'];

const targetEncodingOf = (mark: IRPlotRelationMark, role: string): TargetEncoding => {
  if (role === 'source' || role === 'target') return mark.encodings?.[role];
  const [group, index] = role.split('.');
  return group === 'via'
    ? mark.encodings?.geometry?.via?.[Number(index)]
    : mark.encodings?.geometry?.route?.[Number(index)]?.to;
};

const resolveProjectedTarget = (
  mark: IRPlotRelationMark,
  ref: IRPlotTargetRef | undefined,
  row: ExternalRow | undefined,
  frame: CoordinateFrame,
  ctx: MarkLoweringContext | undefined,
  transformedIndex: number | undefined,
  role: string,
  forceCoordinate: boolean,
): TargetResolution | null => {
  const encoding = targetEncodingOf(mark, role);
  const positions: Partial<Record<string, IRPlotPositionInput>> = {
    ...encoding?.position,
  };
  const mapped = frame.roles.map(frameRole => {
    const scale = frame.roleScales?.[frameRole];
    return scale === undefined ? NaN : mapPositionInput(positions[frameRole], scale, row);
  });
  if (!mapped.every(Number.isFinite)) return null;
  const position = frame.projectMappedRoles?.(mapped) ?? null;
  if (position === null) return null;

  const polarVertex = isPolarCoordinateFrame(frame) ? { theta: mapped[0], radius: mapped[1] } : null;
  const polarTarget = polarVertex === null ? {} : { polarVertex };
  if ((ref !== undefined && 'anchorId' in ref && ref.anchorId !== undefined) || encoding?.anchorId !== undefined) {
    if (ctx?.anchors === undefined) {
      return { target: shiftedPoint(position, ref?.offset), coordinates: [], ...polarTarget };
    }

    const owner = targetOwner(mark, ctx, transformedIndex, role);
    const id = ctx.anchors.makeId(
      ref !== undefined && 'anchorId' in ref ? (ref.anchorId ?? {}) : {},
      relationInstance(row, transformedIndex),
      owner,
      targetEncodingOf(mark, role)?.anchorId,
    );

    return {
      target: { id, ...targetExtras(ref) },
      coordinates: [ctx.anchors.coordinate(id, position, owner)],
      position,
      ...polarTarget,
    };
  }

  if (forceCoordinate && ctx?.anchors !== undefined) {
    const owner = targetOwner(mark, ctx, transformedIndex, role);
    const id = relationGeneratedCoordinateId(mark, ctx, transformedIndex, role);

    return {
      target: { id, ...targetExtras(ref) },
      coordinates: [ctx.anchors.coordinate(id, position, owner)],
      position,
      ...polarTarget,
    };
  }

  if (ref?.anchor !== undefined || ref?.boundary !== undefined) {
    throw new RetikzPlotError(
      `lowerPlots: relation projected ${role} target requires anchorId when anchor or boundary is set`,
    );
  }

  const shifted = shiftedPoint(position, ref?.offset);

  return { target: shifted, coordinates: [], position: shifted, ...polarTarget };
};

const resolveTarget = (
  mark: IRPlotRelationMark,
  ref: IRPlotTargetRef | undefined,
  row: ExternalRow | undefined,
  frame: CoordinateFrame,
  ctx: MarkLoweringContext | undefined,
  transformedIndex: number | undefined,
  role: string,
  forceCoordinate = false,
): TargetResolution | null => {
  if (targetEncodingOf(mark, role)?.position !== undefined)
    return resolveProjectedTarget(mark, ref, row, frame, ctx, transformedIndex, role, forceCoordinate);
  if (ctx?.anchors === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: relation ${role} target uses generated anchorId but no AnchorRegistry is available`,
    );
  }

  const owner = targetOwner(mark, ctx, transformedIndex, role);
  const id = ctx.anchors.makeId(
    ref !== undefined && 'anchorId' in ref ? (ref.anchorId ?? {}) : {},
    relationInstance(row, transformedIndex),
    owner,
    targetEncodingOf(mark, role)?.anchorId,
  );
  ctx.anchors.reference(id, owner);

  return { target: { id, ...targetExtras(ref) }, coordinates: [] };
};

const anchorInputMissing = (
  ref: IRPlotTargetRef | undefined,
  row: ExternalRow | undefined,
  encoding?: TargetEncoding,
): boolean => {
  const anchorId = ref !== undefined && 'anchorId' in ref ? ref.anchorId : undefined;
  if (row === undefined) return false;
  if (encoding?.anchorId !== undefined) return resolveFieldPath(row, encoding.anchorId) === undefined;
  if (anchorId === undefined) return false;
  if (anchorId.template !== undefined) {
    for (const match of anchorId.template.matchAll(/\{field:([^}]+)\}/g)) {
      if (resolveFieldPath(row, match[1]) === undefined) return true;
    }
  }

  return false;
};

const withDefaultLabelSide = (label: IRStepLabel): IRStepLabel => {
  const side = label.side;
  return { sloped: true, ...label, ...(side !== undefined ? { side } : {}) };
};

type MarkStyleValue =
  | NonNullable<IRPlotRelationPrimitiveStyle[Exclude<keyof IRPlotRelationPrimitiveStyle, 'opacity'>]>
  | NonNullable<IRPlotRelationEndpointGlyph[Exclude<keyof IRPlotRelationEndpointGlyph, 'opacity'>]>;

const resolveMarkValue = <T>(value: MarkStyleValue | undefined, _row: ExternalRow | undefined): T | undefined => {
  if (value === undefined) return undefined;
  return value as T;
};

const endpointGlyphNode = (
  glyph: IRPlotRelationEndpointGlyph,
  position: [number, number],
  row: ExternalRow | undefined,
  transformedIndex: number | undefined,
  mark: IRPlotRelationMark,
  sharedColor: string | undefined,
  ctx: MarkLoweringContext | undefined,
): IRNode => {
  const color = resolveMarkValue<string>(glyph.color, row);
  const fill = resolveMarkValue<MarkPaint>(glyph.fill, row);
  const node: IRNode = {
    type: 'node',
    position,
    ...pointGlyphStyle(color ?? fill ?? sharedColor ?? DEFAULT_FILL, glyph),
  };
  const shape = resolveMarkValue<IRNode['shape']>(glyph.shape, row);
  const size = resolveMarkValue<number>(glyph.size, row);
  if (shape !== undefined) node.shape = shape;

  // 与 Point size channel 一致：公开 size 是半径，Core circle 的 minimumSize 使用外接方尺寸
  if (size !== undefined) node.layout = { ...node.layout, minimumSize: size * Math.SQRT2 };
  const provenance =
    ctx?.provenance === undefined
      ? undefined
      : { context: ctx.provenance.context, markIndex: ctx.provenance.markIndex };

  return row === undefined || transformedIndex === undefined
    ? node
    : decorateDatum(node, row, transformedIndex, mark.type, provenance, undefined);
};

const relationPrimitiveStyle = (row: ExternalRow | undefined, channels: MarkChannels): NonNullable<IRPath['style']> => {
  const color =
    (row === undefined ? undefined : channelValueOf<string>(channels, 'color')?.(row)) ??
    channelDefaultOf<string>(channels, 'color');
  const fill =
    (row === undefined ? undefined : channelValueOf<MarkPaint>(channels, 'fill')?.(row)) ??
    channelDefaultOf<MarkPaint>(channels, 'fill');
  const stroke =
    (row === undefined ? undefined : channelValueOf<MarkPaint>(channels, 'stroke')?.(row)) ??
    channelDefaultOf<MarkPaint>(channels, 'stroke');
  return {
    ...(color === undefined ? {} : { color }),
    ...(fill === undefined ? {} : { fill }),
    ...(stroke === undefined ? {} : { stroke }),
  };
};

const resolveLabel = (
  label: IRPlotRelationStepLabel | undefined,
  row: ExternalRow | undefined,
  field?: string,
): IRStepLabel | undefined => {
  if (label === undefined && field === undefined) return undefined;

  const value = field === undefined ? label?.text : resolveFieldPath(row!, field);
  if (value === undefined) return undefined;
  return withDefaultLabelSide({ ...label, text: field === undefined ? (value as IRStepLabel['text']) : String(value) });
};

const applyStepLabel = (steps: Array<IRStep>, label: IRStepLabel | undefined): Array<IRStep> => {
  if (label === undefined || steps.some(step => 'label' in step && step.label !== undefined)) return steps;

  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step.kind !== RelationRouteStepKind.Move && step.kind !== 'cycle') {
      const next = [...steps];
      next[index] = { ...step, label } as IRStep;
      return next;
    }
  }

  return steps;
};

const defaultRoute = (
  source: IRTarget,
  via: Array<IRTarget>,
  target: IRTarget,
  label: IRStepLabel | undefined,
): Array<IRStep> =>
  applyStepLabel(
    [
      { type: 'step', kind: RelationRouteStepKind.Move, to: source },
      ...via.map((to): IRStep => ({ type: 'step', kind: RelationRouteStepKind.Line, to })),
      { type: 'step', kind: RelationRouteStepKind.Line, to: target },
    ],
    label,
  );

/**
 * 计算 Relation path 在当前坐标帧下可消费的 Polar 插值
 * @description 仅默认 path 且 source、target、全部 via 都由 coordinate projection 提供时继承；显式覆盖落到排除形态时 fail-loud
 */
const relationInterpolationOf = (mark: IRPlotRelationMark, frame: CoordinateFrame): PolarInterpolation | undefined => {
  const interpolation = (mark.properties.geometry.kind === 'path' ? mark.properties.geometry : undefined)
    ?.interpolation;
  const kind = mark.properties.geometry.kind;
  if (interpolation !== undefined && !isPolarCoordinateFrame(frame)) {
    throw new RetikzPlotError('lowerPlots: relation interpolation override is only supported under polar2D');
  }

  if (interpolation !== undefined && kind === RelationGeometryKind.Ribbon) {
    throw new RetikzPlotError('lowerPlots: relation interpolation override is not supported for ribbon geometry');
  }

  if (
    interpolation !== undefined &&
    mark.properties.geometry.kind === 'path' &&
    mark.properties.geometry.route !== undefined
  ) {
    throw new RetikzPlotError('lowerPlots: relation interpolation override cannot be combined with an explicit route');
  }

  if (
    interpolation !== undefined &&
    mark.properties.geometry.kind === 'path' &&
    mark.properties.geometry.routing !== undefined
  ) {
    throw new RetikzPlotError('lowerPlots: relation interpolation override cannot be combined with routing');
  }

  const projectedRefs = [
    mark.properties.source,
    ...((mark.properties.geometry.kind === 'path' ? mark.properties.geometry : undefined)?.via ?? []),
    mark.properties.target,
  ];
  const hasOnlyProjectedRefs = projectedRefs.every(
    (ref, index) =>
      (ref !== undefined && 'position' in ref) ||
      targetEncodingOf(
        mark,
        index === 0 ? 'source' : index === projectedRefs.length - 1 ? 'target' : `via.${index - 1}`,
      )?.position !== undefined,
  );
  if (interpolation !== undefined && !hasOnlyProjectedRefs) {
    throw new RetikzPlotError(
      'lowerPlots: relation interpolation override requires projected source, target, and via refs',
    );
  }

  if (
    !isPolarCoordinateFrame(frame) ||
    kind !== RelationGeometryKind.Path ||
    mark.properties.geometry.route !== undefined ||
    mark.properties.geometry.routing !== undefined ||
    !hasOnlyProjectedRefs
  ) {
    return undefined;
  }

  return interpolation ?? frame.interpolation;
};

/**
 * 按 Polar 输出空间采样默认 Relation path，并用过点曲线连接采样点
 * @description 中间采样点使用屏幕坐标，source、via 与 target 的 identity、offset 和 boundary 继续由 Core target 消费
 */
const interpolatedPolarRoute = (
  frame: PolarCoordinateFrame,
  targetResolutions: Array<TargetResolution>,
  label: IRStepLabel | undefined,
): Array<IRStep> => {
  const steps: Array<IRStep> = [{ type: 'step', kind: RelationRouteStepKind.Move, to: targetResolutions[0].target }];

  for (let index = 1; index < targetResolutions.length; index += 1) {
    const sourceResolution = targetResolutions[index - 1];
    const targetResolution = targetResolutions[index];
    const sourceVertex = sourceResolution.polarVertex;
    const targetVertex = targetResolution.polarVertex;
    if (sourceVertex === undefined || targetVertex === undefined) {
      throw new RetikzPlotError(
        'lowerPlots: relation interpolation requires projected source, target, and via positions',
      );
    }

    const sampledPoints = densifyPolarSegments(frame, [sourceVertex, targetVertex]);
    steps.push({
      type: 'step',
      kind: 'smooth',
      points: [...sampledPoints.slice(1, -1), targetResolution.target],
    });
  }

  return applyStepLabel(steps, label);
};

const routeTargets = (source: IRTarget, via: Array<IRTarget>, target: IRTarget): Array<IRTarget> => [
  source,
  ...via,
  target,
];

const lineRoute = (targets: Array<IRTarget>): Array<IRStep> => [
  { type: 'step', kind: RelationRouteStepKind.Move, to: targets[0] },
  ...targets.slice(1).map((to): IRStep => ({ type: 'step', kind: RelationRouteStepKind.Line, to })),
];

const horizontalRibbonSteps = (source: IRTarget, target: IRTarget): Array<IRStep> => {
  const sourcePosition = positionOf(source);
  const targetPosition = positionOf(target);
  if (sourcePosition === undefined || targetPosition === undefined || sourcePosition[0] === targetPosition[0]) {
    return [
      { type: 'step', kind: RelationRouteStepKind.Move, to: source },
      { type: 'step', kind: RelationRouteStepKind.Line, to: target },
    ];
  }

  const dx = targetPosition[0] - sourcePosition[0];
  const handle = Math.abs(dx) / 2;
  const sign = dx >= 0 ? 1 : -1;

  return [
    { type: 'step', kind: RelationRouteStepKind.Move, to: source },
    {
      type: 'step',
      kind: RelationRouteStepKind.Cubic,
      control1: [sourcePosition[0] + sign * handle, sourcePosition[1]],
      control2: [targetPosition[0] - sign * handle, targetPosition[1]],
      to: target,
    },
  ];
};

const bendRoute = (
  routing: Extract<IRPlotRelationRouting, { kind: typeof RelationRoutingKind.Bend }>,
  targets: Array<IRTarget>,
): Array<IRStep> => [
  { type: 'step', kind: RelationRouteStepKind.Move, to: targets[0] },
  ...targets.slice(1).map((to): IRStep => ({
    type: 'step',
    kind: RelationRouteStepKind.Bend,
    to,
    ...(routing.bendDirection !== undefined ? { bendDirection: routing.bendDirection } : {}),
    ...(routing.bendAngle !== undefined ? { bendAngle: routing.bendAngle } : {}),
    ...(routing.outAngle !== undefined ? { outAngle: routing.outAngle } : {}),
    ...(routing.inAngle !== undefined ? { inAngle: routing.inAngle } : {}),
    ...(routing.looseness !== undefined ? { looseness: routing.looseness } : {}),
  })),
];

const positionOf = (target: IRTarget): [number, number] | undefined =>
  Array.isArray(target) && typeof target[0] === 'number' && typeof target[1] === 'number' ? target : undefined;

const segmentLength = (from: [number, number], to: [number, number]): number =>
  Math.hypot(to[0] - from[0], to[1] - from[1]);

const applyOrthogonalLabel = (
  steps: Array<IRStep>,
  label: IRStepLabel | undefined,
  candidates: Array<{ stepIndex: number; length: number }>,
  labelStep: RelationOrthogonalLabelStep | undefined,
): Array<IRStep> => {
  if (label === undefined || steps.some(step => 'label' in step && step.label !== undefined)) return steps;
  if (labelStep === RelationOrthogonalLabelStep.Last || candidates.length === 0) return applyStepLabel(steps, label);

  const selected = candidates.reduce((best, current) => (current.length > best.length ? current : best), candidates[0]);
  const next = [...steps];
  const step = next[selected.stepIndex];
  if (step.kind !== RelationRouteStepKind.Move && step.kind !== 'cycle') {
    next[selected.stepIndex] = { ...step, label } as IRStep;
  }

  return next;
};

const orthogonalRoute = (
  routing: Extract<IRPlotRelationRouting, { kind: typeof RelationRoutingKind.Orthogonal }>,
  targets: Array<IRTarget>,
  label: IRStepLabel | undefined,
): Array<IRStep> => {
  const via = routing.via;
  if (via === undefined) throw new RetikzPlotError('lowerPlots: orthogonal relation routing requires via');

  const steps: Array<IRStep> = [{ type: 'step', kind: RelationRouteStepKind.Move, to: targets[0] }];
  const candidates: Array<{ stepIndex: number; length: number }> = [];
  let cursor = targets[0];

  for (const target of targets.slice(1)) {
    const fromPosition = positionOf(cursor);
    const toPosition = positionOf(target);
    if (fromPosition === undefined || toPosition === undefined) {
      steps.push({ type: 'step', kind: RelationRouteStepKind.Fold, via, to: target });
      cursor = target;
      continue;
    }

    const corner: [number, number] =
      via === FoldStepVia.HorizontalThenVertical ? [toPosition[0], fromPosition[1]] : [fromPosition[0], toPosition[1]];
    const firstIndex = steps.length;
    steps.push({ type: 'step', kind: RelationRouteStepKind.Line, to: corner });
    steps.push({ type: 'step', kind: RelationRouteStepKind.Line, to: target });
    candidates.push({ stepIndex: firstIndex, length: segmentLength(fromPosition, corner) });
    candidates.push({ stepIndex: firstIndex + 1, length: segmentLength(corner, toPosition) });
    cursor = target;
  }

  return applyOrthogonalLabel(steps, label, candidates, routing.labelStep);
};

const routedSteps = (
  routing: IRPlotRelationRouting | undefined,
  source: IRTarget,
  via: Array<IRTarget>,
  target: IRTarget,
  label: IRStepLabel | undefined,
): Array<IRStep> => {
  const targets = routeTargets(source, via, target);
  if (routing === undefined || routing.kind === RelationRoutingKind.Line)
    return applyStepLabel(lineRoute(targets), label);
  if (routing.kind === RelationRoutingKind.Bend) return applyStepLabel(bendRoute(routing, targets), label);

  return orthogonalRoute(routing, targets, label);
};

const routeStepToIr = (
  step: IRPlotRelationRouteStep,
  target: IRTarget,
  row: ExternalRow | undefined,
  field?: string,
): IRStep => {
  const label = resolveLabel(step.label, row, field);

  switch (step.kind) {
    case RelationRouteStepKind.Move:
      return { type: 'step', kind: RelationRouteStepKind.Move, to: target };
    case RelationRouteStepKind.Line:
      return { type: 'step', kind: RelationRouteStepKind.Line, to: target, ...(label !== undefined ? { label } : {}) };
    case RelationRouteStepKind.Fold:
      if (step.via === undefined) throw new RetikzPlotError('lowerPlots: relation route fold step requires via');

      return {
        type: 'step',
        kind: RelationRouteStepKind.Fold,
        via: step.via,
        to: target,
        ...(label !== undefined ? { label } : {}),
      };
    case RelationRouteStepKind.Curve:
      if (step.control === undefined)
        throw new RetikzPlotError('lowerPlots: relation route curve step requires control');

      return {
        type: 'step',
        kind: RelationRouteStepKind.Curve,
        control: step.control,
        to: target,
        ...(label !== undefined ? { label } : {}),
      };
    case RelationRouteStepKind.Cubic:
      if (step.control1 === undefined || step.control2 === undefined)
        throw new RetikzPlotError('lowerPlots: relation route cubic step requires control1 and control2');

      return {
        type: 'step',
        kind: RelationRouteStepKind.Cubic,
        control1: step.control1,
        control2: step.control2,
        to: target,
        ...(label !== undefined ? { label } : {}),
      };
    case RelationRouteStepKind.Bend:
      return {
        type: 'step',
        kind: RelationRouteStepKind.Bend,
        to: target,
        ...(step.bendDirection !== undefined ? { bendDirection: step.bendDirection } : {}),
        ...(step.bendAngle !== undefined ? { bendAngle: step.bendAngle } : {}),
        ...(step.outAngle !== undefined ? { outAngle: step.outAngle } : {}),
        ...(step.inAngle !== undefined ? { inAngle: step.inAngle } : {}),
        ...(step.looseness !== undefined ? { looseness: step.looseness } : {}),
        ...(label !== undefined ? { label } : {}),
      };
  }
};

const explicitRoute = (
  mark: IRPlotRelationMark,
  row: ExternalRow | undefined,
  frame: CoordinateFrame,
  ctx: MarkLoweringContext | undefined,
  transformedIndex: number | undefined,
  source: IRTarget,
  target: IRTarget,
): { steps: Array<IRStep>; coordinates: Array<IRCoordinate> } => {
  const route = (mark.properties.geometry.kind === 'path' ? mark.properties.geometry : undefined)?.route ?? [];
  const coordinates: Array<IRCoordinate> = [];
  const steps: Array<IRStep> = [{ type: 'step', kind: RelationRouteStepKind.Move, to: source }];

  for (let index = 0; index < route.length; index += 1) {
    const step = route[index];
    const stepTargetRef = step.to;
    const encodedTarget = mark.encodings?.geometry?.route?.[index]?.to;
    if (stepTargetRef === undefined && encodedTarget === undefined && index !== route.length - 1) {
      throw new RetikzPlotError(
        `lowerPlots: relation route step ${index} requires to; only the last explicit route step may omit to and default to target`,
      );
    }

    const resolved =
      stepTargetRef === undefined && encodedTarget === undefined
        ? { target, coordinates: [] }
        : resolveTarget(mark, stepTargetRef, row, frame, ctx, transformedIndex, `route.${index}`, true);
    if (resolved === null) return { steps: [], coordinates: [] };

    coordinates.push(...resolved.coordinates);
    steps.push(routeStepToIr(step, resolved.target, row, mark.encodings?.geometry?.route?.[index]?.label?.text));
  }

  return {
    steps: applyStepLabel(
      steps,
      resolveLabel(
        (mark.properties.geometry.kind === 'path' ? mark.properties.geometry : undefined)?.label,
        row,
        mark.encodings?.geometry?.label?.text,
      ),
    ),
    coordinates,
  };
};

/** 把 relation mark 下沉为 path 或 ribbon core IR */
export const lowerRelation = (
  mark: IRPlotRelationMark,
  input: MarkInstanceInput,
  frame: CoordinateFrame,
  channels: MarkChannels,
  ctx: MarkLoweringContext | undefined,
): IRChild | null => {
  const relationInterpolation = relationInterpolationOf(mark, frame);
  const colorOf = channelValueOf<string>(channels, 'color');
  const defaultColor = channelDefaultOf<string>(channels, 'color');
  const labelOf = channelValueOf<IRNodeLabel['text']>(channels, 'label');
  const children: Array<IRChild> = [];
  const endpointChildren: Array<IRNode> = [];

  for (const instance of markInstances(input)) {
    const row = instance.kind === 'row' ? instance.row : undefined;
    const transformedIndex = instance.kind === 'row' ? instance.transformedIndex : undefined;
    if (
      anchorInputMissing(mark.properties.source, row, mark.encodings?.source) ||
      anchorInputMissing(mark.properties.target, row, mark.encodings?.target)
    )
      continue;

    const source = resolveTarget(mark, mark.properties.source, row, frame, ctx, transformedIndex, 'source');
    const target = resolveTarget(mark, mark.properties.target, row, frame, ctx, transformedIndex, 'target');
    if (source === null || target === null) continue;

    const coordinates: Array<IRCoordinate> = [...source.coordinates, ...target.coordinates];
    const style = relationPrimitiveStyle(row, channels);
    const zIndex = markProperty<number>(mark, 'zIndex');
    if (mark.properties.geometry.kind === RelationGeometryKind.Ribbon) {
      const width =
        row === undefined ? mark.properties.geometry.width : channelValueOf<number>(channels, 'geometry.width')?.(row);
      if (width === undefined) continue;
      const endWidth =
        row === undefined
          ? mark.properties.geometry.endWidth
          : channelValueOf<number>(channels, 'geometry.endWidth')?.(row);
      const { interpolation, ...ribbonOptions } = mark.properties.geometry.options ?? {};
      const label = resolveGeometryMarkLabels(mark.properties.label, row, labelOf, mark.encodings?.label, channels);
      const ribbon: IRPath = applyPathChannelDeliveries(
        {
          type: 'path',
          kind: 'ribbon',
          style,
          ...(zIndex !== undefined ? { zIndex } : {}),
          ...(label !== undefined ? { label } : {}),
          kindOptions: {
            ...ribbonOptions,
            width:
              endWidth === undefined
                ? { kind: 'fixed', value: width }
                : {
                    kind: 'taper',
                    start: width,
                    end: endWidth,
                    ...(interpolation === undefined ? {} : { interpolation }),
                  },
          },
          children: horizontalRibbonSteps(source.target, target.target),
        },
        mark,
        row,
        channels,
      );
      children.push(...coordinates, ribbon);
      continue;
    }

    let steps: Array<IRStep>;
    if (mark.properties.geometry.route !== undefined) {
      const routed = explicitRoute(mark, row, frame, ctx, transformedIndex, source.target, target.target);
      if (routed.steps.length === 0) continue;

      coordinates.push(...routed.coordinates);
      steps = routed.steps;
    } else {
      const viaResolutions: Array<TargetResolution> = [];

      for (
        let index = 0;
        index < Math.max(mark.properties.geometry.via?.length ?? 0, mark.encodings?.geometry?.via?.length ?? 0);
        index += 1
      ) {
        const via = resolveTarget(
          mark,
          mark.properties.geometry.via?.[index],
          row,
          frame,
          ctx,
          transformedIndex,
          `via.${index}`,
          true,
        );
        if (via === null) continue;

        coordinates.push(...via.coordinates);
        viaResolutions.push(via);
      }

      const viaTargets = viaResolutions.map(resolution => resolution.target);
      const pathLabel = resolveLabel(mark.properties.geometry.label, row, mark.encodings?.geometry?.label?.text);
      steps =
        relationInterpolation === PolarInterpolation.Polar && isPolarCoordinateFrame(frame)
          ? interpolatedPolarRoute(frame, [source, ...viaResolutions, target], pathLabel)
          : mark.properties.geometry.routing === undefined
            ? defaultRoute(source.target, viaTargets, target.target, pathLabel)
            : routedSteps(mark.properties.geometry.routing, source.target, viaTargets, target.target, pathLabel);
    }

    const pathOptions = (mark.properties.geometry.options ?? {}) as Partial<IRPath>;
    const label = resolveGeometryMarkLabels(mark.properties.label, row, labelOf, mark.encodings?.label, channels);
    const path: IRPath = applyPathChannelDeliveries(
      {
        type: 'path',
        ...pathOptions,
        style: { ...pathOptions.style, ...style },
        ...(zIndex !== undefined ? { zIndex } : {}),
        ...(label !== undefined ? { label } : {}),
        children: steps,
      },
      mark,
      row,
      channels,
    );
    children.push(...coordinates, path);
    const sharedColor = (row === undefined ? undefined : colorOf?.(row)) ?? defaultColor;
    if (mark.properties.endpoints?.source !== undefined && source.position !== undefined) {
      endpointChildren.push(
        endpointGlyphNode(
          mark.properties.endpoints.source,
          source.position,
          row,
          transformedIndex,
          mark,
          sharedColor,
          ctx,
        ),
      );
    }

    if (mark.properties.endpoints?.target !== undefined && target.position !== undefined) {
      endpointChildren.push(
        endpointGlyphNode(
          mark.properties.endpoints.target,
          target.position,
          row,
          transformedIndex,
          mark,
          sharedColor,
          ctx,
        ),
      );
    }
  }

  if (children.length === 0) return null;

  return attachMarkLayer({ type: 'scope', children: [...children, ...endpointChildren] }, mark, ctx);
};

const collectTargetFields = (
  ref: IRPlotTargetRef | undefined,
  encoding: TargetEncoding,
  fields: FieldCollector,
): void => {
  collectAnchorIdFields(ref !== undefined && 'anchorId' in ref ? ref.anchorId : undefined, fields);
  fields.addField(encoding?.anchorId);
  for (const field of Object.values({ ...encoding?.position })) fields.addField(positionField(field));
};

/** 内置 relation mark definition */
export const relationMarkDefinition: MarkDefinition<IRPlotRelationMark> = {
  schema: RelationMarkSchema,
  domainPadding: (mark, input, roles) =>
    markInstances(input).flatMap(instance => {
      const row = instance.kind === 'row' ? instance.row : undefined;
      return (['source', 'target'] as const).flatMap(side => {
        const glyph = mark.properties.endpoints?.[side];
        if (glyph === undefined) return [];
        const positions: Partial<Record<string, IRPlotPositionInput>> = { ...mark.encodings?.[side]?.position };
        if (roles.some(role => positions[role] !== undefined && 'edge' in positions[role]))
          throw new RetikzPlotError('Edge positions do not provide data-domain padding');
        return [
          {
            values: roles.map(role => positionValue(positions[role], row)),
            extent: roles.map(() => glyph.size ?? POINT_DEFAULT_RADIUS),
          },
        ];
      });
    }),
  labelHost: 'geometry',
  channelKinds: pathChannelKinds,
  collectFields: (mark, fields) => {
    collectTargetFields(mark.properties.source, mark.encodings?.source, fields);
    collectTargetFields(mark.properties.target, mark.encodings?.target, fields);
    collectPathChannelFields(mark, fields);
    const geometry = mark.properties.geometry;
    if (geometry.kind === 'path') {
      for (
        let index = 0;
        index < Math.max(geometry.via?.length ?? 0, mark.encodings?.geometry?.via?.length ?? 0);
        index++
      )
        collectTargetFields(geometry.via?.[index], mark.encodings?.geometry?.via?.[index], fields);
      geometry.route?.forEach((step, index) => {
        collectTargetFields(step.to, mark.encodings?.geometry?.route?.[index]?.to, fields);
        fields.addField(mark.encodings?.geometry?.route?.[index]?.label?.text);
      });
      fields.addField(mark.encodings?.geometry?.label?.text);
    }
    collectMarkLabelFields(mark.encodings?.label, fields);
    fields.addChannel(mark.encodings?.geometry?.width);
    fields.addChannel(mark.encodings?.geometry?.endWidth);
    fields.addChannel(mark.encodings?.color);
    fields.addChannel(mark.encodings?.fill);
    fields.addChannel(mark.encodings?.stroke);
  },
  lower: lowerRelation,
};
