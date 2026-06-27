import { type IRChild, type IRCoordinate, type IRNodeTarget, type IRPath, type IRPathRibbonOptions, type IRStep, type IRStepLabel, type IRTarget } from '@retikz/core';
import { type CoordinateFrame, type FieldCollector, type MarkChannels, type MarkDefinition, type MarkLoweringContext } from '../../../contract';
import { resolveFieldPath } from '../../data';
import { type ExternalRow, type MarkValueType, PlotMark, type PlotTargetRef, RelationGeometryKind, type RelationMark, type RelationPrimitiveStyle, type RelationRouteStep, type RelationRoutingSpec, type RelationStepLabel } from '../../../schemas';
import {
  applyPathChannelDeliveries,
  attachMarkLayer,
  channelDefaultOf,
  channelValueOf,
  collectAnchorIdFields,
  pathChannelKinds,
} from '../shared';

type ResolvedTarget = {
  target: IRTarget;
  coordinates: Array<IRCoordinate>;
};

const targetOwner = (mark: RelationMark, ctx: MarkLoweringContext, transformedIndex: number, role: string) => ({
  markType: mark.type,
  markId: mark.id,
  markIndex: ctx.markIndex,
  transformedIndex,
  role,
});

const relationGeneratedCoordinateId = (
  mark: RelationMark,
  ctx: MarkLoweringContext,
  transformedIndex: number,
  role: string,
): string => {
  const base = `${mark.id ?? `relation.${ctx.markIndex}`}.${transformedIndex}.${role}`;
  return ctx.plotId === undefined ? base : `${ctx.plotId}.${base}`;
};

const targetExtras = (ref: PlotTargetRef): Omit<IRNodeTarget, 'id'> => {
  const boundary = ref.boundary === true ? 'shape' : ref.boundary === false ? undefined : ref.boundary;
  return {
    ...(ref.anchor !== undefined ? { anchor: ref.anchor } : {}),
    ...(ref.offset !== undefined ? { offset: ref.offset } : {}),
    ...(boundary !== undefined ? { boundary } : {}),
  };
};

const shiftedPoint = (position: [number, number], offset: [number, number] | undefined): [number, number] =>
  offset === undefined ? position : [position[0] + offset[0], position[1] + offset[1]];

const resolveProjectedTarget = (
  mark: RelationMark,
  ref: Extract<PlotTargetRef, { project: Record<string, string> }>,
  row: ExternalRow,
  frame: CoordinateFrame,
  ctx: MarkLoweringContext | undefined,
  transformedIndex: number,
  role: string,
  forceCoordinate: boolean,
): ResolvedTarget | null => {
  const values: Array<unknown> = [];
  for (const frameRole of frame.roles) {
    const field = (ref.project as Partial<Record<string, string>>)[frameRole];
    if (field === undefined) {
      throw new Error(`lowerPlots: relation projected ${role} target is missing field mapping for coordinate role "${frameRole}"`);
    }
    values.push(resolveFieldPath(row, field));
  }
  const position = frame.projectRoles(values);
  if (position === null) return null;
  if (ref.anchorId !== undefined) {
    if (ctx?.anchors === undefined) {
      return { target: shiftedPoint(position, ref.offset), coordinates: [] };
    }
    const owner = targetOwner(mark, ctx, transformedIndex, role);
    const id = ctx.anchors.makeId(ref.anchorId, row, owner);
    return {
      target: { id, ...targetExtras(ref) },
      coordinates: [ctx.anchors.coordinate(id, position, owner)],
    };
  }
  if (forceCoordinate && ctx?.anchors !== undefined) {
    const owner = targetOwner(mark, ctx, transformedIndex, role);
    const id = relationGeneratedCoordinateId(mark, ctx, transformedIndex, role);
    return {
      target: { id, ...targetExtras(ref) },
      coordinates: [ctx.anchors.coordinate(id, position, owner)],
    };
  }
  if (ref.anchor !== undefined || ref.boundary !== undefined) {
    throw new Error(`lowerPlots: relation projected ${role} target requires anchorId when anchor or boundary is set`);
  }
  return { target: shiftedPoint(position, ref.offset), coordinates: [] };
};

