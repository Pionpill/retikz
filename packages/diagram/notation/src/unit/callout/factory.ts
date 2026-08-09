import type { CalloutInput, IRCallout } from './types';

import { NOTATION_NAMESPACE } from '../shared';
import { CalloutSchema } from './schema';

/** 校验并创建规范 Callout IR */
export const createCallout = (input: CalloutInput): IRCallout =>
  CalloutSchema.parse({
    namespace: NOTATION_NAMESPACE,
    type: 'callout',
    ...input,
  });
