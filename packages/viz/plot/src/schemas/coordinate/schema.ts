import { JsonValueSchema, NonBlankStringSchema } from '@retikz/foundation';
import { discriminatedUnion, enum as zodEnum, literal, looseObject, number, object, union } from 'zod';

import { BUILTIN_COORDINATE_TYPES, Cartesian1DOrientation, PlotCoordinate, PolarInterpolation } from './constants';

/** 校验二维笛卡尔坐标系及其 x、y 位置比例尺绑定 */
export const Cartesian2DSchema = object({
  type: literal(PlotCoordinate.Cartesian2D).describe('Discriminator: 2D cartesian space, x horizontal / y vertical'),
  x: NonBlankStringSchema.optional().describe(
    'Scale name for the x (horizontal) channel; omit to derive a default scale from the bound field type',
  ),
  y: NonBlankStringSchema.optional().describe(
    'Scale name for the y (vertical) channel; omit to derive a default scale from the bound field type',
  ),
}).describe('2D cartesian coordinate system; owns the positional scale bindings for x and y');

/** 校验二维极坐标系的角度、半径比例尺与角度范围、内半径几何 */
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
  interpolation: zodEnum(PolarInterpolation)
    .optional()
    .describe(
      'Connection space for fixed-radius boundaries and interpolation-sensitive marks; omit to infer polar for continuous angular scales and chord for discrete angular scales',
    ),
}).describe(
  '2D polar coordinate system; owns the angle / radius scale bindings and the angular sweep / inner-radius geometry',
);

/** 校验沿直线排列的一维坐标系，另一屏幕轴固定在基线上 */
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

/** 校验将单个角度维度投影到固定半径圆周的一维极坐标系 */
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

const CustomCoordinateObjectSchema = looseObject({
  type: NonBlankStringSchema.refine(type => !RESERVED_CUSTOM_COORDINATE_TYPES.has(type), {
    message: 'custom coordinate type must not collide with a built-in or reserved coordinate type',
  }).describe(
    'Discriminator: custom coordinate operation type; must be a non-blank, non-built-in identifier registered through options.coordinates',
  ),
});

/** 校验自定义坐标操作的开放配置，具体约束由匹配的运行时定义处理 */
export const CustomCoordinateSchema = CustomCoordinateObjectSchema.catchall(JsonValueSchema).describe(
  'Custom coordinate operation: type is any non-built-in identifier; its config is validated at lowering time against the matching CoordinateDefinition supplied via options.coordinates. Position roles come from the definition, not the operation.',
);

/** 校验内置一维、二维笛卡尔或极坐标配置 */
export const CoordinateSchema = discriminatedUnion('type', [
  Cartesian2DSchema,
  Polar2DSchema,
  Cartesian1DSchema,
  Polar1DSchema,
]).describe('Built-in coordinate-system union: cartesian2D | polar2D | cartesian1D | polar1D');

/** 校验内置坐标配置或运行时定义支持的自定义坐标操作 */
export const CoordinateOperationSchema = union([CoordinateSchema, CustomCoordinateSchema]).describe(
  'Coordinate operation union: built-in coordinate configs plus custom type open config operations validated by a runtime CoordinateDefinition',
);
