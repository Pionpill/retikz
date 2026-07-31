import type { FlexLayoutInput, IRFlexLayout } from './types';

import { FlexLayoutSchema } from './schema';

/** 校验并创建持久化的 Standard FlexLayout composite */
export const createFlexLayout = (input: FlexLayoutInput): IRFlexLayout =>
  FlexLayoutSchema.parse({
    namespace: 'standard',
    type: 'flexLayout',
    ...input,
  });
