import { NonBlankStringSchema, NormalizedFractionSchema, PositiveNumberSchema } from '@retikz/foundation';
import { discriminatedUnion, enum as zodEnum, literal, number, object, strictObject, tuple, union } from 'zod';

import { Anchor } from '../../shared';
import { AbsoluteTargetSchema, PolarPositionSchema, PositionSchema } from '../position';
import { AngleDegreesSchema } from '../scalar';
import { ScopeSelfPointSchema } from '../scope-point';

const TranslateSchema = object({
  kind: literal('translate').describe('Discriminator for Cartesian translate.'),
  x: number().describe('Cartesian x translation in user units.'),
  y: number().describe('Cartesian y translation in user units (screen y-down).'),
}).describe('Cartesian translate transform using user-unit x and y offsets.');

const PolarTranslateSchema = object({
  kind: literal('polar-translate').describe('Discriminator for polar translate.'),
  origin: union([NonBlankStringSchema, PositionSchema, PolarPositionSchema])
    .optional()
    .describe(
      'Origin reference: node id string, Cartesian [x, y], or nested PolarPosition. Omitted fields use [0, 0].',
    ),
  angle: AngleDegreesSchema.describe('Angle in degrees measured from the positive x axis.'),
  radius: number().describe(
    'Radius / distance in user units; negative values are accepted (equivalent to angle + 180°).',
  ),
}).describe('Polar translate transform lowered to Cartesian translate at compile time.');

const AtTranslateSchema = object({
  kind: literal('at-translate').describe('Discriminator for direction-relative translate.'),
  direction: zodEnum(Anchor).describe('Canonical direction enum (8 values, shared with AtPosition.direction).'),
  of: NonBlankStringSchema.describe('Referenced node id; must already be defined.'),
  distance: PositiveNumberSchema.optional().describe(
    'Distance along direction in user units. Omitted fields use CompileOptions.nodeDistance, then 24.',
  ),
}).describe('Direction-relative translate transform lowered to Cartesian translate at compile time.');

const OffsetTranslateSchema = object({
  kind: literal('offset-translate').describe('Discriminator for offset-from-reference translate.'),
  of: union([NonBlankStringSchema, PositionSchema, PolarPositionSchema]).describe(
    'Reference base point: node id string, Cartesian [x, y], or PolarPosition.',
  ),
  offset: tuple([number(), number()])
    .optional()
    .describe(
      'Additional [dx, dy] offset in user units; omit = [0, 0] so the transform translates exactly to the referent.',
    ),
}).describe('Offset translate transform lowered to Cartesian translate at compile time.');

const BetweenTranslateSchema = object({
  kind: literal('between-translate').describe('Discriminator for proportional translate between two endpoints.'),
  between: tuple([AbsoluteTargetSchema, AbsoluteTargetSchema]).describe(
    'Two absolute endpoints; path-relative targets are excluded.',
  ),
  fraction: NormalizedFractionSchema.describe('Proportion from the first endpoint to the second endpoint.'),
}).describe('Proportional translate transform lowered to Cartesian translate at compile time.');

const RotateSchema = strictObject({
  kind: literal('rotate').describe('Discriminator: rotation about a point.'),
  degrees: AngleDegreesSchema.describe('Rotation angle in degrees; positive = visually clockwise under screen y-down.'),
  pivot: ScopeSelfPointSchema.optional().describe(
    'Pivot on the intrinsic Scope envelope or an explicit local point. Omitted fields use origin.',
  ),
}).describe('Rotation transform around an intrinsic Scope self point.');

const ScaleSchema = strictObject({
  kind: literal('scale').describe('Discriminator: uniform / anisotropic scale.'),
  x: number().describe('Scale factor on the x axis.'),
  y: number().optional().describe('Scale factor on the y axis. Omitted fields use x for uniform scaling.'),
  pivot: ScopeSelfPointSchema.optional().describe(
    'Pivot on the intrinsic Scope envelope or an explicit local point. Omitted fields use origin.',
  ),
}).describe('Scale transform with x and optional y factors around an intrinsic Scope self point.');

export const TransformSchema = discriminatedUnion('kind', [
  TranslateSchema,
  PolarTranslateSchema,
  AtTranslateSchema,
  OffsetTranslateSchema,
  BetweenTranslateSchema,
  RotateSchema,
  ScaleSchema,
]).describe(
  'IR-level transform union. Translate variants resolve to Cartesian translate at compile time; rotate and scale pass through as transform primitives.',
);
