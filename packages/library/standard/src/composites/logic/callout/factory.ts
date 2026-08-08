import type { CalloutInput, IRCallout } from './types';

import { STANDARD_NAMESPACE } from '../shared';
import { CalloutSchema } from './schema';

/** 校验并创建 canonical Callout IR */
export const createCallout = (input: CalloutInput): IRCallout =>
  CalloutSchema.parse({
    namespace: STANDARD_NAMESPACE,
    type: 'callout',
    ...input,
  });
