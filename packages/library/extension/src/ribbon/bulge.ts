import { NonNegativeNumberSchema } from '@retikz/foundation';
import { strictObject } from 'zod';

import { BuiltinRibbonWidthProfile } from './constants';
import { defineRibbonWidthProfile } from './profile-define';

/** Extension Ribbon 内置 bulge profile */
export const BulgeRibbonWidthProfileDefinition = defineRibbonWidthProfile({
  name: BuiltinRibbonWidthProfile.Bulge,
  paramsSchema: strictObject({ base: NonNegativeNumberSchema, peak: NonNegativeNumberSchema }),
  widthAt: ({ offset, params }) => {
    const t = Math.sin(Math.PI * offset);
    return params.base + (params.peak - params.base) * t;
  },
});

/** Extension Ribbon 默认 profile 集合 */
export const BUILTIN_RIBBON_WIDTH_PROFILES = [BulgeRibbonWidthProfileDefinition] as const;
