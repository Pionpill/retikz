import { describe, expect, it } from 'vitest';

import { resolveEffectivePath, resolveScopeDefaults } from '../../src/resolve/style';
import { resolvePathWithBuiltinProviders } from './path-helper';

describe('path host style', () => {
  it.each([
    ['cascade-only', undefined, { style: { color: 'gold' } }, 'gold'],
    ['pathDefault-only', undefined, { path: { style: { color: 'purple' } } }, 'purple'],
    [
      'instance override',
      { color: 'teal' },
      { style: { color: 'gold' }, path: { style: { color: 'purple' } } },
      'teal',
    ],
  ])('keeps %s color effective until the selected path consumes it', (_, style, defaults, color) => {
    const resolved = resolveEffectivePath(
      { type: 'path', kind: 'custom', children: [], style },
      resolveScopeDefaults({ type: 'scope', children: [], defaults }),
    );
    expect(resolved.style?.color).toBe(color);
    expect(resolved.style?.stroke).toBeUndefined();
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
        {
          scopeDefaults: resolveScopeDefaults({
            type: 'scope',
            children: [],
            defaults: { path: { style: { fill: 'red' } } },
          }),
        },
      ),
    ).toThrow(/label\.interrupt.*filled stroke path/i);
  });
});
