import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { StandardInputEmbedAdapters } from '../src';
import { array, map } from '../src/collection';

describe('Array / Map provider assembly', () => {
  it('keeps object text display in Array and Map data inputs', () => {
    for (const child of [
      array({ data: [{ value: 1 }], dataExpand: ['array'] }),
      map({ data: { item: { value: 1 } }, dataExpand: ['array'] }),
    ]) {
      const normalized = normalizeScene(scene({ children: [child] }), { adapters: StandardInputEmbedAdapters });
      const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });
      const result = compileToScene(normalized.ir, options);
      expect(normalized.ir.children[0]).toMatchObject({ dataExpand: ['array'] });
      expect(JSON.stringify(result.scene.primitives)).toContain('value');
    }
  });
  it('keeps Array content width in typed Vanilla inputs and compiled cell allocations', () => {
    const normalized = normalizeScene(
      scene({ children: [array({ items: [{ content: 'A', layout: { width: 'content' } }, 'longer'] })] }),
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
                content: array({ items: [{ content: 'value' }] }),
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
    array({ data: [{ values: [1, 1] }], layout: { height: 20 } }),
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

it('骨架与空单元格通过公开 adapter 装配裁切依赖并保留输入', () => {
  for (const child of [
    array({ skeleton: { count: 2 }, layout: { width: 30 } }),
    map({ skeleton: { keys: ['k'] }, layout: { height: 20 } }),
    array({ items: [{}] }),
  ]) {
    const normalized = normalizeScene(scene({ children: [child] }), { adapters: StandardInputEmbedAdapters });
    const result = compileToScene(
      normalized.ir,
      resolveCoreProviderDependencies({ contributions: normalized.contributions }),
    );
    expect(normalized.ir.children[0]).toMatchObject(child.props);
    expect(
      result.spatialHandles.entries.find(entry => entry.role === 'container')?.geometry.bounds.width,
    ).toBeGreaterThan(0);
  }
});
