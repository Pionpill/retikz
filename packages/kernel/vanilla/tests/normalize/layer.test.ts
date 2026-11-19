import { describe, expect, it } from 'vitest';

import { layer, node, normalizeScene, scene } from '../../src';

describe('作者图层归一化', () => {
  it('显式空层和单层保留列表形态，不产生隐式主图', () => {
    expect(normalizeScene(scene({ layers: [] }))).toEqual([]);
    const results = normalizeScene(scene({ layers: [layer({ name: 'overlay', children: [] })] }));
    expect(results.map(entry => entry.name)).toEqual(['overlay']);
    expect(results[0].result.ir.children).toEqual([]);
    expect(normalizeScene(scene([])).ir.children).toEqual([]);
  });

  it('层间可以重名，按层排序但不合并元素和身份索引', () => {
    const children = [node({ id: 'button', position: [0, 0] })];
    const results = normalizeScene(
      scene({ layers: [layer({ name: 'overlay', children }), layer({ name: 'background', children })] }),
    );
    expect(results.map(entry => entry.name)).toEqual(['background', 'overlay']);
    for (const { name, result } of results) {
      expect(result.ir.children).toHaveLength(1);
      expect(result.runtimeMeta.identityIndex.get('button')).toEqual([name, 'button']);
    }
  });
});
