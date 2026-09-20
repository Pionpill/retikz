import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { list, map, StandardInputEmbedAdapters } from '../src';

describe('List / Map provider assembly', () => {
  it('compiles nested lists inside clipped map cells through the public adapter catalog', () => {
    const input = scene({
      children: [
        map('authoring-map', {
          id: 'map',
          layout: { overflow: 'clip', key: { width: 60 }, value: { width: 100 } },
          style: { key: { fill: 'blue' }, value: { fillOpacity: 0.2 } },
          entries: [
            {
              key: 'key',
              value: {
                content: list('nested', { items: [{ content: 'value' }] }),
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