const resolveTarget = (
  mark: RelationMark,
  ref: PlotTargetRef,
  row: ExternalRow,
  frame: CoordinateFrame,
  ctx: MarkLoweringContext | undefined,
  transformedIndex: number,
  role: string,
  forceCoordinate = false,
): ResolvedTarget | null => {
  if ('id' in ref) return { target: { id: ref.id, ...targetExtras(ref) }, coordinates: [] };
  if ('project' in ref) return resolveProjectedTarget(mark, ref, row, frame, ctx, transformedIndex, role, forceCoordinate);
  if (ctx?.anchors === undefined) {
    throw new Error(`lowerPlots: relation ${role} target uses generated anchorId but no AnchorRegistry is available`);
  }
  const owner = targetOwner(mark, ctx, transformedIndex, role);
  const id = ctx.anchors.makeId(ref.anchorId, row, owner);
  ctx.anchors.reference(id, owner);
  return { target: { id, ...targetExtras(ref) }, coordinates: [] };
};

const anchorInputMissing = (ref: PlotTargetRef, row: ExternalRow): boolean => {
  const anchorId = 'anchorId' in ref ? ref.anchorId : undefined;
  if (anchorId === undefined) return false;
  if (anchorId.field !== undefined) return resolveFieldPath(row, anchorId.field) === undefined;
  if (anchorId.template !== undefined) {
    for (const match of anchorId.template.matchAll(/\{field:([^}]+)\}/g)) {
      if (resolveFieldPath(row, match[1]) === undefined) return true;
    }
  }
  return false;
};

const withDefaultLabelSide = (label: IRStepLabel): IRStepLabel => ({ side: 'sloped', ...label });

const resolveMarkValue = <T>(value: MarkValueType<T> | undefined, row: ExternalRow): T | undefined => {
  if (value === undefined) return undefined;
  if (value.kind === 'constant') return value.value;
  return resolveFieldPath(row, value.value) as T | undefined;
};

const relationStyleValue = (
  style: RelationPrimitiveStyle | undefined,
  key: keyof RelationPrimitiveStyle,
  row: ExternalRow,
): unknown => resolveMarkValue((style as Partial<Record<keyof RelationPrimitiveStyle, MarkValueType<unknown>>> | undefined)?.[key], row);

const relationPrimitiveStyle = (
  mark: RelationMark,
  row: ExternalRow,
  colorOf: ((row: ExternalRow) => string | undefined) | undefined,
  defaultColor: string | undefined,
): Record<string, unknown> => {
  const out: Record<string, unknown> = {};
  const color = relationStyleValue(mark.style, 'color', row) ?? colorOf?.(row) ?? defaultColor;
  if (color !== undefined) out.color = color;
  for (const key of ['fill', 'fillOpacity', 'stroke', 'strokeWidth', 'drawOpacity', 'opacity', 'shadow', 'blendMode', 'zIndex'] as const) {
    const value = relationStyleValue(mark.style, key, row);
    if (value !== undefined) out[key] = value;
  }
  return out;
};

const resolveLabel = (label: RelationStepLabel | undefined, row: ExternalRow): IRStepLabel | undefined => {
  if (label === undefined) return undefined;
  const text = label.text;
  if (typeof text === 'object' && 'field' in text) {
    const value = resolveFieldPath(row, text.field);
    if (value === undefined) return undefined;
    return withDefaultLabelSide({ ...label, text: String(value) });
  }
  return withDefaultLabelSide(label as IRStepLabel);
};

const applyStepLabel = (steps: Array<IRStep>, label: IRStepLabel | undefined): Array<IRStep> => {
  if (label === undefined || steps.some(step => 'label' in step && step.label !== undefined)) return steps;
  for (let index = steps.length - 1; index >= 0; index -= 1) {
    const step = steps[index];
    if (step.kind !== 'move' && step.kind !== 'cycle') {
      const next = [...steps];
      next[index] = { ...step, label } as IRStep;
      return next;
    }
  }
  return steps;
};

const defaultRoute = (source: IRTarget, via: Array<IRTarget>, target: IRTarget, label: IRStepLabel | undefined): Array<IRStep> =>
  applyStepLabel(
    [
      { type: 'step', kind: 'move', to: source },
      ...via.map((to): IRStep => ({ type: 'step', kind: 'line', to })),
      { type: 'step', kind: 'line', to: target },
    ],
    label,
  );

