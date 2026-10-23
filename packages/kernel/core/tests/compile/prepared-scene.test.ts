import { describe, expect, it, vi } from 'vitest';

import type { IRScene } from '../../src';
import {
  compileToScene,
  createCompositeInputBindings,
  prepareSceneCompilation,
  RetikzCoreErrorCode,
  assertCompositeInputBindings,
} from '../../src';

const scene: IRScene = {
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'a', position: [0, 0] },
    { type: 'node', id: 'b', position: [20, 0] },
  ],
};

describe('静态编译准备', () => {
  it('默认结果等价且不收集来源', () => {
    const prepared = prepareSceneCompilation(scene);
    expect(prepared.result).toEqual(compileToScene(scene));
    expect(prepared.provenance).toBeUndefined();
    expect(prepared.observerOutputs).toEqual([]);
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
      const prepared = prepareSceneCompilation(input, {}, { captureProvenance: true });
      const provenance = prepared.provenance!;
      expect(prepared.diagnostics.length).toBeGreaterThan(0);
      expect(warning).not.toHaveBeenCalled();
      expect(provenance.bindings.filter(binding => binding.name === 'same')).toHaveLength(2);
      const paths: Array<Array<number>> = [];
      const visit = (items: typeof prepared.result.scene.primitives, parent: Array<number>): void => {
        items.forEach((primitive, index) => {
          const path = [...parent, index];
          paths.push(path);
          if (primitive.type === 'group') visit(primitive.children, path);
        });
      };
      visit(prepared.result.scene.primitives, []);
      expect(provenance.emissions.map(emission => emission.primitivePath)).toEqual(paths);
      expect(provenance.owners.some(owner => owner.key === provenance.root)).toBe(true);
      expect(
        provenance.emissions.every(emission => provenance.owners.some(owner => owner.key === emission.owner)),
      ).toBe(true);
    } finally {
      warning.mockRestore();
    }
  });

  it('配对检查不编译并拒绝过期绑定', () => {
    const bindings = createCompositeInputBindings(scene, []);
    expect(assertCompositeInputBindings(scene, bindings)).toBeUndefined();
    expect(assertCompositeInputBindings(scene, undefined)).toBeUndefined();
    expect(() => assertCompositeInputBindings({ ...scene, children: [] }, bindings)).toThrow(
      expect.objectContaining({ code: RetikzCoreErrorCode.CompositeContractViolation }),
    );
  });
});
