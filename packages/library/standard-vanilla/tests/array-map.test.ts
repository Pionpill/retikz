import { compileToScene, resolveCoreProviderDependencies } from '@retikz/core';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { standardInputEmbedAdapters } from '../src';
import { array, map } from '../src/collection';

describe('Array / Map 提供者集', () => {
  it('在 Array 和 Map 数据输入中保持对象文本显示', () => {
    for (const child of [
      array({ data: [{ value: 1 }], dataExpand: ['array'] }),
      map({ data: { item: { value: 1 } }, dataExpand: ['array'] }),
    ]) {
      const normalized = normalizeScene(scene({ children: [child] }), { adapters: standardInputEmbedAdapters });
      const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });
      const result = compileToScene(normalized.ir, options);

      expect(normalized.ir.children[0]).toMatchObject({ dataExpand: ['array'] });
      expect(JSON.stringify(result.scene.primitives)).toContain('value');
    }
  });

  it('在类型化 Vanilla 输入和编译的单元分配中保留 Array 内容宽度', () => {
    const normalized = normalizeScene(
      scene({ children: [array({ items: [{ content: 'A', layout: { width: 'content' } }, 'longer'] })] }),
      { adapters: standardInputEmbedAdapters },
    );
    const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });
    const result = compileToScene(normalized.ir, options);

    expect(normalized.ir.children[0]).toMatchObject({ items: [{ layout: { width: 'content' } }, 'longer'] });
    expect(result.scene.primitives.length).toBeGreaterThan(0);
  });

  it('通过公开适配器目录编译裁剪 Map 单元格内的嵌套列表', () => {
    const input = scene({
      children: [
        map({
          id: 'map',
          entries: [
            {
              key: 'key',
              value: {
                content: array({ items: [{ content: 'value' }] }),
              },
            },
          ],
          defaultCell: {
            layout: { overflow: 'clip' },
            key: { style: { fill: 'blue' }, layout: { width: 60 } },
            value: { style: { opacity: { fill: 0.2 } }, layout: { width: 100 } },
          },
        }),
      ],
    });
    const normalized = normalizeScene(input, { adapters: standardInputEmbedAdapters });
    const options = resolveCoreProviderDependencies({ contributions: normalized.contributions });
    const result = compileToScene(normalized.ir, options);

    expect(normalized.ir.children[0]).toMatchObject({
      defaultCell: {
        key: { style: { fill: 'blue' }, layout: { width: 60 } },
        value: { style: { opacity: { fill: 0.2 } }, layout: { width: 100 } },
      },
    });
    expect(JSON.stringify(normalized.ir)).toContain('"key":"key"');
    expect(result.scene.resources?.some(resource => resource.kind === 'clip')).toBe(true);
    expect(JSON.stringify(normalized.ir)).not.toContain('providerDependencies');
    expect(JSON.stringify(normalized.ir)).not.toContain('authoring-map');
  });
});

it('从任一根适配器组装数据定义和裁剪', () => {
  for (const child of [
    map({ data: { values: [1, { id: 'a' }] }, defaultCell: { layout: { width: 30 } } }),
    array({ data: [{ values: [1, 1] }], defaultCell: { layout: { height: 20 } } }),
  ]) {
    const normalized = normalizeScene(scene({ children: [child] }), { adapters: standardInputEmbedAdapters });
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
    array({ skeleton: { count: 2 }, defaultCell: { layout: { width: 30 } } }),
    map({ skeleton: { keys: ['k'] }, defaultCell: { layout: { height: 20 } } }),
    array({ items: [{}] }),
  ]) {
    const normalized = normalizeScene(scene({ children: [child] }), { adapters: standardInputEmbedAdapters });
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
