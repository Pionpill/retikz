import { describe, expect, it } from 'vitest';

import { compileLayers, layerFromInput, node, normalizeScene, scene } from '../../src';

describe('作者图层归一化', () => {
  it('显式空层和单层保留列表形态，不产生隐式主图', () => {
    expect(compileLayers([])).toEqual([]);
    const results = compileLayers([layerFromInput({ name: 'overlay', scene: scene([]) })]);
    expect(results.map(entry => entry.name)).toEqual(['overlay']);
    expect(results[0].result.scene.primitives).toEqual([]);
    expect(normalizeScene(scene([])).ir.children).toEqual([]);
  });

  it('层间可以重名，按层排序但分别保留同名元素', () => {
    const children = [node({ id: 'button', position: [0, 0] })];
    const results = compileLayers([
      layerFromInput({ name: 'overlay', scene: scene(children) }),
      layerFromInput({ name: 'background', scene: scene(children) }),
    ]);
    expect(results.map(entry => entry.name)).toEqual(['background', 'overlay']);
    for (const { result } of results) {
      expect(result.scene.primitives).toHaveLength(1);
      expect(result.scene.primitives[0]).toMatchObject({ id: 'button' });
    }
  });
});
