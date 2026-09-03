import type { ExternalRow } from '@retikz/data';

import type {
  AnyMarkDefinition,
  AnyPositionAdjustmentDefinition,
  CoordinateFrame,
  MappedMarkPlacementTarget,
  MarkChannels,
  MarkPositionResolution,
  ProjectedMarkPlacementTarget,
  RolePositionAdjustmentResultTarget,
  ScreenPositionAdjustmentResultTarget,
} from '../../contract';
import type { IRPlotMarkOperation, IRPlotMarkPlacement } from '../../schemas';

import { RetikzPlotError } from '../../error';
import { resolvePositionAdjustmentOperation } from '../../resolve/position-adjustment';

/** 构造只读 target 快照，避免外部 initializer 原地修改输入绕过输出守门 */
const readonlyMappedTargets = (
  targets: ReadonlyArray<MappedMarkPlacementTarget>,
): ReadonlyArray<MappedMarkPlacementTarget> =>
  targets.map(target =>
    Object.freeze({
      ...target,
      roleValues: Object.freeze([...target.roleValues]),
      mappedRoles: target.mappedRoles === null ? null : Object.freeze([...target.mappedRoles]),
    }),
  );

const readonlyProjectedTargets = (
  targets: ReadonlyArray<ProjectedMarkPlacementTarget>,
): ReadonlyArray<ProjectedMarkPlacementTarget> =>
  targets.map(target =>
    Object.freeze({
      ...target,
      roleValues: Object.freeze([...target.roleValues]),
      mappedRoles: target.mappedRoles === null ? null : Object.freeze([...target.mappedRoles]),
      position: target.position === null ? null : (Object.freeze([...target.position]) as [number, number]),
    }),
  );

const assertKeysAndNulls = <T extends { key: string }>(
  stage: string,
  before: ReadonlyArray<{ key: string; value: ReadonlyArray<number> | null }>,
  after: ReadonlyArray<T>,
  valueOf: (target: T) => ReadonlyArray<number> | null,
): void => {
  if (!Array.isArray(after) || after.length !== before.length) {
    throw new RetikzPlotError(`lowerPlots: ${stage} initializer must preserve placement target count`);
  }
  for (let index = 0; index < before.length; index += 1) {
    const previous = before[index];
    if (!Object.hasOwn(after, index)) {
      throw new RetikzPlotError(`lowerPlots: ${stage} initializer must preserve placement target order and keys`);
    }
    const next = after[index];
    if (typeof next !== 'object' || next === null || next.key !== previous.key) {
      throw new RetikzPlotError(`lowerPlots: ${stage} initializer must preserve placement target order and keys`);
    }
    const value = valueOf(next);
    if ((previous.value === null) !== (value === null)) {
      throw new RetikzPlotError(`lowerPlots: ${stage} initializer must preserve null placement targets`);
    }
    if (value !== null && (value.length !== previous.value?.length || value.some(item => !Number.isFinite(item)))) {
      throw new RetikzPlotError(`lowerPlots: ${stage} initializer must return finite values with stable dimensions`);
    }
  }
};

/** 执行单个 Mark 的完整 Placement 管线 */
export const resolveMarkPlacement = (
  resolution: { definition: AnyMarkDefinition; operation: IRPlotMarkOperation },
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  dimensions: { width: number; height: number },
  registry: ReadonlyMap<string, AnyPositionAdjustmentDefinition>,
): MarkPositionResolution | undefined => {
  const placement = (resolution.operation as { placement?: IRPlotMarkPlacement }).placement;
  if (placement === undefined) return undefined;
  const capability = resolution.definition.placement;
  if (capability === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: mark type "${resolution.operation.type}" does not support position adjustments`,
    );
  }
  if (frame.mapRoles === undefined || frame.projectMappedRoles === undefined || frame.roleScales === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: coordinate type "${frame.type}" does not expose mapped-role projection for position adjustments`,
    );
  }
  const rawTargets = capability.targets(resolution.operation as never, rows, frame);
  const keys = new Set<string>();
  let mappedTargets: Array<MappedMarkPlacementTarget> = rawTargets.map(target => {
    if (keys.has(target.key)) {
      throw new RetikzPlotError(`lowerPlots: mark placement target key "${target.key}" is duplicated`);
    }
    keys.add(target.key);
    if (target.roleValues.length !== frame.roles.length) {
      throw new RetikzPlotError('lowerPlots: mark placement target role count must match coordinate frame roles');
    }
    return { ...target, mappedRoles: frame.mapRoles?.(target.roleValues) ?? null };
  });
  const operations = placement.adjustments.map(operation => resolvePositionAdjustmentOperation(operation, registry));

  for (const { definition, operation } of operations) {
    if (definition.space !== 'role') continue;
    const input = readonlyMappedTargets(mappedTargets);
    let output: ReadonlyArray<RolePositionAdjustmentResultTarget>;
    try {
      output = definition.initialize(operation as never, {
        space: 'role',
        roles: frame.roles,
        roleScales: frame.roleScales,
        targets: input,
        ...dimensions,
      });
    } catch (cause) {
      if (cause instanceof RetikzPlotError) throw cause;
      throw new RetikzPlotError(`lowerPlots: role-space position adjustment "${operation.kind}" failed`, { cause });
    }
    assertKeysAndNulls(
      `role-space position adjustment "${operation.kind}"`,
      input.map(target => ({ key: target.key, value: target.mappedRoles })),
      output,
      target => target.mappedRoles,
    );
    mappedTargets = mappedTargets.map((target, index) => ({ ...target, mappedRoles: output[index].mappedRoles }));
  }

  let projectedTargets: Array<ProjectedMarkPlacementTarget> = mappedTargets.map(target => ({
    ...target,
    position: target.mappedRoles === null ? null : (frame.projectMappedRoles?.(target.mappedRoles) ?? null),
  }));
  for (const { definition, operation } of operations) {
    if (definition.space !== 'screen') continue;
    const input = readonlyProjectedTargets(projectedTargets);
    let output: ReadonlyArray<ScreenPositionAdjustmentResultTarget>;
    try {
      output = definition.initialize(operation as never, {
        space: 'screen',
        roles: frame.roles,
        targets: input,
        channels,
        ...dimensions,
      });
    } catch (cause) {
      if (cause instanceof RetikzPlotError) throw cause;
      throw new RetikzPlotError(`lowerPlots: screen-space position adjustment "${operation.kind}" failed`, { cause });
    }
    assertKeysAndNulls(
      `screen-space position adjustment "${operation.kind}"`,
      input.map(target => ({ key: target.key, value: target.position })),
      output,
      target => target.position,
    );
    projectedTargets = projectedTargets.map((target, index) => ({ ...target, position: output[index].position }));
  }
  const positionByKey = new Map(projectedTargets.map(target => [target.key, target.position] as const));
  return { targets: projectedTargets, positionFor: key => positionByKey.get(key) ?? null };
};
