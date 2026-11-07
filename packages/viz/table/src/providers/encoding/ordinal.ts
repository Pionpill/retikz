import { CssColorSchema } from '@retikz/core';
import { resolveScale, ScalarValueSchema } from '@retikz/data';
import { array, strictObject } from 'zod';

import { defineCellVisualScale } from '../../contract';
import { RetikzTableError } from '../../error';
import { BuiltinTableCellVisualScale } from '../../schemas';

const NonNullScalarSchema = ScalarValueSchema.refine(value => value !== null, {
  message: 'ordinal domain values must not be null',
});

const uniqueDomainSchema = array(NonNullScalarSchema)
  .min(1)
  .superRefine((domain, context) => {
    const seen = new Set<unknown>();
    domain.forEach((value, index) => {
      if (seen.has(value))
        context.addIssue({ code: 'custom', path: [index], message: 'duplicate ordinal domain value' });
      seen.add(value);
    });
  });

const colorRangeSchema = array(CssColorSchema).min(1);

/** 首次出现顺序的分类颜色 scale */
export const ORDINAL_COLOR_CELL_VISUAL_SCALE = defineCellVisualScale({
  name: BuiltinTableCellVisualScale.OrdinalColor,
  optionsSchema: strictObject({
    domain: uniqueDomainSchema.optional(),
    range: colorRangeSchema.optional(),
  }),
  resolve: (options, values, context) => {
    const domain =
      options.domain === undefined ? [...new Set(values.filter(value => value !== null))] : [...options.domain];
    if (domain.length === 0) return undefined;

    const availableRange = options.range ?? context.categoricalColors;
    if (availableRange === undefined) {
      throw new RetikzTableError('ordinal-color requires a range or categorical Table defaults');
    }

    if (availableRange.length < domain.length) {
      throw new RetikzTableError(`ordinal-color range requires at least ${domain.length} colors`);
    }

    const range = availableRange.slice(0, domain.length);
    const mapping = resolveScale({ type: 'ordinal', domain, range, params: { unknown: 'missing' } }, { values });

    return {
      of: value => {
        const mapped = mapping.map(value);
        return typeof mapped === 'string' ? mapped : undefined;
      },
      legendForm: 'swatch',
      domain,
      range,
    };
  },
});
