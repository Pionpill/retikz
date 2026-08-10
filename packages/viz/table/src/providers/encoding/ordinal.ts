import { CssColorSchema } from '@retikz/core';
import { ScalarValueSchema } from '@retikz/data';
import { NonBlankStringSchema } from '@retikz/foundation';
import { z } from 'zod';

import { defineCellVisualScale } from '../../contract';

const NonNullScalarSchema = ScalarValueSchema.refine(value => value !== null, {
  message: 'ordinal domain values must not be null',
});

const uniqueDomainSchema = z
  .array(NonNullScalarSchema)
  .min(1)
  .superRefine((domain, context) => {
    const seen = new Set<unknown>();
    domain.forEach((value, index) => {
      if (seen.has(value))
        context.addIssue({ code: 'custom', path: [index], message: 'duplicate ordinal domain value' });
      seen.add(value);
    });
  });

const colorSchema = CssColorSchema.refine(value => NonBlankStringSchema.safeParse(value).success, {
  message: 'color must not be blank',
});
const colorRangeSchema = z.array(colorSchema).min(1);

/** 首次出现顺序的分类颜色 scale */
export const ORDINAL_COLOR_CELL_VISUAL_SCALE = defineCellVisualScale({
  name: 'ordinal-color',
  optionsSchema: z.strictObject({
    domain: uniqueDomainSchema.optional(),
    range: colorRangeSchema.optional(),
  }),
  resolve: (options, values, context) => {
    const domain =
      options.domain === undefined ? [...new Set(values.filter(value => value !== null))] : [...options.domain];
    if (domain.length === 0) return undefined;
    const availableRange = options.range ?? context.categoricalColors;
    if (availableRange.length < domain.length) {
      throw new Error(`ordinal-color range requires at least ${domain.length} colors`);
    }
    const range = availableRange.slice(0, domain.length);
    const colors = new Map(domain.map((value, index) => [value, range[index]]));
    return {
      of: value => (value === null ? undefined : colors.get(value)),
      legendForm: 'swatch',
      domain,
      range,
    };
  },
});
