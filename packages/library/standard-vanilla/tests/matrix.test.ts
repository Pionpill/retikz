import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { createProcessingController, normalizeScene, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { standardInputEmbedAdapters } from '../src';
import { matrix, array, map } from '../src/collection';

it('标准化嵌套编写并解析每个输入的提供者', () => {
  for (const child of [
    matrix({ skeleton: { rows: 2, columns: 3 } }),
    matrix({ data: [[{ a: [1, 2] }, [3, 4]]] }),
    matrix({ items: [[{ content: array({ items: ['x'] }) }, { content: map({ skeleton: { keys: ['k'] } }) }]] }),
  ]) {
    const normalized = normalizeScene(scene({ children: [child] }), { adapters: standardInputEmbedAdapters });
    const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });

    expect(compileToScene(normalized.ir, options).scene.primitives.length).toBeGreaterThan(0);
  }
});

it('进入保留处理时保持空单元格 JSON 安全', () => {
  for (const child of [
    matrix({ items: [[{}]] }),
    array({ items: [{}] }),
    map({ entries: [{ key: 'k', value: {} }] }),
  ]) {
    const input = scene({ children: [child] });
    const controller = createProcessingController(input, { adapters: standardInputEmbedAdapters });

    expect(controller.read().scene.primitives.length).toBeGreaterThan(0);

    controller.dispose();
  }
});
