import type { ExternalRow } from '@retikz/data';

import type {
  AnyMarkDefinition,
  AnyPositionAdjustmentDefinition,
  CoordinateFrame,
  DimensionRole,
  MappedMarkPlacementTarget,
  MarkChannels,
} from '../../contract';
import type { IRPlotMarkOperation, IRPlotMarkPlacement } from '../../schemas';

import { RetikzPlotError } from '../../error';
import { resolvePositionAdjustmentOperation } from '../../resolve/position-adjustment';

/** 单个 Mark 对各 role 提出的最终 range inset */
export type MarkPlacementRangeOverrides = Partial<Record<DimensionRole, readonly [number, number]>>;

const assertEnvelopeExtent = (kind: string, role: string, extent: { lower: number; upper: number }): void => {
  if (!Number.isFinite(extent.lower) || extent.lower < 0 || !Number.isFinite(extent.upper) || extent.upper < 0) {
    throw new RetikzPlotError(
      `lowerPlots: position adjustment "${kind}" containment for role "${role}" must be finite and non-negative`,
    );
  }
};

/**
 * 在最终 Mark lowering 前解析 role-space containment，并提议收窄后的 role ranges
 * @description 只读 Definition.measure，不执行 initializer；最终 frame 会用提议 range 重新解析 guide 与 mark
 */
export const resolveMarkPlacementRangeOverrides = (
  resolution: { definition: AnyMarkDefinition; operation: IRPlotMarkOperation },
  rows: Array<ExternalRow>,
  frame: CoordinateFrame,
  channels: MarkChannels,
  dimensions: { width: number; height: number },
  registry: ReadonlyMap<string, AnyPositionAdjustmentDefinition>,
  boundaryRanges?: Partial<Record<DimensionRole, readonly [number, number]>>,
): MarkPlacementRangeOverrides | undefined => {
  const placement = (resolution.operation as { placement?: IRPlotMarkPlacement }).placement;
  if (placement === undefined) return undefined;
  const definitions = placement.adjustments.map(operation => resolvePositionAdjustmentOperation(operation, registry));
  const contained = definitions.filter(({ definition }) => definition.containment?.policy === 'contain');
  if (contained.length === 0) return undefined;
  const capability = resolution.definition.placement;
  if (capability === undefined || capability.normalExtent === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: mark type "${resolution.operation.type}" cannot provide glyph extent for position adjustment containment`,
    );
  }
  if (frame.mapRoles === undefined || frame.roleScales === undefined || frame.placementBoundary === undefined) {
    throw new RetikzPlotError(
      `lowerPlots: coordinate type "${frame.type}" cannot measure position adjustment containment`,
    );
  }
  const targets: Array<MappedMarkPlacementTarget> = capability
    .targets(resolution.operation as never, rows, frame)
    .map(target => ({ ...target, mappedRoles: frame.mapRoles?.(target.roleValues) ?? null }));
  const envelopeByRole = new Map<string, { lower: number; upper: number }>();
  for (const { definition, operation } of contained) {
    if (definition.space === 'screen') {
      throw new RetikzPlotError(
        `lowerPlots: screen-space position adjustment "${operation.kind}" containment requires a screen boundary capability`,
      );
    }
    let envelope;
    try {
      envelope = definition.containment?.measure(operation as never, {
        space: 'role',
        roles: frame.roles,
        roleScales: frame.roleScales,
        targets,
        ...dimensions,
      });
    } catch (cause) {
      if (cause instanceof RetikzPlotError) throw cause;
      throw new RetikzPlotError(`lowerPlots: position adjustment "${operation.kind}" containment failed`, {
        cause,
      });
    }
    if (envelope === undefined) {
      throw new RetikzPlotError(
        `lowerPlots: position adjustment "${operation.kind}" returned an invalid containment space`,
      );
    }
    for (const [role, extent] of Object.entries(envelope.byRole)) {
      if (extent === undefined) continue;
      assertEnvelopeExtent(operation.kind, role, extent);
      const current = envelopeByRole.get(role) ?? { lower: 0, upper: 0 };
      envelopeByRole.set(role, { lower: current.lower + extent.lower, upper: current.upper + extent.upper });
    }
  }

  const overrides: MarkPlacementRangeOverrides = {};
  for (const [role, adjustmentExtent] of envelopeByRole) {
    if (frame.placementBoundary.isCyclic(role)) continue;
    const roleIndex = frame.roles.indexOf(role);
    const scale = frame.roleScales[role];
    if (roleIndex < 0 || scale === undefined) {
      throw new RetikzPlotError(`lowerPlots: containment role "${role}" does not expose a position scale`);
    }
    const validTargets = targets.filter(
      (target): target is MappedMarkPlacementTarget & { mappedRoles: ReadonlyArray<number> } =>
        target.mappedRoles !== null,
    );
    if (validTargets.length === 0) continue;
    let glyphExtent = 0;
    for (const target of validTargets) {
      const normal = frame.placementBoundary.unitNormal(role, target.mappedRoles);
      if (normal === null) {
        throw new RetikzPlotError(`lowerPlots: coordinate type "${frame.type}" cannot resolve role "${role}" normal`);
      }
      const screenExtent = capability.normalExtent(resolution.operation as never, target, normal, channels);
      if (screenExtent === undefined || !Number.isFinite(screenExtent) || screenExtent < 0) {
        throw new RetikzPlotError(
          `lowerPlots: mark type "${resolution.operation.type}" cannot provide a finite glyph extent for containment`,
        );
      }
      const roleExtent = frame.placementBoundary.glyphExtentInRoleUnits(role, target.mappedRoles, screenExtent);
      if (roleExtent === null || !Number.isFinite(roleExtent) || roleExtent < 0) {
        throw new RetikzPlotError(
          `lowerPlots: coordinate type "${frame.type}" cannot contain glyph extent ${screenExtent} on role "${role}" at target "${target.key}"`,
        );
      }
      glyphExtent = Math.max(glyphExtent, roleExtent);
    }
    const [rangeStart, rangeEnd] = scale.range();
    const [boundaryStart, boundaryEnd] = boundaryRanges?.[role] ?? [rangeStart, rangeEnd];
    const rangeLow = Math.min(rangeStart, rangeEnd);
    const rangeHigh = Math.max(rangeStart, rangeEnd);
    const boundaryLow = Math.min(boundaryStart, boundaryEnd);
    const boundaryHigh = Math.max(boundaryStart, boundaryEnd);
    const mappedValues = validTargets.map(target => target.mappedRoles[roleIndex]);
    const observedLow = Math.min(...mappedValues);
    const observedHigh = Math.max(...mappedValues);
    const existingLower = Math.max(0, observedLow - boundaryLow);
    const existingUpper = Math.max(0, boundaryHigh - observedHigh);
    const lowerInset = Math.max(0, adjustmentExtent.lower + glyphExtent - existingLower);
    const upperInset = Math.max(0, adjustmentExtent.upper + glyphExtent - existingUpper);
    if (lowerInset + upperInset >= rangeHigh - rangeLow) {
      throw new RetikzPlotError(
        `lowerPlots: position adjustment containment for role "${role}" leaves no drawable scale range`,
      );
    }
    const low = rangeLow + lowerInset;
    const high = rangeHigh - upperInset;
    overrides[role] = rangeStart <= rangeEnd ? [low, high] : [high, low];
  }
  return Object.keys(overrides).length === 0 ? undefined : overrides;
};
