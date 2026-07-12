import { describe, expect, it } from 'vitest';

import { formatIR } from '../../src/modules/docs/components/component-preview';

describe('formatIR', () => {
  it('格式化后保持 JSON 值不变', () => {
    const value = {
      labels: ['A  B', "quote ' and slash \\", 0, true, null],
      nested: [{ position: [0, 0] }],
    };

    const formatted = formatIR(value);

    expect(JSON.parse(formatted)).toEqual(value);
    expect(formatted).toContain('"position": [0, 0]');
  });
});
