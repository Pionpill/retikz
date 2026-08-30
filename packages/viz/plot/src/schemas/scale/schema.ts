import { CssColorSchema } from '@retikz/core';
import {
  createOpenStringSchema,
  NonBlankStringSchema,
  NonNegativeNumberSchema,
  PositiveNumberSchema,
} from '@retikz/foundation';
import {
  array,
  boolean,
  discriminatedUnion,
  literal,
  looseObject,
  number,
  object,
  strictObject,
  string,
  tuple,
  union,
} from 'zod';

import { BUILTIN_SCALE_TYPES, PlotColorScheme, PlotScale } from './constants';

/** Plot scale type：保留内置提示并允许注册自定义Definition key */
export const PlotScaleTypeSchema = createOpenStringSchema(PlotScale).describe(
  'Built-in scale type or a custom registered scale type',
);

export const ColorSchemeNameSchema = createOpenStringSchema(PlotColorScheme).describe(
  'Color scheme name: a built-in scheme (e.g. viridis / rdbu) or a custom name registered via options.colorSchemes. Validated as a non-blank string here; an unknown name fails loud at lowering. Interpolator functions never enter the IR — only the name string',
);

export const CategoryValueSchema = union([string(), number()]).describe(
  'A category value: string or number (the leaf a band / point scale domain element resolves to)',
);

export const DomainPaddingSchema = union([
  NonNegativeNumberSchema,
  strictObject({
    lower: NonNegativeNumberSchema.optional().describe('Padding fraction applied below the lower domain bound'),
    upper: NonNegativeNumberSchema.optional().describe('Padding fraction applied above the upper domain bound'),
  }).superRefine((padding, ctx) => {
    if (padding.lower === undefined && padding.upper === undefined) {
      ctx.addIssue({
        code: 'custom',
        path: [],
        message: 'domainPadding object requires lower or upper',
      });
    }
  }),
]).describe('Position scale domain padding fraction; number applies to both sides, object can target each side');

const ContinuousPositionDomainShape = {
  domainPadding: DomainPaddingSchema.optional().describe(
    'Fractional padding added to the resolved domain. Omitted padding defaults to 0 for inferred and explicit domains',
  ),
  singleValueSpan: PositiveNumberSchema.optional().describe(
    'Fallback domain span used when the resolved domain collapses to a single value',
  ),
} as const;

export const LinearScaleSchema = object({
  type: literal(PlotScale.Linear).describe('Discriminator: continuous linear scale'),
  name: NonBlankStringSchema.describe('Scale name; referenced by coordinate.x / coordinate.y'),
  domain: tuple([number(), number()])
    .optional()
    .describe('[min, max] input extent; omit to infer from the bound dataset fields at lowering'),
  range: tuple([number(), number()])
    .optional()
    .describe('[start, end] output extent in plot-area units; omit to derive from the coordinate extent at lowering'),
  nice: boolean().optional().describe('Round the domain to nice human-readable numbers; default false'),
  clamp: boolean().optional().describe('Clamp out-of-domain inputs to the range ends; default false'),
  ...ContinuousPositionDomainShape,
}).describe('Linear scale: a continuous numeric mapping from domain to range');

