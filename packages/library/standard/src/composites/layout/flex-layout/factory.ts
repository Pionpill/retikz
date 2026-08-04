import type { FlexLayoutInput, IRFlexLayout } from './types';

import { STANDARD_NAMESPACE } from '../../shared';
import { FlexLayoutSchema } from './schema';

/** 校验并创建持久化的 Standard FlexLayout composite */
export const createFlexLayout = (input: FlexLayoutInput): IRFlexLayout =>
  FlexLayoutSchema.parse({
    namespace: STANDARD_NAMESPACE,
    type: 'flexLayout',
    ...input,
  });
