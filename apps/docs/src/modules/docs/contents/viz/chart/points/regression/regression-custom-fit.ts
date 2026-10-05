import { defineRegressionImplementation, defineRegression, RetikzDataError } from '@retikz/data';
import { literal, number, strictObject } from 'zod';

/** 固定斜率，通过最小二乘求解截距 */
export const fixedSlopeFit = defineRegression({
  schema: strictObject({
    kind: literal('fixed-slope'),
    slope: number().default(1),
  }),
});

/** fixedSlopeFit的本地计算实现 */
export const fixedSlopeFitImplementation = defineRegressionImplementation({
  definition: fixedSlopeFit,
  fit: (pairs, { slope }) => {
    if (pairs.length === 0) throw new RetikzDataError('fixed-slope requires at least one observation');
    const intercept = pairs.reduce((sum, pair) => sum + pair.y - slope * pair.x, 0) / pairs.length;
    return { predict: x => intercept + slope * x };
  },
});
