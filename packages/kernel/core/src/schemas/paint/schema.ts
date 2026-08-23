import {
  createOpenStringSchema,
  NonBlankStringSchema,
  NonNegativeIntegerSchema,
  NormalizedFractionSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import { z } from 'zod';

import { AngleDegreesSchema } from '../scalar';
import { PathLineCapSchema, PathLineJoinSchema, StrokeDashOffsetSchema, StrokeDashPatternSchema } from '../stroke';
import { CssColorSchema, OpacitySchema } from '../style';
import { ImageFit, PatternShape } from './constants';

/** Core 内置 pattern motif 与自定义注册名共享的开放名称 schema */
export const PatternShapeNameSchema = createOpenStringSchema(PatternShape).describe(
  'Pattern motif provider name: a Core built-in or a custom name registered via CompileOptions.patterns.',
);

export const GradientStopSchema = z
  .object({
    offset: NormalizedFractionSchema.describe('Stop position along the gradient axis.'),
    color: CssColorSchema.describe('CSS color for this stop.'),
    opacity: OpacitySchema.optional().describe('Stop opacity. Omitted fields are fully opaque.'),
  })
  .describe('A single gradient color stop');

export const LinearGradientPaintSchema = z
  .object({
    kind: z.literal('linearGradient').describe('Discriminator for linear gradient paint.'),
    stops: z.array(GradientStopSchema).min(2).describe('Gradient stops, at least 2'),
    angle: AngleDegreesSchema.optional().describe(
      'Gradient direction angle in degrees. Omitted fields use the paint backend default.',
    ),
  })
  .describe('Linear gradient paint server');

export const RadialGradientPaintSchema = z
  .object({
    kind: z.literal('radialGradient').describe('Discriminator for radial gradient paint.'),
    stops: z.array(GradientStopSchema).min(2).describe('Gradient stops, at least 2'),
    center: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('Center in object-bounding-box coordinates. Omitted fields use [0.5, 0.5].'),
    radius: PositiveNumberSchema.optional().describe('Radius in object-bounding-box units. Omitted fields use 0.5.'),
  })
  .describe('Radial gradient paint server');

export const ConicGradientPaintSchema = z
  .object({
    kind: z.literal('conicGradient').describe('Discriminator for conic gradient paint.'),
    stops: z.array(GradientStopSchema).min(2).describe('Gradient stops, at least 2'),
    center: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('Center in object-bounding-box coordinates. Omitted fields use [0.5, 0.5].'),
    angle: AngleDegreesSchema.optional().describe('Start angle in degrees. Omitted fields use 0.'),
  })
  .describe('Conic gradient paint server');

export const PatternLineStyleSchema = z.strictObject({
  color: CssColorSchema.optional().describe('Line motif color override.'),
  lineWidth: PositiveNumberSchema.optional().describe('Line motif stroke width override in user units.'),
  dashed: z.boolean().optional().describe('Dashed preset override. Explicit `dashPattern` takes precedence.'),
  dotted: z
    .boolean()
    .optional()
    .describe('Dotted preset override. Explicit `dashPattern` and `dashed` take precedence.'),
  dashPattern: StrokeDashPatternSchema.optional().describe(
    'Explicit line motif dash pattern override; takes precedence over presets.',
  ),
  dashOffset: StrokeDashOffsetSchema.optional().describe('Line motif dash offset override in user units.'),
  lineCap: PathLineCapSchema.optional().describe('Line motif endpoint cap override.'),
  lineJoin: PathLineJoinSchema.optional().describe('Line motif corner join override.'),
});

export const PatternLineStyleOverrideSchema = z.strictObject({
  index: NonNegativeIntegerSchema.describe('Zero-based line index within the style cycle.'),
  style: PatternLineStyleSchema.describe('Partial line style applied at this cycle index.'),
});

/** 单个 Pattern tile 允许展开的最大线型周期，限制 motif 数量与编译期内存 */
const MAX_PATTERN_LINE_STYLE_PERIOD = 512;

export const PatternLineStyleCycleSchema = z
  .strictObject({
    period: z
      .number()
      .int()
      .min(2)
      .max(MAX_PATTERN_LINE_STYLE_PERIOD)
      .describe('Number of adjacent line slots in one style cycle, from 2 through 512.'),
    overrides: z
      .array(PatternLineStyleOverrideSchema)
      .min(1)
      .describe('Sparse line-style overrides keyed by zero-based cycle index.'),
  })
  .superRefine((cycle, context) => {
    const seen = new Set<number>();
    cycle.overrides.forEach((override, overrideIndex) => {
      if (override.index >= cycle.period) {
        context.addIssue({
          code: 'custom',
          message: `Cycle index must be less than period (${cycle.period}).`,
          path: ['overrides', overrideIndex, 'index'],
        });
      }
      if (seen.has(override.index)) {
        context.addIssue({
          code: 'custom',
          message: `Cycle index ${override.index} must be unique.`,
          path: ['overrides', overrideIndex, 'index'],
        });
      }
      seen.add(override.index);
    });
  })
  .describe('Sparse repeating line-style cycle.');

export const PatternPaintSchema = z
  .object({
    kind: z.literal('pattern').describe('Discriminator for pattern paint.'),
    shape: PatternShapeNameSchema.describe(
      'Pattern motif provider name. Built-ins are `lines`, `dots`, and `grid`; custom names must be registered via CompileOptions.patterns.',
    ),
    color: PatternLineStyleSchema.shape.color.describe('Motif color; any CSS color, defaults to `currentColor`'),
    background: CssColorSchema.optional().describe('Tile background fill; omitted = transparent'),
    size: PositiveNumberSchema.optional().describe(
      'Base motif size or spacing in user units; the definition may emit a different final tile size. Defaults to the definition value or 8.',
    ),
    lineWidth: PatternLineStyleSchema.shape.lineWidth.describe(
      'Line / grid stroke width; for dots, drives the dot radius. Default 1 (dots default to size/5)',
    ),
    dashed: PatternLineStyleSchema.shape.dashed.describe(
      'Dashed line-motif preset. Explicit `dashPattern` takes precedence.',
    ),
    dotted: PatternLineStyleSchema.shape.dotted.describe(
      'Dotted line-motif preset. Explicit `dashPattern` and `dashed` take precedence.',
    ),
    dashPattern: PatternLineStyleSchema.shape.dashPattern.describe(
      'Explicit line-motif dash pattern; overrides `dashed` and `dotted`.',
    ),
    dashOffset: PatternLineStyleSchema.shape.dashOffset.describe('Line-motif dash offset in user units.'),
    lineCap: PatternLineStyleSchema.shape.lineCap.describe('Line-motif stroke endpoint cap.'),
    lineJoin: PatternLineStyleSchema.shape.lineJoin.describe('Line-motif stroke corner join.'),
    horizontalStyle: PatternLineStyleSchema.optional().describe(
      'Partial line-style override for horizontal grid motifs.',
    ),
    verticalStyle: PatternLineStyleSchema.optional().describe('Partial line-style override for vertical grid motifs.'),
    lineStyleCycle: PatternLineStyleCycleSchema.optional().describe(
      'Sparse repeating style cycle for adjacent line motifs.',
    ),
    rotation: AngleDegreesSchema.optional().describe('Rotate the whole pattern, in degrees'),
  })
  .describe('Pattern paint server (hatching / dots / grid)');

export const ImagePaintSchema = z
  .object({
    kind: z.literal('image').describe('Discriminator for image paint.'),
    href: NonBlankStringSchema.describe('Image URL (http(s) or data URI)'),
    fit: z
      .enum(ImageFit)
      .optional()
      .describe('How the image maps to the shape: `fill` (stretch) / `contain` / `cover`. Default `cover`'),
  })
  .describe('Image paint server (fills the shape with an image)');

export const PaintSchema = z
  .discriminatedUnion('kind', [
    LinearGradientPaintSchema,
    RadialGradientPaintSchema,
    ConicGradientPaintSchema,
    PatternPaintSchema,
    ImagePaintSchema,
  ])
  .describe('Paint server spec: gradient / pattern / image. Solid color stays a plain string on `fill` / `stroke`.');
