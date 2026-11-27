import type { IRScene, IRScope, IRCoordinate, IRNode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { readWeaveCurrent, WeaveManager } from '../../src/weave';
import { compileTestResult } from '../helpers/compilation';

describe('Scope 三层复用', () => {
  it('仅后代布局变化时复用 Scope 解析结果，但重新计算包络', () => {
    const node: IRNode = { type: 'node', id: 'body', position: [0, 0] };
    const scope: IRScope = { type: 'scope', id: 'box', children: [node] };
    const source: IRScene = { type: 'scene', version: 1, children: [scope] };
    const session = new WeaveManager(source);
    const mounted = session.mount();
    const entry = readWeaveCurrent(session.root).children[0];
    if (entry.type !== 'scope') throw new Error('Expected scope');
    const previous = readWeaveCurrent(entry);
    expect(previous.resolve?.value).toBeDefined();
    expect(previous.compile?.value).toBeDefined();
    const moved: IRNode = { ...node, position: [50, 20] };
    const update = session.prepareUpdate({
      operations: [{ kind: 'update', target: { kind: 'id', scopeId: entry.scopeId, id: 'body' }, input: moved }],
    });
    expect(update.compilation.result).toEqual(
      compileTestResult({ ...source, children: [{ ...scope, children: [moved] }] }),
    );
    expect(update.compilation.result).not.toEqual(mounted.compilation.result);
    update.commit();
    update.finish();
    const current = readWeaveCurrent(entry);
    expect(current.resolve?.value).toBe(previous.resolve?.value);
    expect(current.compile?.value).not.toBe(previous.compile?.value);
  });

  it('显式默认变换复用最终包络，外部引用变化重新放置且回滚不污染缓存', () => {
    const scope: IRScope = {
      type: 'scope',
      id: 'box',
      transforms: [{ kind: 'offset-translate', of: 'origin' }],
      children: [{ type: 'node', text: 'A' }],
    };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'coordinate', id: 'origin', position: [10, 20] }, scope],
    };
    const session = new WeaveManager(source);
    const mounted = session.mount();
    const child = readWeaveCurrent(session.root).children[1];
    if (child.type !== 'scope') throw new Error('Expected scope');
    const previous = readWeaveCurrent(child).compile?.value;
    const explicit: IRScope = { ...scope, transforms: [{ kind: 'offset-translate', of: 'origin', offset: [0, 0] }] };
    const equivalent = session.prepareUpdate({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: session.root.scopeId, id: 'box' },
          input: explicit,
        },
      ],
    });
    expect(equivalent.compilation.result).toEqual(mounted.compilation.result);
    equivalent.commit();
    equivalent.finish();
    expect(readWeaveCurrent(child).compile?.value).toBe(previous);
    const moved: IRCoordinate = { type: 'coordinate', id: 'origin', position: [40, 50] };
    const changed = session.prepareUpdate({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: session.root.scopeId, id: 'origin' },
          input: moved,
        },
      ],
    });
    expect(changed.compilation.result).toEqual(compileTestResult({ ...source, children: [moved, explicit] }));
    expect(changed.compilation.result).not.toEqual(mounted.compilation.result);
    changed.rollback();
    expect(readWeaveCurrent(child).compile?.value).toBe(previous);
  });
});
