import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { StandardInputEmbedAdapters } from '../src';
import { list, map } from '../src/container';

describe('List / Map provider assembly', () => {
  it('keeps List content width in typed Vanilla inputs and compiled cell allocations', () => {
    const normalized = normalizeScene(
      scene({ children: [list({ items: [{ content: 'A', layout: { width: 'content' } }, 'longer'] })] }),
      { adapters: StandardInputEmbedAdapters },
    );
    const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });
    const result = compileToScene(normalized.ir, options);
    expect(normalized.ir.children[0]).toMatchObject({ items: [{ layout: { width: 'content' } }, 'longer'] });
    expect(result.scene.primitives.length).toBeGreaterThan(0);
  });
  it('compiles nested lists inside clipped map cells through the public adapter catalog', () => {
    const input = scene({
      children: [
        map({
          id: 'map',
          layout: { overflow: 'clip', key: { width: 60 }, value: { width: 100 } },
          style: { key: { fill: 'blue' }, value: { fillOpacity: 0.2 } },
          entries: [
            {
              key: 'key',
              value: {
                content: list({ items: [{ content: 'value' }] }),
              },
            },
          ],
        }),
      ],
    });
    const normalized = normalizeScene(input, { adapters: StandardInputEmbedAdapters });
    const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });
    const result = compileToScene(normalized.ir, options);
    expect(normalized.ir.children[0]).toMatchObject({
      layout: { key: { width: 60 }, value: { width: 100 } },
      style: { key: { fill: 'blue' }, value: { fillOpacity: 0.2 } },
    });
    expect(JSON.stringify(normalized.ir)).toContain('"key":"key"');
    expect(result.scene.resources?.some(resource => resource.kind === 'clip')).toBe(true);
    expect(JSON.stringify(normalized.ir)).not.toContain('providerDependencies');
    expect(JSON.stringify(normalized.ir)).not.toContain('authoring-map');
  });
});

it('assembles both data definitions and clipping from either root adapter', () => {
  for (const child of [
    map({ data: { values: [1, { id: 'a' }] }, layout: { width: 30 } }),
    list({ data: [{ values: [1, 1] }], layout: { height: 20 } }),
  ]) {
    const normalized = normalizeScene(scene({ children: [child] }), { adapters: StandardInputEmbedAdapters });
    const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });
    const result = compileToScene(normalized.ir, options);
    expect(result.scene.primitives.length).toBeGreaterThan(0);
    expect(result.scene.resources?.some(resource => resource.kind === 'clip')).toBe(true);
    expect(normalized.ir.children[0]).toHaveProperty('data');
    expect(normalized.ir.children[0]).not.toHaveProperty('entries');
    expect(normalized.ir.children[0]).not.toHaveProperty('items');
  }
});
