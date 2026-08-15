import { describe, expect, it } from 'vitest';

import { resolveEffectivePath } from '../../src/resolve/style/path';

describe('path kind host style', () => {
  it.each([
    ['cascade-only', { type: 'path' as const, kind: 'custom', children: [] }, [{ cascade: { color: 'gold' } }], 'gold'],
    [
      'pathDefault-only',
      { type: 'path' as const, kind: 'custom', children: [] },
      [{ cascade: {}, pathDefault: { color: 'purple' } }],
      'purple',
    ],
    [
      'instance override',
      { type: 'path' as const, kind: 'custom', color: 'teal', children: [] },
      [{ cascade: { color: 'gold' }, pathDefault: { color: 'purple' } }],
      'teal',
    ],
  ])('keeps %s color effective until the selected path kind consumes it', (_, path, stack, color) => {
    const resolved = resolveEffectivePath(path, stack);

    expect(resolved.color).toBe(color);
    expect(resolved.stroke).toBeUndefined();
  });
});
