import { JsonObjectSchema } from '@retikz/core';
import { NonBlankStringSchema } from '@retikz/foundation';
import { discriminatedUnion, enum as zodEnum, literal, looseObject, number, object, union } from 'zod';

import { BUILTIN_COORDINATE_TYPES, Cartesian1DOrientation, PlotCoordinate } from './constants';

export const Cartesian2DSchema = object({
  type: literal(PlotCoordinate.Cartesian2D).describe('Discriminator: 2D cartesian space, x horizontal / y vertical'),
  x: NonBlankStringSchema.optional().describe(
    'Scale name for the x (horizontal) channel; omit to derive a default scale from the bound field type',
  ),
  y: NonBlankStringSchema.optional().describe(
    'Scale name for the y (vertical) channel; omit to derive a default scale from the bound field type',
  ),
}).describe('2D cartesian coordinate system; owns the positional scale bindings for x and y');

export const Polar2DSchema = object({
  type: literal(PlotCoordinate.Polar2D).describe(
    'Discriminator: 2D polar space, angle around the center / radius outward',
  ),
  angle: NonBlankStringSchema.optional().describe(
    'Scale name for the angle role; omit to derive from the bound field type. Its range is set to [startAngle, endAngle] degrees at lowering',
  ),
  radius: NonBlankStringSchema.optional().describe(
    'Scale name for the radius role; omit to derive from the bound field type. Its range is set to [innerRadius, outerRadius] units at lowering',
  ),
  startAngle: number()
    .default(0)
    .describe(
      "Angular range start in degrees; 0 = +x (3 o'clock), sweeping toward +y under screen y-down, matching core polar",
    ),
  endAngle: number().default(360).describe('Angular range end in degrees; defaults to a full 360-degree circle'),
  innerRadius: number()
    .min(0)
    .lt(1)
    .default(0)
    .describe('Donut hole radius as a fraction of the outer radius, 0..1 exclusive; 0 = solid disk (no hole)'),
}).describe(
  '2D polar coordinate system; owns the angle / radius scale bindings and the angular sweep / inner-radius geometry',
);

export const Cartesian1DSchema = object({
  type: literal(PlotCoordinate.Cartesian1D).describe(
    'Discriminator: 1D cartesian line; one position dimension, the other screen axis collapses to a fixed baseline',
  ),
  x: NonBlankStringSchema.optional().describe(
    'Scale name for the single position dimension; omit to derive a default scale from the bound field type. Scale-agnostic — supports linear / log / sqrt / time / band',
  ),
  orientation: zodEnum(Cartesian1DOrientation)
    .optional()
    .describe(
      'Axis orientation — horizontal lays the line along x (baseline at the bottom edge), vertical along y (baseline at the left edge); omit = horizontal (default applied during lowering)',
    ),
}).describe(
  '1D cartesian coordinate system: a single position dimension on a straight line (rug / timeline / 1D strip); the collapsed screen axis is pinned to a fixed baseline',
);

export const Polar1DSchema = object({
  type: literal(PlotCoordinate.Polar1D).describe(
    'Discriminator: 1D polar circle; one angular position dimension on a fixed-radius circle (cyclic / periodic data)',
  ),
  angle: NonBlankStringSchema.optional().describe(
    'Scale name for the single angular dimension; omit to derive from the bound field type. Its range is set to [startAngle, endAngle] degrees at lowering. Reuses the polar x→angle alias',
  ),
  radius: number()
    .gt(0)
    .max(1)
    .optional()
    .describe(
      'Circle radius as a fraction of the available radius, 0 < r ≤ 1; omit = 1 (outer circle, default applied during lowering)',
    ),
  startAngle: number()
    .optional()
    .describe(
      "Angular range start in degrees; omit = 0 (default applied during lowering). 0 = +x (3 o'clock), sweeping toward +y under screen y-down, matching core polar",
    ),
  endAngle: number()
    .optional()
    .describe('Angular range end in degrees; omit = 360 (full circle, default applied during lowering)'),
}).describe(
  '1D polar coordinate system: a single angular dimension mapped onto a fixed-radius circle (clock face / weekday wheel / periodic rug); reuses the polar angular projection',
);

const RESERVED_CUSTOM_COORDINATE_TYPES = new Set<string>([...BUILTIN_COORDINATE_TYPES, 'custom']);

export const CustomCoordinateSchema = looseObject({
  type: NonBlankStringSchema.refine(type => !RESERVED_CUSTOM_COORDINATE_TYPES.has(type), {
    message: 'custom coordinate type must not collide with a built-in or reserved coordinate type',
  }).describe(
    'Discriminator: custom coordinate operation type; must be a non-blank, non-built-in identifier registered through options.coordinates',
  ),
})
  .superRefine((operation, ctx) => {
    const result = JsonObjectSchema.safeParse(operation);
    if (!result.success) {
      ctx.addIssue({
        code: 'custom',
        message:
          'custom coordinate operation must be a JSON-serializable object; functions, undefined, NaN, and Infinity are not allowed',
      });
    }
  })
  .describe(
    'Custom coordinate operation: type is any non-built-in identifier; its config is validated at lowering time against the matching CoordinateDefinition supplied via options.coordinates. Position roles come from the definition, not the operation.',
  );

export const CoordinateSchema = discriminatedUnion('type', [
  Cartesian2DSchema,
  Polar2DSchema,
  Cartesian1DSchema,
  Polar1DSchema,
]).describe('Built-in coordinate-system union: cartesian2D | polar2D | cartesian1D | polar1D');

export const CoordinateOperationSchema = union([CoordinateSchema, CustomCoordinateSchema]).describe(
  'Coordinate operation union: built-in coordinate configs plus custom type open config operations validated by a runtime CoordinateDefinition',
);
