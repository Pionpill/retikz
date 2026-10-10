import { defineRegression, defineRegressionImplementation, RetikzDataError } from '@retikz/data';
import { z } from 'zod';

/** 过原点直线仅声明方法名，不约束预测范围 */
export const throughOrigin = defineRegression({
  schema: z.strictObject({ kind: z.literal('through-origin') }),
});

/** 最小化原空间平方误差，拟合 y = slope * x */
export const throughOriginImplementation = defineRegressionImplementation({
  definition: throughOrigin,
  fit: pairs => {
    const sumXX = pairs.reduce((sum, pair) => sum + pair.x * pair.x, 0);
    if (pairs.length === 0 || !Number.isFinite(sumXX) || sumXX <= 0) {
      throw new RetikzDataError('through-origin requires observations with nonzero x');
    }
    const slope = pairs.reduce((sum, pair) => sum + pair.x * pair.y, 0) / sumXX;
    return { predict: x => slope * x };
  },
});
