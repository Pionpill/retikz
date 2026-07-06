import { z } from 'zod';

import { Anchor } from '../../shared';
import { AbsoluteTargetSchema, PolarPositionSchema, PositionSchema } from '../position';
import { AngleDegreesSchema, NormalizedFractionSchema } from '../scalar';

const TranslateSchema = z
  .object({
    kind: z.literal('translate').describe('Discriminator for Cartesian translate.'),
    x: z.number().describe('Cartesian x translation in user units.'),
    y: z.number().describe('Cartesian y translation in user units (screen y-down).'),
  })
  .describe('Cartesian translate transform using user-unit x and y offsets.');

const PolarTranslateSchema = z
  .object({
    kind: z.literal('polar-translate').describe('Discriminator for polar translate.'),
    origin: z
      .union([z.string().min(1), PositionSchema, PolarPositionSchema])
      .optional()
      .describe(
        'Origin reference: node id string, Cartesian [x, y], or nested PolarPosition. Omitted fields use [0, 0].',
      ),
    angle: AngleDegreesSchema.describe('Angle in degrees measured from the positive x axis.'),
    radius: z
      .number()
      .describe('Radius / distance in user units; negative values are accepted (equivalent to angle + 180°).'),
  })
  .describe('Polar translate transform lowered to Cartesian translate at compile time.');

const AtTranslateSchema = z
  .object({
    kind: z.literal('at-translate').describe('Discriminator for direction-relative translate.'),
    direction: z.enum(Anchor).describe('Canonical direction enum (8 values, shared with AtPosition.direction).'),
    of: z.string().min(1).describe('Referenced node id; must already be defined.'),
    distance: z
      .number()
      .positive()
      .optional()
      .describe('Distance along direction in user units. Omitted fields use CompileOptions.nodeDistance, then 24.'),
  })
  .describe('Direction-relative translate transform lowered to Cartesian translate at compile time.');

const OffsetTranslateSchema = z
  .object({
    kind: z.literal('offset-translate').describe('Discriminator for offset-from-reference translate.'),
    of: z
      .union([z.string().min(1), PositionSchema, PolarPositionSchema])
      .describe('Reference base point: node id string, Cartesian [x, y], or PolarPosition.'),
    offset: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe(
        'Additional [dx, dy] offset in user units; omit = [0, 0] so the transform translates exactly to the referent.',
      ),
  })
  .describe('Offset translate transform lowered to Cartesian translate at compile time.');

const BetweenTranslateSchema = z
  .object({
    kind: z.literal('between-translate').describe('Discriminator for proportional translate between two endpoints.'),
    between: z
      .tuple([AbsoluteTargetSchema, AbsoluteTargetSchema])
      .describe('Two absolute endpoints; path-relative targets are excluded.'),
    fraction: NormalizedFractionSchema.describe('Proportion from the first endpoint to the second endpoint.'),
  })
  .describe('Proportional translate transform lowered to Cartesian translate at compile time.');

const RotateSchema = z
  .object({
    kind: z.literal('rotate').describe('Discriminator: rotation about a point.'),
    degrees: AngleDegreesSchema.describe(
      'Rotation angle in degrees; positive = visually clockwise under screen y-down.',
    ),
    cx: z.number().optional().describe('Rotation center x in user units; omit = 0 (rotate about local origin).'),
    cy: z.number().optional().describe('Rotation center y in user units; omit = 0 (rotate about local origin).'),
  })
  .describe('Rotation transform around an optional local-origin offset.');

const ScaleSchema = z
  .object({
    kind: z.literal('scale').describe('Discriminator: uniform / anisotropic scale.'),
    x: z.number().describe('Scale factor on the x axis.'),
    y: z.number().optional().describe('Scale factor on the y axis. Omitted fields use x for uniform scaling.'),
  })
  .describe('Scale transform with x and optional y factors.');

export const TransformSchema = z
  .discriminatedUnion('kind', [
    TranslateSchema,
    PolarTranslateSchema,
    AtTranslateSchema,
    OffsetTranslateSchema,
    BetweenTranslateSchema,
    RotateSchema,
    ScaleSchema,
  ])
  .describe(
    'IR-level transform union. Translate variants resolve to Cartesian translate at compile time; rotate and scale pass through as transform primitives.',
  );
