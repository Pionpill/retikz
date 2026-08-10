import type { ZodType } from 'zod';

import { describe, expect, it } from 'vitest';

import * as layout from '../../src';

describe('LayoutGapSchema', () => {
  it('从 Layout 根入口公开非负布局间距原子', () => {
    const schema = (layout as Record<string, unknown>).LayoutGapSchema as ZodType<number> | undefined;

    expect(schema).toBeDefined();
    expect(schema?.parse(0)).toBe(0);
    expect(schema?.parse(6)).toBe(6);
    expect(schema?.safeParse(-1).success).toBe(false);
  });
});
