import { calculateScopeEnvelopeBounds } from '@retikz/core';
import type { CompiledReferenceGeometry, IRCoordinate, IRNode, IRPosition, IRScene, IRScope } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { ReconcilerMode, SceneReconciler } from '../../src/reconcile';
import { updateWeaveScopeEnvelope } from '../../src/weave/element/scope/envelope';
import { compileTestSnapshot } from '../helpers/compilation';

describe('Scope 子贡献事务', () => {
  for (const captureProvenance of [false, true]) {
    it(`极值扩张收缩删除、匿名旋转和失败恢复与全量等价，来源=${captureProvenance}`, () => {
      let reject = false;
      const failure = new Error('host commit');
      const session = new SceneReconciler(
        {},
        {
          mode: ReconcilerMode.Incremental,
          captureProvenance,
          target: {
            prepare: () => ({
              commit: () => {
                if (reject) throw failure;
              },
              rollback: () => {},
              dispose: () => {},
            }),
          },
        },
      );
      const background: Array<IRCoordinate> = Array.from({ length: 16 }, (_, i) => ({
        type: 'coordinate',
        id: `c${i}`,
        position: [i, i % 3],
      }));
      let node: IRNode = { type: 'node', id: 'body', position: [80, 20], layout: { width: 20 } };
      let inner: IRScope = {
        type: 'scope',
        transforms: [{ kind: 'rotate', degrees: 31 }],
        children: [...background, node],
      };
      let scope: IRScope = { type: 'scope', id: 'box', children: [inner] };
      const makeScene = (): IRScene => ({
        type: 'scene',
        version: 1,
        children: [
          scope,
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'box' } },
              { type: 'step', kind: 'line', to: [200, 0] },
            ],
          },
        ],
      });
      const initial = session.mount(makeScene());
      const saved = structuredClone(initial.compilation);
      const innerId = session.getScopeId([0, 0]);
      const outerId = session.getScopeId([0]);
      const verify = () =>
        expect(session.read().compilation).toEqual(compileTestSnapshot(makeScene(), {}, { captureProvenance }));
      for (const width of [100, 20]) {
        node = { ...node, layout: { width } };
        inner = { ...inner, children: [...background, node] };
        scope = { ...scope, children: [inner] };
        const batch = {
          operations: [
            { kind: 'update' as const, target: { kind: 'id' as const, scopeId: innerId, id: 'body' }, input: node },
          ],
        };
        const before = session.read();
        reject = true;
        expect(() => session.update(batch)).toThrow(expect.objectContaining({ cause: failure }));
        expect(session.read()).toBe(before);
        reject = false;
        session.update(batch);
        verify();
        expect(initial.compilation).toEqual(saved);
      }
      session.update({ operations: [{ kind: 'remove', target: { kind: 'id', scopeId: innerId, id: 'body' } }] });
      inner = { ...inner, children: background };
      scope = { ...scope, children: [inner] };
      verify();
      for (const boundingShape of ['circle', 'rectangle'] as const) {
        scope = { ...scope, boundingShape };
        session.update({ operations: [{ kind: 'update', target: { kind: 'scope', scopeId: outerId }, input: scope }] });
        verify();
      }
      session.dispose();
    });
  }
});

describe('Scope 边界复用', () => {
  it('内部移动及越界扩张不重新读取清洁几何，边界收缩与删除仍准确', () => {
    let reads = 0;
    const left: CompiledReferenceGeometry = {
      get position(): IRPosition {
        reads++;
        return [1, 1];
      },
    };
    const right: CompiledReferenceGeometry = {
      get position(): IRPosition {
        reads++;
        return [10, 10];
      },
    };
    let layouts: Array<CompiledReferenceGeometry> = [left, right, { position: [2, 2] }];
    let bounds = calculateScopeEnvelopeBounds(layouts)!;
    reads = 0;
    for (const position of [
      [5, 5],
      [12, 12],
    ] as const) {
      const next: Array<CompiledReferenceGeometry> = [left, right, { position: [position[0], position[1]] }];
      bounds = updateWeaveScopeEnvelope(next, layouts, bounds)!;
      layouts = next;
      expect(reads).toBe(0);
    }
    expect(bounds).toEqual({ minX: 1, minY: 1, maxX: 12, maxY: 12 });
    const shrink: Array<CompiledReferenceGeometry> = [left, right, { position: [3, 3] }];
    const reduced = updateWeaveScopeEnvelope(shrink, layouts, bounds)!;
    expect(reduced).toEqual({ minX: 1, minY: 1, maxX: 10, maxY: 10 });
    expect(reads).toBeGreaterThan(0);
    expect(updateWeaveScopeEnvelope([left], shrink, reduced)).toEqual({ minX: 1, minY: 1, maxX: 1, maxY: 1 });
    expect(updateWeaveScopeEnvelope([], [left], reduced)).toBeUndefined();
  });
  it('同批多点移动、重排、零值平局与大坐标不改变完整极值', () => {
    for (const offset of [0, 1e16]) {
      let layouts: Array<CompiledReferenceGeometry> = [
        { position: [-0, 0] },
        { position: [offset + 100, 100] },
        { position: [offset + 20, 20] },
        { position: [offset + 40, 40] },
      ];
      let bounds = calculateScopeEnvelopeBounds(layouts)!;
      const updates: Array<Array<CompiledReferenceGeometry>> = [
        [layouts[0], layouts[1], { position: [offset + 120, 30] }, { position: [offset + 140, 40] }],
        [layouts[1], { position: [0, -0] }, { position: [offset + 50, 50] }],
        [{ position: [offset + 1, 1] }],
      ];
      for (const next of updates) {
        bounds = updateWeaveScopeEnvelope(next, layouts, bounds)!;
        expect(bounds).toEqual(calculateScopeEnvelopeBounds(next));
        layouts = next;
      }
    }
  });
});

it('内部移动、外扩和回缩连续更新后，Scope 外部连接与全量结果一致', () => {
  const session = new SceneReconciler({}, { mode: ReconcilerMode.Incremental });
  const background: Array<IRCoordinate> = [
    { type: 'coordinate', id: 'lower', position: [-1000, -1000] },
    { type: 'coordinate', id: 'upper', position: [1000, 1000] },
  ];
  let node: IRNode = { type: 'node', id: 'body', position: [0, 0] };
  const scene = (): IRScene => ({
    type: 'scene',
    version: 1,
    children: [
      { type: 'scope', id: 'box', children: [...background, node] },
      {
        type: 'path',
        children: [
          { type: 'step', kind: 'move', to: { id: 'box' } },
          { type: 'step', kind: 'line', to: { id: 'body' } },
          { type: 'step', kind: 'line', to: [3000, 0] },
        ],
      },
    ],
  });
  const initial = session.mount(scene());
  const saved = structuredClone(initial.compilation);
  const scopeId = session.getScopeId([0]);
  for (const x of [100, 2000, 200, -2000, 0]) {
    node = { ...node, position: [x, 100] };
    session.update({ operations: [{ kind: 'update', target: { kind: 'id', scopeId, id: 'body' }, input: node }] });
    expect(session.read().compilation).toEqual(compileTestSnapshot(scene()));
    expect(initial.compilation).toEqual(saved);
  }
  session.dispose();
});
