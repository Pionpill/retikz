import type { AssertEqual, OpenString, ValueOf } from '@retikz/foundation';

import { describe, expect, expectTypeOf, it } from 'vitest';

describe('foundation type utilities', () => {
  it('ValueOf derives only object values', () => {
    expectTypeOf<ValueOf<{ Alpha: 'a'; Beta: 2 }>>().toEqualTypeOf<'a' | 2>();
  });

  it('AssertEqual requires bidirectional assignability', () => {
    expectTypeOf<AssertEqual<'alpha', 'alpha'>>().toEqualTypeOf<true>();
    expectTypeOf<AssertEqual<'alpha', string>>().toEqualTypeOf<false>();
    expectTypeOf<AssertEqual<string, 'alpha'>>().toEqualTypeOf<false>();
    expectTypeOf<AssertEqual<'alpha' | 'beta', string>>().toEqualTypeOf<false>();
    expectTypeOf<
      AssertEqual<{ kind: 'alpha' } & { value: number }, { kind: 'alpha'; value: number }>
    >().toEqualTypeOf<true>();
  });

  it('OpenString accepts known literals and custom strings', () => {
    const builtIn: OpenString<'alpha'> = 'alpha';
    const custom: OpenString<'alpha'> = 'custom';

    const builtInMatches: AssertEqual<typeof builtIn, OpenString<'alpha'>> = true;
    const customMatches: AssertEqual<typeof custom, OpenString<'alpha'>> = true;

    expectTypeOf(builtIn).toBeString();
    expectTypeOf(custom).toBeString();
    expect(builtInMatches).toBe(true);
    expect(customMatches).toBe(true);

    // @ts-expect-error OpenString rejects non-string values
    const invalid: OpenString<'alpha'> = 1;
    void invalid;
  });
});
