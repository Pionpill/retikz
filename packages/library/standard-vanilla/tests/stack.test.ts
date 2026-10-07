import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { normalizeScene, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { StandardInputEmbedAdapters } from '../src';
import { stack, array } from '../src/collection';

it('三入口及嵌套内容自动装配依赖，源输入保持稀疏', () => {
  for (const child of [
    stack({ items: [{ id: 'top', content: array({ items: ['A'] }) }] }),
    stack({ data: [{ a: [1] }] }),
    stack({ skeleton: { labels: ['A', 'B'] } }),
  ]) {
    const normalized = normalizeScene(scene({ children: [child] }), { adapters: StandardInputEmbedAdapters });
    const result = compileToScene(
      normalized.ir,
      resolveCoreProviderDependencies({ contributions: normalized.contributions }),
    );
    expect(result.spatialHandles.entries.filter(entry => entry.role === 'container').length).toBeGreaterThan(0);
    expect(normalized.ir.children[0]).not.toHaveProperty('padding');
    expect(result.scene.primitives.length).toBeGreaterThan(0);
  }
});
it('直接IR与Vanilla保持相同的开放框及单格空间', () => {
  const input = {
    items: [{ id: 'a' }, { id: 'b' }],
    layout: { width: 20, height: 16, direction: 'left' as const },
    border: { style: { dashPattern: [3, 2] } },
    padding: 5,
  };
  const normalized = normalizeScene(scene({ children: [stack(input)] }), { adapters: StandardInputEmbedAdapters });
  const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });
  const actual = compileToScene(normalized.ir, options);
  const expected = compileToScene(
    { type: 'scene', version: 1, children: [{ namespace: 'standard', type: 'stack', ...input }] },
    options,
  );
  expect(actual.scene).toEqual(expected.scene);
  expect(actual.spatialHandles).toEqual(expected.spatialHandles);
});
