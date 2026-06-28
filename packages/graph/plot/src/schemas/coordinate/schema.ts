import { JsonObjectSchema } from '@retikz/core';
import { z } from 'zod';
import { BUILTIN_COORDINATE_TYPES, Cartesian1DOrientation, PlotCoordinate } from './constants';

export const Cartesian2DSchema = z
  .object({
    type: z.literal(PlotCoordinate.Cartesian2D).describe('Discriminator: 2D cartesian space, x horizontal / y vertical'),
    x: z.string().min(1).optional().describe('Scale name for the x (horizontal) channel; omit to derive a default scale from the bound field type'),
    y: z.string().min(1).optional().describe('Scale name for the y (vertical) channel; omit to derive a default scale from the bound field type'),
  })
  .describe('2D cartesian coordinate system; owns the positional scale bindings for x and y');

export const Polar2DSchema = z
  .object({
    type: z.literal(PlotCoordinate.Polar2D).describe('Discriminator: 2D polar space, angle around the center / radius outward'),
    angle: z.string().min(1).optional().describe('Scale name for the angle role; omit to derive from the bound field type. Its range is set to [startAngle, endAngle] degrees at lowering'),
    radius: z.string().min(1).optional().describe('Scale name for the radius role; omit to derive from the bound field type. Its range is set to [innerRadius, outerRadius] units at lowering'),
    startAngle: z
      .number()

      .default(0)
      .describe('Angular range start in degrees; 0 = +x (3 o\'clock), sweeping toward +y under screen y-down, matching core polar'),
    endAngle: z.number().default(360).describe('Angular range end in degrees; defaults to a full 360-degree circle'),
    innerRadius: z
      .number()

      .min(0)
      .lt(1)
      .default(0)
      .describe('Donut hole radius as a fraction of the outer radius, 0..1 exclusive; 0 = solid disk (no hole)'),
  })
  .describe('2D polar coordinate system; owns the angle / radius scale bindings and the angular sweep / inner-radius geometry');

export const Cartesian1DSchema = z
  .object({
    type: z.literal(PlotCoordinate.Cartesian1D).describe('Discriminator: 1D cartesian line; one position dimension, the other screen axis collapses to a fixed baseline'),
    x: z.string().min(1).optional().describe('Scale name for the single position dimension; omit to derive a default scale from the bound field type. Scale-agnostic — supports linear / log / sqrt / time / band'),
    orientation: z
      .enum(Cartesian1DOrientation)
      .optional()
      .describe('Axis orientation — horizontal lays the line along x (baseline at the bottom edge), vertical along y (baseline at the left edge); omit = horizontal (default applied during lowering)'),
  })
  .describe('1D cartesian coordinate system: a single position dimension on a straight line (rug / timeline / 1D strip); the collapsed screen axis is pinned to a fixed baseline');

export const Polar1DSchema = z
  .object({
    type: z.literal(PlotCoordinate.Polar1D).describe('Discriminator: 1D polar circle; one angular position dimension on a fixed-radius circle (cyclic / periodic data)'),
    angle: z.string().min(1).optional().describe('Scale name for the single angular dimension; omit to derive from the bound field type. Its range is set to [startAngle, endAngle] degrees at lowering. Reuses the polar x→angle alias'),
    radius: z
      .number()

      .gt(0)
      .max(1)
      .optional()
      .describe('Circle radius as a fraction of the available radius, 0 < r ≤ 1; omit = 1 (outer circle, default applied during lowering)'),
    startAngle: z
      .number()

      .optional()
      .describe("Angular range start in degrees; omit = 0 (default applied during lowering). 0 = +x (3 o'clock), sweeping toward +y under screen y-down, matching core polar"),
    endAngle: z.number().optional().describe('Angular range end in degrees; omit = 360 (full circle, default applied during lowering)'),
  })
  .describe('1D polar coordinate system: a single angular dimension mapped onto a fixed-radius circle (clock face / weekday wheel / periodic rug); reuses the polar angular projection');

export const Ternary2DSchema = z
  .object({
    type: z.literal(PlotCoordinate.Ternary2D).describe('Discriminator: 2D ternary space; three components x + y + z normalized to barycentric coordinates inside an equilateral triangle'),
  })
  .describe('2D ternary coordinate system: three continuous components (bound via the mark x / y / z channels) projected by barycentric coordinates into an equilateral triangle (composition / mixture / vote share); each row is auto-normalized by x+y+z at lowering. No geometry options this round (per-component scales not yet supported)');

const RESERVED_CUSTOM_COORDINATE_TYPES = new Set<string>([...BUILTIN_COORDINATE_TYPES, 'custom']);

export const CustomCoordinateSchema = z
  .object({
    type: z
      .string()
      .min(1)
      .refine(type => !RESERVED_CUSTOM_COORDINATE_TYPES.has(type), {
        message: 'custom coordinate type must not collide with a built-in or reserved coordinate type',
      })
      .describe('Discriminator: custom coordinate operation type; must be a non-empty, non-built-in identifier registered through options.coordinates'),
  })
  .passthrough()
  .superRefine((operation, ctx) => {
    const result = JsonObjectSchema.safeParse(operation);
    if (!result.success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'custom coordinate operation must be a JSON-serializable object; functions, undefined, NaN, and Infinity are not allowed',
      });
    }
  })
  .describe('Custom coordinate operation: type is any non-built-in identifier; its config is validated at lowering time against the matching CoordinateDefinition supplied via options.coordinates. Position roles come from the definition, not the operation.');

export const CoordinateSchema = z
  .discriminatedUnion('type', [Cartesian2DSchema, Polar2DSchema, Cartesian1DSchema, Polar1DSchema, Ternary2DSchema])
  .describe('Built-in coordinate-system union: cartesian2D | polar2D | cartesian1D | polar1D | ternary2D');

export const CoordinateOperationSchema = z
  .union([CoordinateSchema, CustomCoordinateSchema])
  .describe('Coordinate operation union: built-in coordinate configs plus custom type passthrough operations validated by a runtime CoordinateDefinition');
