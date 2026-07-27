import type { RuntimeOwnerDefinition } from '@retikz/runtime';

import { defineRuntimeOwner } from '@retikz/runtime';

import type { IRScene } from '../../schemas';
import type { CoreChange } from './types';

import { cloneAndFreezeJson, jsonStructuralEquals } from '../../shared/json';
import { CORE_OWNER_KEY } from './types';

/** Core document 的 Runtime owner Definition */
export const CoreOwnerDefinition: RuntimeOwnerDefinition<
  IRScene,
  Readonly<IRScene>,
  Readonly<IRScene>,
  CoreChange
> = defineRuntimeOwner({
  key: CORE_OWNER_KEY,
  value: {
    capture: input => cloneAndFreezeJson(input, 'CoreOwnerDefinition input'),
    read: value => value,
    equals: jsonStructuralEquals,
  },
});
