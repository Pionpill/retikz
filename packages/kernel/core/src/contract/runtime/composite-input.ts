import { defineRuntimeSource } from '@retikz/runtime';
import type { RuntimeSourceDefinition } from '@retikz/runtime';

import type { CompositeInputBindings } from '../composite';

/** 与 Core Source 同事务更新的 composite 实例输入 owner */
export const CoreCompositeInputSourceDefinition: RuntimeSourceDefinition<
  CompositeInputBindings | undefined,
  CompositeInputBindings | undefined,
  CompositeInputBindings | undefined,
  never
> = defineRuntimeSource({
  key: '@retikz/core/composite-input',
  value: {
    capture: input => input,
    read: input => input,
    equals: Object.is,
  },
});
