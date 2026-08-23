import { CssColorSchema } from '@retikz/core';
import { scaleThreshold as d3ScaleThreshold } from 'd3-scale';
import { z } from 'zod';

import { defineCellVisualScale } from '../../contract';
import { RetikzTableError } from '../../error';

const thresholdsSchema = z.array(z.number()).superRefine((thresholds, context) => {
  thresholds.forEach((threshold, index) => {
    if (index > 0 && threshold <= thresholds[index - 1]) {
      context.addIssue({ code: 'custom', path: [index], message: 'thresholds must be strictly increasing' });
    }
  });
});

const rangeSchema = z.array(CssColorSchema).min(1);

/** 阈值分档颜色 scale */
export const THRESHOLD_COLOR_CELL_VISUAL_SCALE = defineCellVisualScale({
  name: 'threshold-color',
  optionsSchema: z.strictObject({
    thresholds: thresholdsSchema,
    range: rangeSchema.optional(),
  }),
  resolve: (options, values, context) => {
    values.forEach(value => {
      if (typeof value !== 'number') throw new RetikzTableError('threshold-color selected values must be numbers');
    });
    const range = [...(options.range ?? context.categoricalColors.slice(0, options.thresholds.length + 1))];
    if (range.length !== options.thresholds.length + 1) {
      throw new RetikzTableError(`threshold-color range must contain ${options.thresholds.length + 1} colors`);
    }
    const domain = [...options.thresholds];
    const scale = d3ScaleThreshold<number, string>().domain(domain).range(range);
    return {
      of: value => {
        if (typeof value !== 'number') throw new RetikzTableError('threshold-color values must be numbers');
        return scale(value);
      },
      legendForm: 'swatch',
      domain,
      range,
      edges: [...domain],
    };
  },
});
