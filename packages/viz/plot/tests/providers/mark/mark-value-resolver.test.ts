import { DataFieldType } from '@retikz/data';
import { describe, expect, it } from 'vitest';

import { createMarkValueResolver } from '../../../src/providers';
import type { IRPlotChannel } from '../../../src/schemas';

describe('createMarkValueResolver', () => {
  it('未声明编码时不创建字段解析器', () => {
    expect(createMarkValueResolver(undefined, [], { channelName: 'weight', parse: value => value })).toBeUndefined();
  });

  it('解析每行字段标记值', () => {
    const value: IRPlotChannel = 'weight';
    const resolver = createMarkValueResolver<number>(value, [{ name: 'weight', type: DataFieldType.Continuous }], {
      channelName: 'weight',
      expectedFieldType: DataFieldType.Continuous,
      parse: raw => (typeof raw === 'number' ? raw : undefined),
    });

    expect(resolver?.field).toBe('weight');
    expect(resolver?.fieldType).toBe(DataFieldType.Continuous);
    expect(resolver?.resolver({ weight: 9 })).toBe(9);
    expect(resolver?.resolver({ weight: 'bad' })).toBeUndefined();
  });

  it('拒绝意外字段类型', () => {
    const value: IRPlotChannel = 'group';

    expect(() =>
      createMarkValueResolver<number>(value, [{ name: 'group', type: DataFieldType.Categorical }], {
        channelName: 'weight',
        expectedFieldType: DataFieldType.Continuous,
        parse: raw => (typeof raw === 'number' ? raw : undefined),
      }),
    ).toThrow(/weight requires a continuous field/i);
  });
});
