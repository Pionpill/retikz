import { defineRuntimeOwner } from '@retikz/runtime';
import type { RuntimeOwnerDefinition } from '@retikz/runtime';

import type { CompositeInputBindings } from '../composite';

/** 与 Core Source 同事务更新的 composite 实例输入 owner */
export const CoreCompositeInputOwnerDefinition: RuntimeOwnerDefinition<
  CompositeInputBindings | undefined,
  CompositeInputBindings | undefined,
  CompositeInputBindings | undefined,
  never
> = defineRuntimeOwner({
  key: '@retikz/core/composite-input',
  value: {
    capture: input => input,
    read: input => input,
    equals: Object.is,
  },
});
