import { z } from 'zod';
import { AtDirection } from './position/at-position';
import { PolarPositionSchema } from './position/polar-position';
import { PositionSchema } from './position/position';

const TranslateSchema = z
  .object({
    kind: z
      .literal('translate')
      .describe('Discriminator: Cartesian translate (the 3-variant Scene transform shape).'),
    x: z.number().describe('Cartesian x translation in user units.'),
    y: z
      .number()
      .describe('Cartesian y translation in user units (screen y-down).'),
  })
  .describe(
    'Cartesian translate transform; mirrors the Position [x, y] literal. Lowered directly to Scene `GroupPrim` translate.',
  );

const PolarTranslateSchema = z
  .object({
    kind: z
      .literal('polar-translate')
      .describe('Discriminator: polar translate; mirrors PolarPosition.'),
    origin: z
      .union([z.string().min(1), PositionSchema, PolarPositionSchema])
      .optional()
      .describe(
        'Origin reference (same union as PolarPosition.origin): node id string / Cartesian [x, y] / nested PolarPosition; omit = origin at (0, 0) so this acts as an absolute polar shift.',
      ),
    angle: z
      .number()
      .finite()
      .describe(
        'Angle in degrees; 0° = +x, 90° = +y (screen-down); matches PolarPosition.angle convention.',
      ),
    radius: z
      .number()
      .finite()
      .describe(
        'Radius / distance in user units; negative values are accepted (equivalent to angle + 180°).',
      ),
  })
  .describe(
    'Polar translate transform; mirrors PolarPosition. Lowered to Cartesian translate at compile time via resolvePosition.',
  );

const AtTranslateSchema = z
  .object({
    kind: z
      .literal('at-translate')
      .describe('Discriminator: direction-relative translate; mirrors AtPosition.'),
    direction: z
      .nativeEnum(AtDirection)
      .describe('Direction enum (8 values, shared with AtPosition.direction).'),
    of: z
      .string()
      .min(1)
      .describe(
        'Referent node id; must be defined earlier in the IR (forward references rejected, mirroring AtPosition.of).',
      ),
    distance: z
      .number()
      .positive()
      .optional()
      .describe(
        'Distance along direction in user units; omit → falls back to CompileOptions.nodeDistance (same default chain as AtPosition.distance).',
      ),
  })
  .describe(
    'Direction-relative translate transform; mirrors AtPosition. Lowered to Cartesian translate at compile time via resolvePosition.',
  );

const OffsetTranslateSchema = z
  .object({
    kind: z
      .literal('offset-translate')
      .describe('Discriminator: offset-from-referent translate; mirrors OffsetPosition.'),
    of: z
      .union([z.string().min(1), PositionSchema, PolarPositionSchema])
      .describe(
        'Referent base point (same union as OffsetPosition.of): node id (forward references rejected) / Cartesian [x, y] / PolarPosition.',
      ),
    offset: z
      .tuple([z.number().finite(), z.number().finite()])
      .optional()
      .describe(
        'Additional [dx, dy] offset in user units; omit = [0, 0] so the transform translates exactly to the referent.',
      ),
  })
  .describe(
    'Offset translate transform; mirrors OffsetPosition. Lowered to Cartesian translate at compile time via resolvePosition.',
  );

const RotateSchema = z
  .object({
    kind: z
      .literal('rotate')
      .describe('Discriminator: rotation about a point.'),
    degrees: z
      .number()
      .finite()
      .describe('Rotation angle in degrees; positive = visually clockwise under screen y-down.'),
    cx: z
      .number()
      .finite()
      .optional()
      .describe('Rotation center x in user units; omit = 0 (rotate about local origin).'),
    cy: z
      .number()
      .finite()
      .optional()
      .describe('Rotation center y in user units; omit = 0 (rotate about local origin).'),
  })
  .describe(
    'Rotation transform; identical shape to Scene `RotateTransform`. Passed through to GroupPrim without further lowering.',
  );

const ScaleSchema = z
  .object({
    kind: z
      .literal('scale')
      .describe('Discriminator: uniform / anisotropic scale.'),
    x: z
      .number()
      .finite()
      .describe(
        'Scale factor on the x axis. Zero scale collapses the coordinate system and is not invertible — relative positions inside the scope degrade to the local origin (0, 0). Avoid zero in practice; use a tiny positive value if a "near-invisible" effect is desired.',
      ),
    y: z
      .number()
      .finite()
      .optional()
      .describe(
        'Scale factor on the y axis; omit = x (uniform scaling). Zero scale falls back to (0, 0) for relative position inverse projection (see `x`).',
      ),
  })
  .describe(
    'Scale transform; identical shape to Scene `ScaleTransform`. Passed through to GroupPrim without further lowering.',
  );

export const TransformSchema = z
  .discriminatedUnion('kind', [
    TranslateSchema,
    PolarTranslateSchema,
    AtTranslateSchema,
    OffsetTranslateSchema,
    RotateSchema,
    ScaleSchema,
  ])
  .describe(
    'IR-level transform; 6 variants. The 4 translate variants (translate / polar-translate / at-translate / offset-translate) mirror the Node.position union one-for-one; rotate and scale match the Scene `Transform` shape. At compile time the 4 translate variants are lowered to Cartesian translate via resolvePosition before being pushed onto the cumulative chain emitted to Scene `GroupPrim` (which stays at 3 variants).',
  );

/** IR 层 transform 类型——6 变体 discriminated union（4 translate + rotate + scale） */
export type IRTransform = z.infer<typeof TransformSchema>;
/** 笛卡尔 translate 子分支 */
export type IRTranslateTransform = z.infer<typeof TranslateSchema>;
/** 极坐标 translate 子分支 */
export type IRPolarTranslateTransform = z.infer<typeof PolarTranslateSchema>;
/** 相对方向 translate 子分支 */
export type IRAtTranslateTransform = z.infer<typeof AtTranslateSchema>;
/** 偏移 translate 子分支 */
export type IROffsetTranslateTransform = z.infer<typeof OffsetTranslateSchema>;
/** 旋转子分支 */
export type IRRotateTransform = z.infer<typeof RotateSchema>;
/** 缩放子分支 */
export type IRScaleTransform = z.infer<typeof ScaleSchema>;
