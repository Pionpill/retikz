import { z } from 'zod';

import { AngleDegreesSchema, NormalizedFractionSchema } from '../scalar';
import { CssColorSchema, OpacitySchema } from '../style';
import { ImageFit } from './constants';

export const GradientStopSchema = z
  .object({
    offset: NormalizedFractionSchema.describe('Stop position along the gradient axis.'),
    color: CssColorSchema.describe('CSS color for this stop.'),
    opacity: OpacitySchema.optional().describe('Stop opacity. Omitted fields are fully opaque.'),
  })
  .describe('A single gradient color stop');

export const LinearGradientPaintSpecSchema = z
  .object({
    kind: z.literal('linearGradient').describe('Discriminator for linear gradient paint.'),
    stops: z.array(GradientStopSchema).min(2).describe('Gradient stops, at least 2'),
    angle: AngleDegreesSchema.optional().describe(
      'Gradient direction angle in degrees. Omitted fields use the paint backend default.',
    ),
  })
  .describe('Linear gradient paint server');

export const RadialGradientPaintSpecSchema = z
  .object({
    kind: z.literal('radialGradient').describe('Discriminator for radial gradient paint.'),
    stops: z.array(GradientStopSchema).min(2).describe('Gradient stops, at least 2'),
    center: z
      .tuple([z.number(), z.number()])
      .optional()
      .describe('Center in object-bounding-box coordinates. Omitted fields use [0.5, 0.5].'),
    radius: z.number().positive().optional().describe('Radius in object-bounding-box units. Omitted fields use 0.5.'),
  })
  .describe('Radial gradient paint server');

export const ConicGradientPaintSpecSchema = z
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

export const PatternPaintSpecSchema = z
  .object({
    kind: z.literal('pattern').describe('Discriminator for pattern paint.'),
    shape: z
      .string()
      .min(1)
      .describe(
        'Pattern motif provider name. Built-ins are `lines`, `dots`, and `grid`; custom names must be registered via CompileOptions.patterns.',
      ),
    color: CssColorSchema.optional().describe('Motif color; any CSS color, defaults to `currentColor`'),
    background: CssColorSchema.optional().describe('Tile background fill; omitted = transparent'),
    size: z.number().positive().optional().describe('Tile period in user units (line gap / dot spacing); default 8'),
    lineWidth: z
      .number()
      .positive()
      .optional()
      .describe('Line / grid stroke width; for dots, drives the dot radius. Default 1 (dots default to size/5)'),
    rotation: AngleDegreesSchema.optional().describe('Rotate the whole pattern, in degrees'),
  })
  .describe('Pattern paint server (hatching / dots / grid)');

export const ImagePaintSpecSchema = z
  .object({
    kind: z.literal('image').describe('Discriminator for image paint.'),
    href: z.string().min(1).describe('Image URL (http(s) or data URI)'),
    fit: z
      .enum(ImageFit)
      .optional()
      .describe('How the image maps to the shape: `fill` (stretch) / `contain` / `cover`. Default `cover`'),
  })
  .describe('Image paint server (fills the shape with an image)');

export const PaintSpecSchema = z
  .discriminatedUnion('kind', [
    LinearGradientPaintSpecSchema,
    RadialGradientPaintSpecSchema,
    ConicGradientPaintSpecSchema,
    PatternPaintSpecSchema,
    ImagePaintSpecSchema,
  ])
  .describe('Paint server spec: gradient / pattern / image. Solid color stays a plain string on `fill` / `stroke`.');
