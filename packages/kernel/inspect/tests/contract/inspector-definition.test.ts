import { describe, expect, it } from 'vitest';
import { strictObject, string } from 'zod';

import { defineInspector } from '../../src';

describe('Inspector definition', () => {
  it('preserves the frozen independent owner and option contracts', () => {
    const definition = defineInspector({
      namespace: 'test',
      type: 'bounds',
      owner: { kind: 'composite', namespace: 'demo', type: 'box' },
      optionsSchema: strictObject({ color: string().optional() }),
      resolveOptions: value => ({
        color: value.color ?? '#000000',
      }),
      inspect: () => [],
    });

    expect(definition).toMatchObject({ namespace: 'test', type: 'bounds' });
    expect(Object.isFrozen(definition)).toBe(true);
  });
});
