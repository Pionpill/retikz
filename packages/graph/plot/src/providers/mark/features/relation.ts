import { type IRChild, type IRCoordinate, type IRNodeTarget, type IRPath, type IRStep, type IRStepLabel, type IRTarget } from '@retikz/core';
import { type CoordinateFrame, type FieldCollector, type MarkChannels, type MarkDefinition, type MarkLoweringContext } from '../../../contract';
import { resolveFieldPath } from '../../data';
import { type ExternalRow, PlotMark, type PlotTargetRef, type RelationMark, type RelationRouteStep, type RelationStepLabel } from '../../../schemas';
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
  const route = mark.route ?? [];
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
  return { steps: applyStepLabel(steps, resolveLabel(mark.label, row)), coordinates };
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
    const color = colorOf?.(row) ?? (mark.path?.color === undefined ? defaultColor : undefined);
    let steps: Array<IRStep>;
    if (mark.route !== undefined) {
      const routed = explicitRoute(mark, row, frame, ctx, transformedIndex, source.target, target.target);
      if (routed.steps.length === 0) continue;
      coordinates.push(...routed.coordinates);
      steps = routed.steps;
    } else {
      const viaTargets: Array<IRTarget> = [];
      for (let index = 0; index < (mark.via?.length ?? 0); index += 1) {
        const via = resolveTarget(mark, mark.via?.[index] as PlotTargetRef, row, frame, ctx, transformedIndex, `via.${index}`, true);
        if (via === null) continue;
        coordinates.push(...via.coordinates);
        viaTargets.push(via.target);
      }
      steps = defaultRoute(source.target, viaTargets, target.target, resolveLabel(mark.label, row));
    }
    const path: IRPath = applyPathChannelDeliveries(
      {
        type: 'path',
        ...(mark.path ?? {}),
        ...(color !== undefined ? { color } : {}),
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

export const relationMarkDefinition: MarkDefinition<RelationMark> = {
  type: PlotMark.Relation,
  channelKinds: pathChannelKinds,
  collectFields: (mark, fields) => {
    collectTargetFields(mark.source, fields);
    collectTargetFields(mark.target, fields);
    mark.via?.forEach(ref => collectTargetFields(ref, fields));
    mark.route?.forEach(step => {
      if (step.to !== undefined) collectTargetFields(step.to, fields);
      collectLabelFields(step.label, fields);
    });
    collectLabelFields(mark.label, fields);
    fields.addChannel(mark.encoding?.color);
    for (const channel of Object.values(mark.encoding?.channels ?? {})) fields.addChannel(channel);
  },
  lower: lowerRelation,
};
