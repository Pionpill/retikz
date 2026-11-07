import type { IRPathBase, IRScene } from '@retikz/core';
import { definePath, PathSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { readWeaveCurrent, WeaveManager } from '../../src/weave';
import { compileTestResult } from '../helpers/compilation';

describe('Path 三层复用', () => {
  it('省略与显式 stroke 种类复用同一最终结果', () => {
    const path: IRPathBase = {
      type: 'path',
      id: 'line',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [10, 0] },
      ],
    };
    const session = new WeaveManager({ type: 'scene', version: 1, children: [path] });
    const mounted = session.mount();
    const node = readWeaveCurrent(mounted.root).children[0];
    if (node.type !== 'path') throw new Error('Expected path');
    const previous = readWeaveCurrent(node).compiled;
    const update = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'line' },
          input: { ...path, kind: 'stroke' },
        },
      ],
    });
    expect(update.compilation.result).toEqual(mounted.compilation.result);
    update.commit();
    update.finish();
    expect(readWeaveCurrent(node).compiled).toBe(previous);
  });
  it('省略与显式固定样式默认值复用自定义编译结果', () => {
    let calls = 0;
    const definition = definePath({
      name: 'tracked',
      schema: PathSchema.extend({ kind: literal('tracked') }),
      compile: context => {
        calls++;
        return context.emitStroke();
      },
    });
    const path: IRPathBase = {
      type: 'path',
      kind: 'tracked',
      id: 'line',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
    };
    const source: IRScene = { type: 'scene', version: 1, children: [path] };
    const session = new WeaveManager(source, { paths: [definition] });
    const mounted = session.mount();
    const before = calls;
    const node = readWeaveCurrent(mounted.root).children[0];
    if (node.type !== 'path') throw new Error('Expected path');
    const previous = readWeaveCurrent(node).compiled;
    const explicit: IRPathBase = {
      ...path,
      style: {
        fillRule: 'nonzero',
        dashOffset: 0,
        lineCap: 'butt',
        lineJoin: 'miter',
        opacity: { overall: 1, fill: 1, stroke: 1 },
        blendMode: 'normal',
      },
    };
    const update = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'line' },
          input: explicit,
        },
      ],
    });
    expect(calls).toBe(before);
    expect(update.compilation.result).toEqual(
      compileTestResult({ ...source, children: [explicit] }, { paths: [definition] }),
    );
    update.commit();
    update.finish();
    expect(readWeaveCurrent(node).compiled).toBe(previous);
  });
});
