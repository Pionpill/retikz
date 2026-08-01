import { scaleLinear as d3ScaleLinear } from 'd3-scale';
import { z } from 'zod';

import { defineCellVisualScale } from '../../contract';

const domainSchema = z.tuple([z.number(), z.number()]).refine(([start, end]) => start <= end, {
  message: 'sequential-color domain start must be less than or equal to end',
});

const rangeSchema = z.tuple([
  z.string().refine(value => value.trim().length > 0, 'color must not be blank'),
  z.string().refine(value => value.trim().length > 0, 'color must not be blank'),
]);

/** 连续数值颜色 scale */
export const SEQUENTIAL_COLOR_CELL_VISUAL_SCALE = defineCellVisualScale({
  name: 'sequential-color',
  optionsSchema: z.strictObject({
    domain: domainSchema.optional(),
    range: rangeSchema.optional(),
  }),
  resolve: (options, values, context) => {
    const numbers = values.map(value => {
      if (typeof value !== 'number') throw new Error('sequential-color selected values must be numbers');
      return value;
    });
    if (options.domain === undefined && numbers.length === 0) return undefined;
    const domain: [number, number] =
      options.domain === undefined
        ? [Math.min(...numbers), Math.max(...numbers)]
        : [options.domain[0], options.domain[1]];
    const selectedRange = options.range ?? context.sequentialColors;
    const range: [string, string] = [selectedRange[0], selectedRange[1]];
    const scale = d3ScaleLinear<string>().domain(domain).range(range).clamp(true);
    return {
      of: value => {
        if (typeof value !== 'number') throw new Error('sequential-color values must be numbers');
        return scale(value);
      },
      legendForm: 'ramp',
      domain,
      range,
    };
  },
});
