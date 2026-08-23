import { describe, expect, it } from 'vitest';

import { ScatterChartPropertiesSchema } from '../../src/point/scatter';

describe('Chart registry-backed open string schemas', () => {
  it('reuses the Core shape vocabulary for constant point properties', () => {
    expect(ScatterChartPropertiesSchema.parse({ shape: 'custom.glyph' })).toEqual({ shape: 'custom.glyph' });
    expect(() => ScatterChartPropertiesSchema.parse({ shape: '   ' })).toThrow();
  });
});
