import type { FlexLayoutInput, IRFlexLayout } from './types';

import { LAYOUT_NAMESPACE } from '../../shared';
import { FlexLayoutSchema } from './schema';

/** 校验并创建持久化的 Layout FlexLayout composite */
export const createFlexLayout = (input: FlexLayoutInput): IRFlexLayout =>
  FlexLayoutSchema.parse({
    namespace: LAYOUT_NAMESPACE,
    type: 'flexLayout',
    ...input,
  });
