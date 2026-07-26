import { describe, expectTypeOf, it } from 'vitest';

import type { RuntimeOwnerDefinition, RuntimeOwnerToken } from '../../src';

import { createRuntimeOwnerRegistry, defineRuntimeOwner } from '../../src';

describe('runtime owner types', () => {
  it('异构 registry 只动态暴露 token，typed resolve 恢复原 Definition', () => {
    const numberOwner = defineRuntimeOwner<number, number, number, { delta: number }>({
      key: 'number',
      value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
    });
    const stringOwner = defineRuntimeOwner<string, string, string, { append: string }>({
      key: 'string',
      value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
    });
    const registry = createRuntimeOwnerRegistry({ builtins: [numberOwner], custom: [stringOwner] });

    expectTypeOf(registry.resolve(numberOwner)).toEqualTypeOf<typeof numberOwner>();
    expectTypeOf(registry.resolve(stringOwner)).toEqualTypeOf<typeof stringOwner>();
    expectTypeOf(registry.find('number')).toEqualTypeOf<RuntimeOwnerToken | undefined>();
    expectTypeOf(numberOwner).toMatchTypeOf<RuntimeOwnerDefinition<number, number, number, { delta: number }>>();
    expectTypeOf(numberOwner).not.toMatchTypeOf<RuntimeOwnerDefinition<string, string, string, { append: string }>>();
    expectTypeOf(numberOwner).not.toMatchTypeOf<RuntimeOwnerDefinition<string, number, number, { delta: number }>>();
    expectTypeOf(numberOwner).not.toMatchTypeOf<RuntimeOwnerDefinition<number, string, number, { delta: number }>>();
    expectTypeOf(numberOwner).not.toMatchTypeOf<RuntimeOwnerDefinition<number, number, string, { delta: number }>>();
    expectTypeOf(numberOwner).not.toMatchTypeOf<RuntimeOwnerDefinition<number, number, number, { append: string }>>();

    const rejectPlainObject = (): void => {
      // @ts-expect-error plain object 没有 private owner token brand
      createRuntimeOwnerRegistry({ builtins: [{ key: 'forged' }] });
    };
    expectTypeOf(rejectPlainObject).toBeFunction();
  });
});
