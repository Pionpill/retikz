import type { IRPathBase, IRScene } from '@retikz/core';
import { definePath, PathSchema } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { readWeaveCurrent, WeaveManager } from '../../src/weave';
import { compileTestResult } from '../helpers/compilation';

describe('Path 三层复用', () => {
  it('圆角候选回滚不污染原始度量，后续半径更新保留原始模型', () => {
    const path: IRPathBase = {
      type: 'path',
      id: 'corner',
      cornerRadius: 10,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [80, 0] },
        { type: 'step', kind: 'line', to: [80, 40] },
      ],
      marks: [{ shape: 'star', pos: 0.7 }],
    };
    const source: IRScene = { type: 'scene', version: 1, children: [path] };
    const session = new WeaveManager(source);
    const mounted = session.mount();
    const node = readWeaveCurrent(mounted.root).children[0];
    if (node.type !== 'path') throw new Error('Expected path');
    const previous = readWeaveCurrent(node).compiled;
    const snapshot = structuredClone(mounted.compilation.result);
    for (const [cornerRadius, commit] of [
      [18, false],
      [5, true],
    ] as const) {
      const next: IRPathBase = { ...path, cornerRadius };
      const update = session.update({
        operations: [
          { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'corner' }, input: next },
        ],
      });
      expect(update.compilation.result).toEqual(compileTestResult({ ...source, children: [next] }));
      if (commit) {
        update.commit();
        update.finish();
        const positions = readWeaveCurrent(node).compiled?.stroke?.layout?.positions;
        expect(positions).not.toBe(previous?.stroke?.layout?.positions);
        expect(positions?.original).toBe(previous?.stroke?.layout?.positions?.original);
      } else {
        update.rollback();
        expect(readWeaveCurrent(node).compiled).toBe(previous);
      }
      expect(mounted.compilation.result).toEqual(snapshot);
    }
  });

  it('自定义路径停止调用 emitStroke 时不恢复旧绘制资源', () => {
    const definition = definePath({
      name: 'conditional',
      schema: PathSchema.extend({ kind: literal('conditional') }),
      compile: context => (context.path.cornerRadius === 0 ? null : context.emitStroke()),
    });
    const path: IRPathBase = {
      type: 'path',
      kind: 'conditional',
      id: 'conditional',
      cornerRadius: 10,
      style: {
        stroke: {
          kind: 'linearGradient',
          stops: [
            { offset: 0, color: '#ff0000' },
            { offset: 1, color: '#0000ff' },
          ],
        },
      },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [80, 0] },
      ],
    };
    const source: IRScene = { type: 'scene', version: 1, children: [path] };
    const options = { paths: [definition] };
    const session = new WeaveManager(source, options);
    const mounted = session.mount();
    const next = { ...path, cornerRadius: 0 };
    const update = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'conditional' }, input: next },
      ],
    });
    expect(update.compilation.result).toEqual(compileTestResult({ ...source, children: [next] }, options));
    expect(update.compilation.result.scene.resources ?? []).toHaveLength(0);
    update.rollback();
  });

  it('复用位置后替换和删除唯一渐变消费者，不保留旧资源', () => {
    const gradient = (color: string) => ({
      kind: 'linearGradient' as const,
      stops: [
        { offset: 0, color },
        { offset: 1, color: '#ffffff' },
      ],
    });
    const path: IRPathBase = {
      type: 'path',
      id: 'painted',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [100, 0] },
      ],
      marks: [{ shape: 'star', pos: 0, fill: gradient('#ff0000') }],
    };
    const source: IRScene = { type: 'scene', version: 1, children: [path] };
    const session = new WeaveManager(source);
    const mounted = session.mount();
    const snapshot = structuredClone(mounted.compilation.result);
    for (const marks of [
      [{ shape: 'star', pos: 0.3, fill: gradient('#ff0000') }],
      [{ shape: 'star', pos: 0.6, fill: gradient('#0000ff') }],
      [],
    ]) {
      const next: IRPathBase = { ...path, marks };
      const update = session.update({
        operations: [
          { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'painted' }, input: next },
        ],
      });
      expect(update.compilation.result).toEqual(compileTestResult({ ...source, children: [next] }));
      expect(update.compilation.result.scene.resources ?? []).toHaveLength(marks.length === 0 ? 0 : 1);
      update.commit();
      update.finish();
    }
    expect(mounted.compilation.result).toEqual(snapshot);
  });

  it('复用目标后仍跟踪引用，后续坐标更新重新定位', () => {
    const path: IRPathBase = {
      type: 'path',
      id: 'linked',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: { id: 'endpoint' } },
      ],
      marks: [{ shape: 'star', pos: 0.2 }],
    };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'coordinate', id: 'endpoint', position: [100, 0] }, path],
    };
    const session = new WeaveManager(source);
    const mounted = session.mount();
    const next: IRPathBase = { ...path, marks: [{ shape: 'star', pos: 0.8 }] };
    const placement = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'linked' }, input: next },
      ],
    });
    placement.commit();
    placement.finish();
    const coordinate = { type: 'coordinate', id: 'endpoint', position: [200, 50] } as const;
    const update = session.update({
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'endpoint' },
          input: { ...coordinate, position: [200, 50] },
        },
      ],
    });
    expect(update.compilation.result).toEqual(
      compileTestResult({ ...source, children: [{ ...coordinate, position: [200, 50] }, next] }),
    );
    update.commit();
    update.finish();
  });

  it('连续更新 mark 位置和模式复用几何与局部内容，同时与全量输出一致', () => {
    const path: IRPathBase = {
      type: 'path',
      id: 'moving',
      cornerRadius: 10,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [80, 0] },
        { type: 'step', kind: 'line', to: [80, 40] },
      ],
      marks: [{ shape: 'star', pos: 0 }],
    };
    const source: IRScene = { type: 'scene', version: 1, children: [path] };
    const session = new WeaveManager(source);
    const mounted = session.mount();
    const node = readWeaveCurrent(mounted.root).children[0];
    if (node.type !== 'path') throw new Error('Expected path');
    const previous = readWeaveCurrent(node).compiled;
    for (const [pos, positionMode, positionGeometry] of [
      [0.25, 'step', 'original'],
      [0.5, 'step', 'rounded'],
      [0.75, 'length', 'original'],
      [1, 'length', 'rounded'],
      [0.1, 'length', 'rounded'],
      [0.6, 'step', 'original'],
    ] as const) {
      const next: IRPathBase = { ...path, marks: [{ shape: 'star', pos, positionMode, positionGeometry }] };
      const update = session.update({
        operations: [
          { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'moving' }, input: next },
        ],
      });
      expect(update.compilation.result).toEqual(compileTestResult({ ...source, children: [next] }));
      update.commit();
      update.finish();
      const compiled = readWeaveCurrent(node).compiled;
      expect(compiled?.stroke?.layout?.geometry).toBe(previous?.stroke?.layout?.geometry);
      expect(compiled?.stroke?.layout?.positions).toBe(previous?.stroke?.layout?.positions);
      expect(compiled?.stroke?.emit?.marks?.[0]?.content).toBe(previous?.stroke?.emit?.marks?.[0]?.content);
    }
  });
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
