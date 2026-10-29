import { readPropertyPath } from '@retikz/foundation';
import { describe, expect, it, vi } from 'vitest';

import type { IRScene } from '../../src';
import { compileSceneSnapshot, compileToScene, createCompositeInputBindings, RetikzCoreErrorCode } from '../../src';

const scene: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'a', position: [0, 0] },
    { type: 'node', id: 'b', position: [20, 0] },
  ],
};

describe('静态编译快照', () => {
  it('默认结果等价且不收集来源', () => {
    const snapshot = compileSceneSnapshot(scene);
    expect(snapshot.result).toEqual(compileToScene(scene));
    expect(snapshot.provenance).toBeUndefined();
  });

  it('来源逐项对应最终图元，且相同名称的注册不会合并', () => {
    const input: IRScene = {
      ...scene,
      children: [
        { type: 'node', id: 'same', position: [0, 0] },
        { type: 'node', id: 'same', position: [20, 0] },
      ],
    };
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    try {
      const snapshot = compileSceneSnapshot(input, {}, { captureProvenance: true });
      const provenance = snapshot.provenance!;
      expect(snapshot.diagnostics.length).toBeGreaterThan(0);
      expect(warning).not.toHaveBeenCalled();
      expect(provenance.bindings.filter(binding => binding.name === 'same')).toHaveLength(2);
      const paths: Array<Array<string | number>> = [];
      const visit = (items: typeof snapshot.result.scene.primitives, parent: Array<string | number>): void => {
        items.forEach((primitive, index) => {
          const path = [...parent, index];
          paths.push(path);
          if (primitive.type === 'group') visit(primitive.children, [...path, 'children']);
        });
      };
      visit(snapshot.result.scene.primitives, ['primitives']);
      expect(provenance.emissions.map(emission => emission.primitivePath)).toEqual(paths);
      for (const emission of provenance.emissions) {
        const primitive = readPropertyPath(snapshot.result.scene, emission.primitivePath);
        expect(primitive).toHaveProperty('type');
        expect(Object.isFrozen(emission.primitivePath)).toBe(true);
      }
      expect(provenance.owners.some(owner => owner.key === provenance.root)).toBe(true);
      expect(
        provenance.emissions.every(emission => provenance.owners.some(owner => owner.key === emission.owner)),
      ).toBe(true);
    } finally {
      warning.mockRestore();
    }
  });

  it('编译入口接受配对绑定并拒绝过期绑定', () => {
    const bindings = createCompositeInputBindings(scene, []);
    expect(compileToScene(scene, { compositeInputs: bindings })).toEqual(compileToScene(scene));
    expect(() => compileToScene({ ...scene, children: [] }, { compositeInputs: bindings })).toThrow(
      expect.objectContaining({ code: RetikzCoreErrorCode.CompositeContractViolation }),
    );
  });
});
