import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import * as RibbonExports from '../../src/ribbon';
import { RibbonPathSchema, RibbonWidthProfile, RibbonWidthProfileNameSchema } from '../../src/ribbon';

describe('Standard Ribbon schema', () => {
  it('stores ribbon options under kindOptions on a complete Path subject', () => {
    const result = RibbonPathSchema.safeParse({
      type: 'path',
      kind: 'ribbon',
      kindOptions: { width: 10 },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    });

    expect(result.success).toBe(true);
  });

  it('exports only the canonical Ribbon options schema name', () => {
    expect(RibbonExports).toHaveProperty('RibbonPathOptionsSchema');
    expect(RibbonExports).not.toHaveProperty('PathRibbonOptionsSchema');
  });

  it('hints the built-in width profile while preserving custom provider names', () => {
    expect(z.toJSONSchema(RibbonWidthProfileNameSchema)).toMatchObject({
      anyOf: [
        { type: 'string', enum: Object.values(RibbonWidthProfile) },
        { type: 'string', minLength: 1 },
      ],
    });
    expect(RibbonWidthProfileNameSchema.parse(RibbonWidthProfile.Bulge)).toBe(RibbonWidthProfile.Bulge);
    expect(RibbonWidthProfileNameSchema.parse('custom.profile')).toBe('custom.profile');
    expect(() => RibbonWidthProfileNameSchema.parse('   ')).toThrow();
  });
});
