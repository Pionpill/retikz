import { describe, expect, it } from 'vitest';

import { compileLayers, layer, node, normalizeScene, scene } from '../../src';

describe('作者图层归一化', () => {
  it('显式空层和单层保留列表形态，不产生隐式主图', () => {
    expect(compileLayers([])).toEqual([]);
    const results = compileLayers([layer({ name: 'overlay', scene: scene([]) })]);
    expect(results.map(entry => entry.name)).toEqual(['overlay']);
    expect(results[0].result.compileResult.scene.primitives).toEqual([]);
    expect(normalizeScene(scene([])).ir.children).toEqual([]);
  });

  it('层间可以重名，按层排序但分别保留同名元素', () => {
    const children = [node({ id: 'button', position: [0, 0] })];
    const results = compileLayers([
      layer({ name: 'overlay', scene: scene(children) }),
      layer({ name: 'background', scene: scene(children) }),
    ]);
    expect(results.map(entry => entry.name)).toEqual(['background', 'overlay']);
    for (const { result } of results) {
      expect(result.compileResult.scene.primitives).toHaveLength(1);
      expect(result.compileResult.scene.primitives[0]).toMatchObject({ id: 'button' });
    }
  });
});