const routeTargets = (source: IRTarget, via: Array<IRTarget>, target: IRTarget): Array<IRTarget> => [source, ...via, target];

const lineRoute = (targets: Array<IRTarget>): Array<IRStep> => [
  { type: 'step', kind: 'move', to: targets[0] },
  ...targets.slice(1).map((to): IRStep => ({ type: 'step', kind: 'line', to })),
];

const horizontalRibbonSteps = (source: IRTarget, target: IRTarget): Array<IRStep> => {
  const sourcePosition = positionOf(source);
  const targetPosition = positionOf(target);
  if (sourcePosition === undefined || targetPosition === undefined || sourcePosition[0] === targetPosition[0]) {
    return [
      { type: 'step', kind: 'move', to: source },
      { type: 'step', kind: 'line', to: target },
    ];
  }
  const dx = targetPosition[0] - sourcePosition[0];
  const handle = Math.abs(dx) / 2;
  const sign = dx >= 0 ? 1 : -1;
  return [
    { type: 'step', kind: 'move', to: source },
    {
      type: 'step',
      kind: 'cubic',
      control1: [sourcePosition[0] + sign * handle, sourcePosition[1]],
      control2: [targetPosition[0] - sign * handle, targetPosition[1]],
      to: target,
    },
  ];
};

const horizontalRibbonEndpointDirection = (source: IRTarget, target: IRTarget): number | undefined => {
  const sourcePosition = positionOf(source);
  const targetPosition = positionOf(target);
  if (sourcePosition === undefined || targetPosition === undefined || sourcePosition[0] === targetPosition[0]) return undefined;
  return targetPosition[0] >= sourcePosition[0] ? 0 : 180;
};

