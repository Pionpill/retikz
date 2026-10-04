import type { RuntimeSourceDefinition } from '@retikz/runtime';
import { defineRuntimeSource } from '@retikz/runtime';

import type { IRScene } from '../../schemas';
import { cloneAndFreezeJson, jsonStructuralEquals } from '../../shared/json';
import type { CoreChange } from './types';
import { CORE_SOURCE_KEY } from './types';

/** Core document 的 Runtime owner Definition */
export const CoreSourceDefinition: RuntimeSourceDefinition<
  IRScene,
  Readonly<IRScene>,
  Readonly<IRScene>,
  CoreChange
> = defineRuntimeSource({
  key: CORE_SOURCE_KEY,
  value: {
    capture: input => cloneAndFreezeJson(input, 'CoreSourceDefinition input'),
    read: value => value,
    equals: jsonStructuralEquals,
  },
});
