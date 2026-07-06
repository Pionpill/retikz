import { z } from 'zod';

import type { RibbonWidthProfileDefinition } from '../../contract';

import { defineRibbonWidthProfile } from '../../contract';
import { defineBuiltinProviderArray } from '../registry';

export type BuiltinRibbonWidthProfileName = 'bulge';

/** 中点鼓起 / 收窄的内置宽度 profile。 */
const bulge = defineRibbonWidthProfile({
  name: 'bulge',
  paramsSchema: z.strictObject({
    base: z.number().finite().nonnegative(),
    peak: z.number().finite().nonnegative(),
  }),
  widthAt: ({ offset, params }) => {
    const t = Math.sin(Math.PI * offset);
    return params.base + (params.peak - params.base) * t;
  },
});

/** 内置 ribbon width profile 注册项。 */
export const BUILTIN_RIBBON_WIDTH_PROFILES = defineBuiltinProviderArray<
  RibbonWidthProfileDefinition,
  BuiltinRibbonWidthProfileName
>([bulge]);
