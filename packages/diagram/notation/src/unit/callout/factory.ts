import type { CalloutInput, IRCallout } from './types';

import { NOTATION_NAMESPACE } from '../shared';
import { CalloutSchema } from './schema';

/** 校验并创建 canonical Callout IR */
export const createCallout = (input: CalloutInput): IRCallout =>
  CalloutSchema.parse({
    namespace: NOTATION_NAMESPACE,
    type: 'callout',
    ...input,
  });
