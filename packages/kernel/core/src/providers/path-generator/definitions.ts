import { z } from 'zod';

import type { PathGeneratorDefinition } from '../../contract';

import { definePathGenerator } from '../../contract';
import { TargetSchema } from '../../schemas';
import { defineBuiltinProviderArray } from '../registry/index';

export type BuiltinPathGeneratorName = 'parabola';

/** 二次贝塞尔曲线 generator：`control` 走 Target 解析，`to` 作为曲线终点 */
const parabola = definePathGenerator({
  name: 'parabola',
  paramsSchema: z.strictObject({ control: TargetSchema }),
  targetParams: ['control'],
  generate: ({ to, resolvedTargets }) => {
    if (to === undefined) {
      throw new Error('path generator "parabola" requires step.to.');
    }
    return [{ kind: 'quad', control: resolvedTargets.control, to }];
  },
});

/** 内置 path generator 注册项 */
export const BUILTIN_PATH_GENERATORS = defineBuiltinProviderArray<PathGeneratorDefinition, BuiltinPathGeneratorName>([
  parabola,
]);
