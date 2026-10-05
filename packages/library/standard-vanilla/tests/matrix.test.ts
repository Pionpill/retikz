import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { createProcessingController, normalizeScene, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { StandardInputEmbedAdapters } from '../src';
import { matrix, array, map } from '../src/collection';

it('normalizes nested authoring and resolves providers for each input', () => {
  for (const child of [
    matrix({ skeleton: { rows: 2, columns: 3 } }),
    matrix({ data: [[{ a: [1, 2] }, [3, 4]]] }),
    matrix({ items: [[{ content: array({ items: ['x'] }) }, { content: map({ skeleton: { keys: ['k'] } }) }]] }),
  ]) {
    const normalized = normalizeScene(scene({ children: [child] }), { adapters: StandardInputEmbedAdapters });
    const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });

    expect(compileToScene(normalized.ir, options).scene.primitives.length).toBeGreaterThan(0);
  }
});

it('keeps empty cells JSON-safe when entering retained processing', () => {
  for (const child of [
    matrix({ items: [[{}]] }),
    array({ items: [{}] }),
    map({ entries: [{ key: 'k', value: {} }] }),
  ]) {
    const input = scene({ children: [child] });
    const controller = createProcessingController(input, { adapters: StandardInputEmbedAdapters });

    expect(controller.read().scene.primitives.length).toBeGreaterThan(0);

    controller.dispose();
  }
});
