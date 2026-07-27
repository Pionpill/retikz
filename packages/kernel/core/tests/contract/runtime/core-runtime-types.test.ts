import type { RuntimeIdentity } from '@retikz/runtime';

import { describe, expectTypeOf, it } from 'vitest';

import type { CoreChange } from '../../../src';

import { CoreOwnerDefinition } from '../../../src';

describe('Core Runtime contract types', () => {
  it('保留 owner Snapshot 与 change hint 的精确类型', () => {
    expectTypeOf(CoreOwnerDefinition.key).toEqualTypeOf<string>();
    expectTypeOf<CoreChange['kind']>().toEqualTypeOf<'add' | 'update' | 'remove' | 'move'>();
    expectTypeOf<Extract<CoreChange, { kind: 'add' }>['identity']>().toEqualTypeOf<RuntimeIdentity>();
  });
});
