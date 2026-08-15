import { NonNegativeNumberSchema } from '@retikz/foundation';
import { z } from 'zod';

import { defineRibbonWidthProfile } from './profile-define';

/** Standard Ribbon 内置 bulge profile */
export const BulgeRibbonWidthProfileDefinition = defineRibbonWidthProfile({
  name: 'bulge',
  paramsSchema: z.strictObject({ base: NonNegativeNumberSchema, peak: NonNegativeNumberSchema }),
  widthAt: ({ offset, params }) => {
    const t = Math.sin(Math.PI * offset);
    return params.base + (params.peak - params.base) * t;
  },
});

/** Standard Ribbon 默认 profile 集合 */
export const BUILTIN_RIBBON_WIDTH_PROFILES = [BulgeRibbonWidthProfileDefinition] as const;
