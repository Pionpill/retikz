import { describe, expect, it } from 'vitest';

import { ScatterChartPropertiesSchema } from '../../src/point/scatter';

describe('Chart 注册表支持的开放字符串 schema', () => {
  it('重用 Core 形状词汇来表示常数点属性', () => {
    expect(ScatterChartPropertiesSchema.parse({ shape: 'custom.glyph' })).toEqual({ shape: 'custom.glyph' });
    expect(() => ScatterChartPropertiesSchema.parse({ shape: '   ' })).toThrow();
  });
});
