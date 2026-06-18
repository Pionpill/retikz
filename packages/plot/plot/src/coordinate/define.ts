import type { IRScope } from '@retikz/core';
import { z } from 'zod';
import type { AxisGuide, CoordinateOp, ExternalRow, Mark, Scale } from '../ir';
import { Cartesian1DSchema, Cartesian2DSchema, Polar1DSchema, Polar2DSchema, Ternary2DSchema } from '../ir/coordinate';
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
  assertBaselineScaleCompatible: (scaleType: Scale['type'], marks: ReadonlyArray<Mark>) => void;
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

const unsupportedBuiltinResolve = (): CoordinateResolution => {
  throw new Error('lowerPlots: built-in coordinate definitions are resolved by the pipeline registry adapter');
};

export const BUILTIN_COORDINATES: ReadonlyArray<AnyCoordinateDefinition> = [
  { schema: Cartesian2DSchema, roles: ['x', 'y'], resolve: unsupportedBuiltinResolve },
  { schema: Polar2DSchema, roles: ['x', 'y'], resolve: unsupportedBuiltinResolve },
  { schema: Cartesian1DSchema, roles: ['x'], resolve: unsupportedBuiltinResolve },
  { schema: Polar1DSchema, roles: ['x'], resolve: unsupportedBuiltinResolve },
  { schema: Ternary2DSchema, roles: ['x', 'y', 'z'], resolve: unsupportedBuiltinResolve },
];

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

export const BUILTIN_COORDINATE_DEFINITIONS_BY_TYPE: ReadonlyMap<string, AnyCoordinateDefinition> = new Map(
  BUILTIN_COORDINATES.map(def => [extractCoordinateType(def.schema), def] as const),
);

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
