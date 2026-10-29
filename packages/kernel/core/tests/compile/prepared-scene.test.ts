import { readPropertyPath } from '@retikz/foundation';
import { describe, expect, it, vi } from 'vitest';

import type { IRChild, IRScene, ScenePrimitive } from '../../src';
import { CompileProvenanceTracker } from '../../src';
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
  it('来源快照隔离后续收集，重复输入引用与嵌套发射保持各自归属', () => {
    const tracker = new CompileProvenanceTracker();
    const input: IRChild = { type: 'node', id: 'same', position: [0, 0] };
    const first = tracker.createOwner(input, 0, tracker.root, false, tracker.rootNamespace);
    const second = tracker.createOwner(input, 1, tracker.root, false, tracker.rootNamespace);
    const generated = tracker.createOwner(input, 0, first, true, tracker.rootNamespace);
    const child: ScenePrimitive = { type: 'group', children: [] };
    const group: ScenePrimitive = { type: 'group', children: [child] };
    tracker.recordPrimitives([child], generated, 'generated');
    tracker.recordPrimitives([group], first, 'node');
    const copied = tracker.materializePrimitives([group]);
    tracker.transferPrimitives([group], copied);
    const snapshot = tracker.capture(copied);

    expect(first).not.toBe(second);
    expect(snapshot.ownerMap.get(first)?.emissions).toEqual([
      { primitivePath: ['primitives', 0], role: 'node:group', ordinal: 0 },
    ]);
    expect(snapshot.ownerMap.get(generated)).toMatchObject({
      parent: first,
      generated: true,
      emissions: [{ primitivePath: ['primitives', 0, 'children', 0], role: 'generated:group', ordinal: 0 }],
    });
    expect(snapshot.ownerMap.get(second)?.emissions).toEqual([]);
    expect(snapshot.ownerMap.get(tracker.root)?.emissions).toEqual([]);
    const later: ScenePrimitive = { type: 'group', children: [] };
    tracker.recordPrimitives([later], first, 'node');
    tracker.createOwner(input, 1, first, true, tracker.rootNamespace);
    const next = tracker.capture([later, ...copied]);
    expect(next.ownerMap.get(first)?.emissions.map(emission => emission.ordinal)).toEqual([1, 0]);
    expect(next.ownerMap.get(first)?.emissions[1].primitivePath).toEqual(['primitives', 1]);
    expect(snapshot.ownerMap.size).toBe(4);
    expect([...snapshot.ownerMap.values()].filter(owner => owner.id === 'same')).toHaveLength(3);
    expect(snapshot.ownerMap.get(first)?.emissions[0].primitivePath).toEqual(['primitives', 0]);
    expect(Object.isFrozen(snapshot.ownerMap.get(first)?.emissions)).toBe(true);
  });

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
      expect([...provenance.ownerMap.values()].filter(owner => owner.id === 'same')).toHaveLength(2);
      const paths: Array<Array<string | number>> = [];
      const visit = (items: typeof snapshot.result.scene.primitives, parent: Array<string | number>): void => {
        items.forEach((primitive, index) => {
          const path = [...parent, index];
          paths.push(path);
          if (primitive.type === 'group') visit(primitive.children, [...path, 'children']);
        });
      };
      visit(snapshot.result.scene.primitives, ['primitives']);
      const emissions = [...provenance.ownerMap.values()].flatMap(owner => owner.emissions);
      expect(emissions).toHaveLength(paths.length);
      expect(emissions.map(emission => emission.primitivePath)).toEqual(expect.arrayContaining(paths));
      for (const emission of emissions) {
        const primitive = readPropertyPath(snapshot.result.scene, emission.primitivePath);
        expect(primitive).toHaveProperty('type');
        expect(Object.isFrozen(emission.primitivePath)).toBe(true);
      }
      expect(provenance.ownerMap.has(provenance.root)).toBe(true);
      for (const owner of provenance.ownerMap.values()) {
        if (owner.parent !== undefined) expect(provenance.ownerMap.has(owner.parent)).toBe(true);
      }
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
