import { describe, expect, it } from 'vitest';

import { mergePathStyle, resolveScopeDefaults } from '../../src/resolve/style';
import { resolvePathWithBuiltinProviders } from './path-helper';

describe('路径宿主样式', () => {
  it.each([
    ['cascade-only', undefined, { style: { color: 'gold' } }, 'gold'],
    ['pathDefault-only', undefined, { path: { style: { color: 'purple' } } }, 'purple'],
    [
      'instance override',
      { color: 'teal' },
      { style: { color: 'gold' }, path: { style: { color: 'purple' } } },
      'teal',
    ],
  ])('保持 %s 颜色有效，直到所选路径消费它', (_, style, defaults, color) => {
    const resolved = mergePathStyle(
      { type: 'path', kind: 'custom', children: [], style },
      resolveScopeDefaults({ type: 'scope', children: [], defaults }),
    );
    expect(resolved.style?.color).toBe(color);
    expect(resolved.style?.stroke).toBeUndefined();
  });

  it('在拒绝请求的标签中断之前使用级联填充', () => {
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
