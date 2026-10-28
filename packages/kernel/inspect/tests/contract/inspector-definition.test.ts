import { describe, expect, it } from 'vitest';
import { strictObject, string } from 'zod';

import { defineInspector } from '../../src';

describe('Inspector 定义', () => {
  it('保留冻结的独立所属模块和期权契约', () => {
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
