import { jsonStructuralEquals } from '@retikz/core';
import type { IRScene } from '@retikz/core';
import { cloneAndFreezeJson } from '@retikz/foundation';
import { defineRuntimeSource } from '@retikz/runtime';
import type { RuntimeSourceDefinition } from '@retikz/runtime';

import { RetikzReconcilerError, RetikzReconcilerErrorCode } from '../error';
import { CORE_SOURCE_KEY } from '../reconcile';
import type { CoreChange } from '../reconcile';

/** Core document 的 Runtime owner Definition */
export const CoreSourceDefinition: RuntimeSourceDefinition<
  IRScene,
  Readonly<IRScene>,
  Readonly<IRScene>,
  CoreChange
> = defineRuntimeSource({
  key: CORE_SOURCE_KEY,
  value: {
    capture: input => {
      try {
        return cloneAndFreezeJson(input, 'CoreSourceDefinition input');
      } catch (cause) {
        throw new RetikzReconcilerError(RetikzReconcilerErrorCode.Json, 'Core Source input is not JSON-safe', {
          cause,
        });
      }
    },
    read: value => value,
    equals: jsonStructuralEquals,
  },
});
