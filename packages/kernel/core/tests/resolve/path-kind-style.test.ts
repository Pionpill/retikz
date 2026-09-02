import { describe, expect, it } from 'vitest';

import { resolveEffectivePath } from '../../src/resolve/style/path';
import { resolvePathWithBuiltinProviders } from './path-helper';

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

  it('uses cascaded fill before rejecting a requested label interruption', () => {
    expect(() =>
      resolvePathWithBuiltinProviders(
        {
          type: 'path',
          label: { text: 'filled', interrupt: true },
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
        { styleStack: [{ cascade: {}, pathDefault: { fill: 'red' } }] },
      ),
    ).toThrow(/label\.interrupt.*filled stroke path/i);
  });
});