export const BandScaleSchema = object({
  type: literal(PlotScale.Band).describe(
    'Discriminator: categorical band scale; each category occupies one equal-width band',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by coordinate.x / coordinate.y'),
  domain: array(CategoryValueSchema)
    .optional()
    .describe('Ordered category list; omit to infer the distinct field values in data-encounter order at lowering'),
  paddingInner: number()
    .min(0)
    .max(1)
    .optional()
    .describe('Gap between adjacent bands as a fraction of step, 0..1; default 0.1'),
  paddingOuter: number()
    .min(0)
    .max(1)
    .optional()
    .describe('Gap before the first and after the last band as a fraction of step, 0..1; default = paddingInner'),
  align: number()
    .min(0)
    .max(1)
    .optional()
    .describe('How outer padding is distributed around the bands, 0..1; default 0.5 (centered)'),
}).describe('Band scale: maps a discrete category set to equal-width bands across the range');

export const PointScaleSchema = object({
  type: literal(PlotScale.Point).describe(
    'Discriminator: categorical point scale; categories land on evenly spaced points (zero bandwidth)',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by coordinate.x / coordinate.y'),
  domain: array(CategoryValueSchema)
    .optional()
    .describe('Ordered category list; omit to infer the distinct field values in data-encounter order at lowering'),
  padding: number().min(0).max(1).optional().describe('Outer padding as a fraction of step, 0..1; default 0.5'),
  align: number().min(0).max(1).optional().describe('How padding is distributed, 0..1; default 0.5 (centered)'),
}).describe('Point scale: degenerate band (zero width) placing categories on evenly spaced positions');

export const OrdinalScaleSchema = object({
  type: literal(PlotScale.Ordinal).describe(
    'Discriminator: ordinal scale mapping a discrete domain to a discrete output range (typically colors)',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by a non-positional channel scale ref'),
  domain: array(CategoryValueSchema)
    .optional()
    .describe('Ordered category list; omit to infer the distinct field values in data-encounter order at lowering'),
  range: array(CssColorSchema)
    .optional()
    .describe(
      'Output values cycled across the domain (e.g. color strings); omit to use a default categorical color scheme',
    ),
}).describe('Ordinal scale: discrete domain to discrete output range (colors); the workhorse for series color');

export const TimeScaleSchema = object({
  type: literal(PlotScale.Time).describe('Discriminator: continuous time scale over epoch-millisecond instants'),
  name: NonBlankStringSchema.describe('Scale name; referenced by coordinate.x / coordinate.y'),
  domain: tuple([number(), number()])
    .optional()
    .describe(
      '[startMs, endMs] epoch-millisecond extent; omit to infer from the bound field timestamps at lowering. Dates never enter the IR — only millisecond numbers',
    ),
  nice: boolean()
    .optional()
    .describe('Round the domain outward to nice time boundaries (day / month / year); default false'),
  clamp: boolean().optional().describe('Clamp out-of-domain instants to the range ends; default false'),
  ...ContinuousPositionDomainShape,
}).describe(
  'Time scale: continuous mapping from time instants (epoch ms) to range; ticks land on human-readable time boundaries',
);

export const LogScaleSchema = object({
  type: literal(PlotScale.Log).describe(
    'Discriminator: continuous logarithmic scale (domain must be strictly positive)',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by coordinate.x / coordinate.y'),
  domain: tuple([number(), number()])
    .optional()
    .describe(
      '[min, max] input extent, both strictly > 0; omit to infer from the positive field values at lowering. Non-positive bounds are rejected at lowering',
    ),
  range: tuple([number(), number()])
    .optional()
    .describe('[start, end] output extent in plot-area units; omit to derive from the coordinate extent at lowering'),
  base: number().gt(1).optional().describe('Logarithm base; default 10'),
  nice: boolean().optional().describe('Round the domain outward to nice powers of the base; default false'),
  clamp: boolean().optional().describe('Clamp out-of-domain inputs to the range ends; default false'),
  ...ContinuousPositionDomainShape,
}).describe(
  'Log scale: continuous logarithmic mapping; valid only on point / line marks (interval / area baseline includes 0)',
);

export const PowScaleSchema = object({
  type: literal(PlotScale.Pow).describe('Discriminator: continuous power scale'),
  name: NonBlankStringSchema.describe('Scale name; referenced by coordinate.x / coordinate.y'),
  domain: tuple([number(), number()])
    .optional()
    .describe(
      '[min, max] input extent; omit to infer from the field values at lowering. A non-integer exponent requires a non-negative domain (rejected at lowering otherwise)',
    ),
  range: tuple([number(), number()])
    .optional()
    .describe('[start, end] output extent in plot-area units; omit to derive from the coordinate extent at lowering'),
  exponent: number().optional().describe('Power exponent; default 2'),
  nice: boolean().optional().describe('Round the domain to nice numbers; default false'),
  clamp: boolean().optional().describe('Clamp out-of-domain inputs to the range ends; default false'),
  ...ContinuousPositionDomainShape,
}).describe('Pow scale: continuous power mapping y = m·x^exponent + b; valid only on point / line marks');

export const SqrtScaleSchema = object({
  type: literal(PlotScale.Sqrt).describe(
    'Discriminator: continuous square-root scale (pow with exponent 0.5; area-perceptual)',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by coordinate.x / coordinate.y or a size channel'),
  domain: tuple([number(), number()])
    .optional()
    .describe(
      '[min, max] input extent, both ≥ 0; omit to infer from the field values at lowering. Negative bounds are rejected at lowering',
    ),
  range: tuple([number(), number()])
    .optional()
    .describe(
      '[start, end] output extent in plot-area units (or px radius for a size channel); omit to derive at lowering',
    ),
  nice: boolean().optional().describe('Round the domain to nice numbers; default false'),
  clamp: boolean().optional().describe('Clamp out-of-domain inputs to the range ends; default false'),
  ...ContinuousPositionDomainShape,
}).describe(
  'Sqrt scale: continuous square-root mapping (area-perceptual); valid only on point / line marks; also the default derivation target for the size channel',
);

export const SymlogScaleSchema = object({
  type: literal(PlotScale.Symlog).describe(
    'Discriminator: continuous symmetric-log scale (linear near zero, logarithmic in the tails; admits zero and negative values)',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by coordinate.x / coordinate.y'),
  domain: tuple([number(), number()])
    .optional()
    .describe(
      '[min, max] input extent; may cross zero or be negative; omit to infer from the field values at lowering',
    ),
  range: tuple([number(), number()])
    .optional()
    .describe('[start, end] output extent in plot-area units; omit to derive from the coordinate extent at lowering'),
  constant: number()
    .gt(0)
    .optional()
    .describe(
      'Width of the linear region around zero (the symlog constant); larger flattens more of the center toward linear; default 1',
    ),
  nice: boolean().optional().describe('Round the domain to nice numbers; default false'),
  clamp: boolean().optional().describe('Clamp out-of-domain inputs to the range ends; default false'),
  ...ContinuousPositionDomainShape,
}).describe(
  'Symlog scale: continuous bi-symmetric-log mapping, linear near zero and logarithmic in the tails, so it handles wide-range data that crosses or includes zero (unlike log); valid only on point / line marks',
);

export const RadialScaleSchema = object({
  type: literal(PlotScale.Radial).describe(
    'Discriminator: continuous radial scale whose output radius is area-true (the square-root mapping that makes encoded area proportional to value)',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by coordinate.x / coordinate.y or a polar radius role'),
  domain: tuple([number(), number()])
    .optional()
    .describe('[min, max] input extent; omit to infer from the field values at lowering'),
  range: tuple([number(), number()])
    .optional()
    .describe(
      '[innerRadius, outerRadius] output extent in plot-area units; omit to derive from the coordinate extent at lowering',
    ),
  nice: boolean().optional().describe('Round the domain to nice numbers; default false'),
  clamp: boolean().optional().describe('Clamp out-of-domain inputs to the range ends; default false'),
  ...ContinuousPositionDomainShape,
}).describe(
  'Radial scale: continuous mapping whose output radius is area-true (encoded area is proportional to value); the natural value scale for polar / rose (Nightingale) charts',
);

export const SequentialColorScaleSchema = object({
  type: literal(PlotScale.Sequential).describe(
    'Discriminator: continuous sequential color scale (monotone quantity to a one-directional color band)',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by a non-positional color channel scale ref'),
  domain: tuple([number(), number()])
    .optional()
    .describe(
      '[min, max] input extent; omit to infer from the bound color field at lowering. Endpoints must be finite; min must be < max (rejected at lowering otherwise); temporal fields use a timestamp extent',
    ),
  scheme: ColorSchemeNameSchema.optional().describe(
    'Named color scheme to interpolate across the domain; a built-in name or a custom one registered via options.colorSchemes; omit to default to viridis at lowering. Overridden by range when both are given',
  ),
  range: tuple([CssColorSchema, CssColorSchema])
    .optional()
    .describe(
      '[low, high] endpoint colors that override scheme; omit to derive endpoints from the named scheme at lowering',
    ),
  nice: boolean().optional().describe('Round the domain to nice human-readable numbers; default false'),
  clamp: boolean().optional().describe('Clamp out-of-domain inputs to the color band ends; default false'),
}).describe(
  'Sequential color scale: a continuous monotone domain mapped to a one-directional color band; the workhorse for continuous / temporal color',
);

export const DivergingColorScaleSchema = object({
  type: literal(PlotScale.Diverging).describe(
    'Discriminator: continuous diverging color scale (a quantity with a meaningful midpoint to a two-sided color band)',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by a non-positional color channel scale ref'),
  domain: tuple([number(), number(), number()])
    .optional()
    .describe(
      '[low, mid, high] input extent around a meaningful midpoint; omit to infer [min, (min+max)/2, max] from the bound field at lowering. Endpoints must be finite; must satisfy low < mid < high (rejected at lowering otherwise)',
    ),
  scheme: ColorSchemeNameSchema.optional().describe(
    'Named diverging color scheme to interpolate around the midpoint; a built-in name or a custom one registered via options.colorSchemes; omit to default to rdbu at lowering. Overridden by range when both are given',
  ),
  range: tuple([CssColorSchema, CssColorSchema, CssColorSchema])
    .optional()
    .describe(
      '[low, mid, high] colors that override scheme; omit to derive the two-sided band from the named scheme at lowering',
    ),
  nice: boolean().optional().describe('Round the domain to nice human-readable numbers; default false'),
  clamp: boolean().optional().describe('Clamp out-of-domain inputs to the color band ends; default false'),
}).describe(
  'Diverging color scale: a continuous domain with a meaningful midpoint mapped to a two-sided color band (distinct hues either side, pale center); for profit / loss or deviation-from-mean quantities',
);

export const QuantizeColorScaleSchema = object({
  type: literal(PlotScale.Quantize).describe(
    'Discriminator: quantize color scale (a continuous domain cut into equal-width bins, each bin a discrete color)',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by a non-positional color channel scale ref'),
  domain: tuple([number(), number()])
    .optional()
    .describe(
      '[min, max] input extent cut into equal-width bins; omit to infer [min, max] from the bound color field at lowering. Endpoints must be finite',
    ),
  count: number()
    .int()
    .min(2)
    .optional()
    .describe(
      'Number of equal-width bins; omit to default to 5 at lowering. When range is given, the bin count is range.length; if count is also given it must equal range.length, otherwise lowering fails loud',
    ),
  scheme: ColorSchemeNameSchema.optional().describe(
    'Named color scheme sampled at count evenly spaced points to produce the discrete bin colors; a built-in name or a custom one registered via options.colorSchemes; omit to default to viridis at lowering. Overridden by range when both are given',
  ),
  range: array(CssColorSchema)
    .min(2)
    .optional()
    .describe('Explicit discrete bin colors that override scheme; the array length is the bin count'),
}).describe(
  'Quantize color scale: a continuous domain cut into equal-width bins, each bin mapped to one discrete color sampled from a scheme or taken from range',
);

export const ThresholdColorScaleSchema = object({
  type: literal(PlotScale.Threshold).describe(
    'Discriminator: threshold color scale (user-defined breakpoints cut the domain into bins, each bin a discrete color)',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by a non-positional color channel scale ref'),
  breakpoints: array(number())
    .min(1)
    .describe(
      'Strictly ascending finite breakpoints cutting the value range into breakpoints.length + 1 bins; required (a threshold scale has no default cut points). Ascending order is enforced at lowering',
    ),
  scheme: ColorSchemeNameSchema.optional().describe(
    'Named color scheme sampled at breakpoints.length + 1 evenly spaced points to produce the discrete bin colors; a built-in name or a custom one registered via options.colorSchemes; omit to default to viridis at lowering. Overridden by range when both are given',
  ),
  range: array(CssColorSchema)
    .min(2)
    .optional()
    .describe(
      'Explicit discrete bin colors that override scheme; length must equal breakpoints.length + 1 (enforced at lowering)',
    ),
}).describe(
  'Threshold color scale: user-defined ascending breakpoints cut the domain into bins, each bin mapped to one discrete color sampled from a scheme or taken from range',
);

export const QuantileColorScaleSchema = object({
  type: literal(PlotScale.Quantile).describe(
    'Discriminator: quantile color scale (the data is cut at quantiles into bins of roughly equal sample count, each bin a discrete color)',
  ),
  name: NonBlankStringSchema.describe('Scale name; referenced by a non-positional color channel scale ref'),
  count: number()
    .int()
    .min(2)
    .optional()
    .describe(
      'Number of quantile bins; omit to default to 5 at lowering. When range is given, the bin count is range.length; if count is also given it must equal range.length, otherwise lowering fails loud',
    ),
  scheme: ColorSchemeNameSchema.optional().describe(
    'Named color scheme sampled at count evenly spaced points to produce the discrete bin colors; a built-in name or a custom one registered via options.colorSchemes; omit to default to viridis at lowering. Overridden by range when both are given',
  ),
  range: array(CssColorSchema)
    .min(2)
    .optional()
    .describe('Explicit discrete bin colors that override scheme; the array length is the bin count'),
}).describe(
  'Quantile color scale: the bound data is cut at quantiles into bins of roughly equal sample count, each bin mapped to one discrete color; the quantile boundaries come from the data, so this scale takes no explicit numeric domain',
);

export const ScaleSchema = discriminatedUnion('type', [
  LinearScaleSchema,
  BandScaleSchema,
  PointScaleSchema,
  OrdinalScaleSchema,
  TimeScaleSchema,
  LogScaleSchema,
  PowScaleSchema,
  SqrtScaleSchema,
  SymlogScaleSchema,
  RadialScaleSchema,
  SequentialColorScaleSchema,
  DivergingColorScaleSchema,
  QuantizeColorScaleSchema,
  ThresholdColorScaleSchema,
  QuantileColorScaleSchema,
]).describe(
  'Scale union: linear / band / point / ordinal / time / log / pow / sqrt / symlog / radial / sequential / diverging / quantize / threshold / quantile',
);

export const CustomScaleSchema = looseObject({
  type: PlotScaleTypeSchema.refine(type => !BUILTIN_SCALE_TYPES.has(type), {
    message: 'custom scale type must not collide with a built-in scale type',
  }).describe(
    'Discriminator: custom scale op type; any non-blank, non-built-in identifier registered through options.scaleDefinitions',
  ),
  name: NonBlankStringSchema.describe(
    'Scale name; referenced by a coordinate role or a non-positional channel scale ref',
  ),
}).describe(
  'Custom scale op: type is any non-built-in identifier plus a name; its config is validated at lowering time against the matching ScaleDefinition supplied via options.scaleDefinitions',
);

export const ScaleOperationSchema = union([ScaleSchema, CustomScaleSchema]).describe(
  'Scale operation union: built-in scale configs plus custom type open config operations validated by a runtime ScaleDefinition at lowering',
);
