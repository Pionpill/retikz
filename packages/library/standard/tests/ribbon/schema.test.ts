import { describe, expect, it } from 'vitest';

import * as RibbonExports from '../../src/ribbon';
import { RibbonPathSchema } from '../../src/ribbon';

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
});
