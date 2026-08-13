import { definePathGenerator, TargetSchema } from '@retikz/core';
import { z } from 'zod';

import { StandardPathGeneratorName } from './constants';

/** Standard 提供的 Parabola 路径生成器定义 */
export const ParabolaPathGeneratorDefinition = definePathGenerator({
  name: StandardPathGeneratorName.Parabola,
  paramsSchema: z.strictObject({ control: TargetSchema }),
  targetParams: ['control'],
  generate: ({ to, resolvedTargets }) => {
    if (to === undefined) throw new Error('path generator "parabola" requires step.to.');
    return [{ kind: 'quad', control: resolvedTargets.control, to }];
  },
});
