import type { IRScope } from '@retikz/core';
import { z } from 'zod';
import type { AxisGuide, CoordinateOp, ExternalRow, Mark, Scale } from '../ir';
import type { GuideContext, LoweredGuide } from '../guide';
import type { ProvenanceContext } from '../pipeline/provenance';
import type { LegendReserve, Margins } from '../pipeline/layout';
import type { PositionScale } from '../scale';
import type { DimensionRole, ResolvedCoordinate } from './types';
import type { ResolvedCustomCoordinate } from './custom';

export type CoordinatePlotArea = {
  x: number;
  y: number;
  width: number;
  height: number;
};

export type CoordinateResolution = {
  frame: ResolvedCoordinate;
  plotArea: CoordinatePlotArea;
  gridLayers: Array<IRScope>;
  axisLayers: Array<IRScope>;
};

export type CoordinateResolveContext = {
  width: number;
  height: number;
  fontSize: number;
  margin?: Partial<Margins>;
  legendReserve: LegendReserve;
  provenance?: ProvenanceContext;
  collectRoleValues: (role: DimensionRole, opts?: { includeBaseline?: boolean }) => Array<unknown>;
  resolveScaleForRole: (role: DimensionRole, scaleName: string | undefined, values: Array<unknown>) => Scale;
  buildPositionScale: (def: Scale, values: Array<unknown>, range: readonly [number, number]) => PositionScale;
  assertBaselineScaleCompatible: (scaleType: string, marks: ReadonlyArray<Mark>) => void;
  axisGuides: ReadonlyArray<AxisGuide>;
  lowerGuide: (guide: AxisGuide, ctx: GuideContext, provenance?: ProvenanceContext) => LoweredGuide;
  lowerCustomAxis: (frame: ResolvedCustomCoordinate, guide: AxisGuide, fontSize: number, provenance?: ProvenanceContext) => LoweredGuide;
  rows: Array<ExternalRow>;
  marks: ReadonlyArray<Mark>;
};

export type CoordinateDefinition<TCoordinateOp extends CoordinateOp = CoordinateOp> = {
  schema: z.ZodType<TCoordinateOp>;
  roles: ReadonlyArray<DimensionRole>;
  resolve: (op: TCoordinateOp, ctx: CoordinateResolveContext) => CoordinateResolution;
};

export const defineCoordinate = <TCoordinateOp extends CoordinateOp>(def: CoordinateDefinition<TCoordinateOp>): CoordinateDefinition<TCoordinateOp> => def;

export type AnyCoordinateDefinition = Omit<CoordinateDefinition<CoordinateOp>, 'schema' | 'resolve'> & {
  schema: z.ZodType;
  resolve: (op: never, ctx: CoordinateResolveContext) => CoordinateResolution;
};

export const BUILTIN_COORDINATES: ReadonlyArray<AnyCoordinateDefinition> = [];

export const extractCoordinateType = (schema: z.ZodType): string => {
  if (!(schema instanceof z.ZodObject)) {
    throw new Error('lowerPlots: coordinate registration schema must be a ZodObject with a literal type field');
  }
  const typeSchema = schema.shape.type;
  if (!(typeSchema instanceof z.ZodLiteral) || typeof typeSchema.value !== 'string' || typeSchema.value.length === 0) {
    throw new Error('lowerPlots: coordinate registration schema must declare type as a non-empty z.literal string');
  }
  return typeSchema.value;
};

export const resolveCoordinateRegistry = (custom?: ReadonlyArray<AnyCoordinateDefinition>): Map<string, AnyCoordinateDefinition> => {
  const registry = new Map<string, AnyCoordinateDefinition>();
  for (const def of BUILTIN_COORDINATES) {
    registry.set(extractCoordinateType(def.schema), def);
  }
  for (const def of custom ?? []) {
    const type = extractCoordinateType(def.schema);
    if (registry.has(type)) {
      throw new Error(`lowerPlots: duplicate coordinate registration: "${type}"`);
    }
    registry.set(type, def);
  }
  return registry;
};