const bendRoute = (routing: Extract<RelationRoutingSpec, { kind: 'bend' }>, targets: Array<IRTarget>): Array<IRStep> => [
  { type: 'step', kind: 'move', to: targets[0] },
  ...targets.slice(1).map((to): IRStep => ({
    type: 'step',
    kind: 'bend',
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

const segmentLength = (from: [number, number], to: [number, number]): number => Math.hypot(to[0] - from[0], to[1] - from[1]);

const applyOrthogonalLabel = (
  steps: Array<IRStep>,
  label: IRStepLabel | undefined,
  candidates: Array<{ stepIndex: number; length: number }>,
  labelStep: 'main' | 'last' | undefined,
): Array<IRStep> => {
  if (label === undefined || steps.some(step => 'label' in step && step.label !== undefined)) return steps;
  if (labelStep === 'last' || candidates.length === 0) return applyStepLabel(steps, label);
  const selected = candidates.reduce((best, current) => (current.length > best.length ? current : best), candidates[0]);
  const next = [...steps];
  const step = next[selected.stepIndex];
  if (step.kind !== 'move' && step.kind !== 'cycle') {
    next[selected.stepIndex] = { ...step, label } as IRStep;
  }
  return next;
};

const orthogonalRoute = (
  routing: Extract<RelationRoutingSpec, { kind: 'orthogonal' }>,
  targets: Array<IRTarget>,
  label: IRStepLabel | undefined,
): Array<IRStep> => {
  const via = routing.via;
  if (via === undefined) throw new Error('lowerPlots: orthogonal relation routing requires via');
  const steps: Array<IRStep> = [{ type: 'step', kind: 'move', to: targets[0] }];
  const candidates: Array<{ stepIndex: number; length: number }> = [];
  let cursor = targets[0];
  for (const target of targets.slice(1)) {
    const fromPosition = positionOf(cursor);
    const toPosition = positionOf(target);
    if (fromPosition === undefined || toPosition === undefined) {
      steps.push({ type: 'step', kind: 'fold', via, to: target });
      cursor = target;
      continue;
    }
    const corner: [number, number] = via === '-|' ? [toPosition[0], fromPosition[1]] : [fromPosition[0], toPosition[1]];
    const firstIndex = steps.length;
    steps.push({ type: 'step', kind: 'line', to: corner });
    steps.push({ type: 'step', kind: 'line', to: target });
    candidates.push({ stepIndex: firstIndex, length: segmentLength(fromPosition, corner) });
    candidates.push({ stepIndex: firstIndex + 1, length: segmentLength(corner, toPosition) });
    cursor = target;
  }
  return applyOrthogonalLabel(steps, label, candidates, routing.labelStep);
};

const routedSteps = (
  routing: RelationRoutingSpec | undefined,
  source: IRTarget,
  via: Array<IRTarget>,
  target: IRTarget,
  label: IRStepLabel | undefined,
): Array<IRStep> => {
  const targets = routeTargets(source, via, target);
  if (routing === undefined || routing.kind === 'line') return applyStepLabel(lineRoute(targets), label);
  if (routing.kind === 'bend') return applyStepLabel(bendRoute(routing, targets), label);
  return orthogonalRoute(routing, targets, label);
};

const routeStepToIr = (
  step: RelationRouteStep,
  target: IRTarget,
  row: ExternalRow,
): IRStep => {
  const label = resolveLabel(step.label, row);
  switch (step.kind) {
    case 'move':
      return { type: 'step', kind: 'move', to: target };
    case 'line':
      return { type: 'step', kind: 'line', to: target, ...(label !== undefined ? { label } : {}) };
    case 'fold':
      if (step.via === undefined) throw new Error('lowerPlots: relation route fold step requires via');
      return { type: 'step', kind: 'fold', via: step.via, to: target, ...(label !== undefined ? { label } : {}) };
    case 'curve':
      if (step.control === undefined) throw new Error('lowerPlots: relation route curve step requires control');
      return { type: 'step', kind: 'curve', control: step.control, to: target, ...(label !== undefined ? { label } : {}) };
    case 'cubic':
      if (step.control1 === undefined || step.control2 === undefined) throw new Error('lowerPlots: relation route cubic step requires control1 and control2');
      return { type: 'step', kind: 'cubic', control1: step.control1, control2: step.control2, to: target, ...(label !== undefined ? { label } : {}) };
    case 'bend':
      return {
        type: 'step',
        kind: 'bend',
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
  mark: RelationMark,
  row: ExternalRow,
  frame: CoordinateFrame,
  ctx: MarkLoweringContext | undefined,
  transformedIndex: number,
  source: IRTarget,
  target: IRTarget,
): { steps: Array<IRStep>; coordinates: Array<IRCoordinate> } => {
  const route = mark.path?.route ?? [];
  const coordinates: Array<IRCoordinate> = [];
  const steps: Array<IRStep> = [{ type: 'step', kind: 'move', to: source }];
  for (let index = 0; index < route.length; index += 1) {
    const step = route[index];
    const stepTargetRef = step.to;
    if (stepTargetRef === undefined && index !== route.length - 1) {
      throw new Error(`lowerPlots: relation route step ${index} requires to; only the last explicit route step may omit to and default to target`);
    }
    const resolved = stepTargetRef === undefined
      ? { target, coordinates: [] }
      : resolveTarget(mark, stepTargetRef, row, frame, ctx, transformedIndex, `route.${index}`, true);
    if (resolved === null) return { steps: [], coordinates: [] };
    coordinates.push(...resolved.coordinates);
    steps.push(routeStepToIr(step, resolved.target, row));
  }
  return { steps: applyStepLabel(steps, resolveLabel(mark.path?.label, row)), coordinates };
};

export const lowerRelation = (
  mark: RelationMark,
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  ctx: MarkLoweringContext | undefined,
): IRChild | null => {
  const colorOf = channelValueOf<string>(channels, 'color');
  const defaultColor = channelDefaultOf<string>(channels, 'color');
  const children: Array<IRChild> = [];
  for (let transformedIndex = 0; transformedIndex < rows.length; transformedIndex += 1) {
    const row = rows[transformedIndex];
    if (anchorInputMissing(mark.source, row) || anchorInputMissing(mark.target, row)) continue;
    const source = resolveTarget(mark, mark.source, row, frame, ctx, transformedIndex, 'source');
    const target = resolveTarget(mark, mark.target, row, frame, ctx, transformedIndex, 'target');
    if (source === null || target === null) continue;
    const coordinates: Array<IRCoordinate> = [...source.coordinates, ...target.coordinates];
    const style = relationPrimitiveStyle(mark, row, colorOf, defaultColor);
    if ((mark.kind ?? RelationGeometryKind.Path) === RelationGeometryKind.Ribbon) {
      const width = resolveMarkValue<number>(mark.ribbon?.width, row);
      if (width === undefined) continue;
      const endWidth = resolveMarkValue<number>(mark.ribbon?.endWidth, row);
      const ribbonOptions = (mark.ribbon?.options ?? {}) as Partial<IRPathRibbonOptions>;
      const direction = horizontalRibbonEndpointDirection(source.target, target.target);
      const ribbon: IRPath = {
        type: 'path',
        kind: 'ribbon',
        ...style,
        ribbon: {
          ...ribbonOptions,
          ...(endWidth === undefined
            ? {
                width,
                ...(direction !== undefined ? { start: { direction }, end: { direction } } : {}),
              }
            : {
                start: { width, ...(direction !== undefined ? { direction } : {}) },
                end: { width: endWidth, ...(direction !== undefined ? { direction } : {}) },
              }),
        },
        children: horizontalRibbonSteps(source.target, target.target),
      };
      children.push(...coordinates, ribbon);
      continue;
    }
    let steps: Array<IRStep>;
    if (mark.path?.route !== undefined) {
      const routed = explicitRoute(mark, row, frame, ctx, transformedIndex, source.target, target.target);
      if (routed.steps.length === 0) continue;
      coordinates.push(...routed.coordinates);
      steps = routed.steps;
    } else {
      const viaTargets: Array<IRTarget> = [];
      for (let index = 0; index < (mark.path?.via?.length ?? 0); index += 1) {
        const via = resolveTarget(mark, mark.path?.via?.[index] as PlotTargetRef, row, frame, ctx, transformedIndex, `via.${index}`, true);
        if (via === null) continue;
        coordinates.push(...via.coordinates);
        viaTargets.push(via.target);
      }
      steps = mark.path?.routing === undefined
        ? defaultRoute(source.target, viaTargets, target.target, resolveLabel(mark.path?.label, row))
        : routedSteps(mark.path.routing, source.target, viaTargets, target.target, resolveLabel(mark.path.label, row));
    }
    const pathOptions = (mark.path?.options ?? {}) as Partial<IRPath>;
    const path: IRPath = applyPathChannelDeliveries(
      {
        type: 'path',
        ...pathOptions,
        ...style,
        children: steps,
      },
      mark,
      row,
      channels,
    );
    children.push(...coordinates, path);
  }
  if (children.length === 0) return null;
  return attachMarkLayer({ type: 'scope', children }, mark, ctx?.provenance);
};

const collectTargetFields = (ref: PlotTargetRef, fields: FieldCollector): void => {
  const anchorId = 'anchorId' in ref ? ref.anchorId : undefined;
  collectAnchorIdFields(anchorId, fields);
  if ('project' in ref) Object.values(ref.project).forEach(field => fields.addField(field));
};

const collectLabelFields = (label: RelationStepLabel | undefined, fields: FieldCollector): void => {
  if (label !== undefined && typeof label.text === 'object' && 'field' in label.text) fields.addField(label.text.field);
};

const collectRelationStyleFields = (style: RelationPrimitiveStyle | undefined, fields: FieldCollector): void => {
  for (const value of Object.values(style ?? {})) fields.addChannel(value);
};

export const relationMarkDefinition: MarkDefinition<RelationMark> = {
  type: PlotMark.Relation,
  channelKinds: pathChannelKinds,
  collectFields: (mark, fields) => {
    collectTargetFields(mark.source, fields);
    collectTargetFields(mark.target, fields);
    collectRelationStyleFields(mark.style, fields);
    mark.path?.via?.forEach(ref => collectTargetFields(ref, fields));
    mark.path?.route?.forEach(step => {
      if (step.to !== undefined) collectTargetFields(step.to, fields);
      collectLabelFields(step.label, fields);
    });
    collectLabelFields(mark.path?.label, fields);
    fields.addChannel(mark.ribbon?.width);
    fields.addChannel(mark.ribbon?.endWidth);
    fields.addChannel(mark.encoding?.color);
    for (const channel of Object.values(mark.encoding?.channels ?? {})) fields.addChannel(channel);
  },
  lower: lowerRelation,
};
