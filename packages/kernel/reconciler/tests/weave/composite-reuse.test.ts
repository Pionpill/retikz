import * as core from '@retikz/core';
import type { IRCoordinate, IRNode, IRPath, IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';
import { boolean, literal, string } from 'zod';

import { WeaveManager } from '../../src/weave';
import { compileTestSnapshot } from '../helpers/compilation';

describe('Composite 增量贡献', () => {
  it('生成 Path 保留引用时只编译变化项，目标移动仍使同一条 Path 失效', () => {
    const makePath = (color: string): IRPath => ({
      type: 'path',
      style: { stroke: color },
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [1, 1] },
      ],
    });
    const first = Array.from({ length: 100 }, () => makePath('red'));
    first[0] = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: { id: 'anchor' } },
      ],
    };
    const next = first.slice();
    next[50] = makePath('blue');
    const definition = defineComposite({
      namespace: 'test',
      type: 'stable',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('stable'), on: boolean() }),
      compile: ({ on }) => ({ children: on ? next : first }),
    });
    const input = (on: boolean) => ({ namespace: 'test', type: 'stable', on });
    const anchor = (x: number): IRCoordinate => ({ type: 'coordinate', id: 'anchor', position: [x, 0] });
    const scene = (on: boolean, x: number): IRScene => ({
      type: 'scene',
      version: 1,
      children: [anchor(x), input(on)],
    });
    const options = { composites: [definition] };
    const expected = [compileTestSnapshot(scene(true, 1), options), compileTestSnapshot(scene(true, 5), options)];
    const session = new WeaveManager(scene(false, 1), options);
    const spy = vi.spyOn(core, 'compilePath');
    try {
      session.mount();
      expect(spy).toHaveBeenCalledTimes(100);
      const prepare = (index: number, value: ReturnType<typeof input> | IRCoordinate) =>
        session.prepareUpdate({
          operations: [
            { kind: 'update', target: { kind: 'child', scopeId: session.root.scopeId, index }, input: value },
          ],
        });
      for (const rollback of [true, false]) {
        spy.mockClear();
        const changed = prepare(1, input(true));
        expect(spy).toHaveBeenCalledTimes(1);
        expect(changed.compilation).toEqual(expected[0]);
        if (rollback) changed.rollback();
        else {
          changed.commit();
          changed.finish();
        }
      }
      spy.mockClear();
      const moved = prepare(0, anchor(5));
      expect(spy).toHaveBeenCalledTimes(1);
      expect(moved.compilation).toEqual(expected[1]);
      moved.rollback();
    } finally {
      spy.mockRestore();
    }
  });

  it('同一 Path 出现在两个生成 Scope 时分别核对继承样式和位置', () => {
    const path: IRPath = {
      type: 'path',
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [2, 1] },
      ],
    };
    const definition = defineComposite({
      namespace: 'test',
      type: 'placed',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('placed'), on: boolean() }),
      compile: ({ on }, context) => ({
        children: [0, 1].map(index =>
          context.createScope(
            {
              transforms: [{ kind: 'translate', x: index === 1 && on ? 15 : index * 5, y: 0 }],
              defaults: { path: { style: { stroke: index === 1 && on ? 'blue' : 'red' } } },
            },
            [path],
          ),
        ),
      }),
    });
    const input = (on: boolean) => ({ namespace: 'test', type: 'placed', on });
    const scene = (on: boolean): IRScene => ({ type: 'scene', version: 1, children: [input(on)] });
    const options = { composites: [definition] };
    const expected = compileTestSnapshot(scene(true), options);
    const manager = new WeaveManager(scene(false), options);
    manager.mount();
    const spy = vi.spyOn(core, 'compilePath');
    try {
      const attempt = manager.prepareUpdate({
        operations: [
          { kind: 'update', target: { kind: 'child', scopeId: manager.root.scopeId, index: 0 }, input: input(true) },
        ],
      });
      expect(attempt.compilation).toEqual(expected);
      expect(spy).toHaveBeenCalledTimes(1);
      attempt.rollback();
    } finally {
      spy.mockRestore();
    }
  });

  it.each([false, true])('生成 Scope 按包络需求重算且仍发布 Coordinate（具名：%s）', named => {
    const input = (on: boolean) => ({ namespace: 'test', type: 'mixed', on });
    const definition = defineComposite({
      namespace: 'test',
      type: 'mixed',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('mixed'), on: boolean() }),
      compile: ({ on }) => ({
        children: [
          {
            type: 'scope',
            children: [
              { type: 'coordinate', id: 'origin', position: [4, 2] },
              { type: 'node', text: 'fixed' },
            ],
          },
          { type: 'scope', id: named ? 'group' : undefined, children: [{ type: 'node', text: on ? 'expanded' : 'v' }] },
        ],
      }),
    });
    const scene = (on: boolean): IRScene => ({
      type: 'scene',
      version: 1,
      children: [input(on), { type: 'coordinate', id: 'outside', position: { direction: 'right', of: 'origin' } }],
    });
    const options = { composites: [definition] };
    const expected = compileTestSnapshot(scene(true), options);
    const manager = new WeaveManager(scene(false), options);
    manager.mount();
    const coordinate = vi.spyOn(core, 'compileCoordinate');
    const node = vi.spyOn(core, 'compileNode');
    const scope = vi.spyOn(core, 'compileScope');
    try {
      const next = manager.prepareUpdate({
        operations: [
          { kind: 'update', target: { kind: 'child', scopeId: manager.root.scopeId, index: 0 }, input: input(true) },
        ],
      });
      expect(next.compilation).toEqual(expected);
      expect(coordinate).not.toHaveBeenCalled();
      expect(node).toHaveBeenCalledTimes(1);
      expect(scope).toHaveBeenCalledTimes(named ? 1 : 0);
      next.rollback();
    } finally {
      coordinate.mockRestore();
      node.mockRestore();
      scope.mockRestore();
    }
  });

  it('复用匿名试算后仍从本轮环境查询目标，依赖外部位置的试算随候选更新', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'probeEnvironment',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('probeEnvironment') }),
      compile: (_input, context) => {
        const plain = context.layoutChild(
          { type: 'node', position: [0, 0], text: 'fixed' },
          core.naturalLayoutProposal,
        );
        if (plain.kind === 'failed') return context.raise(plain.failure);
        const dependent = context.layoutChild(
          {
            type: 'node',
            position: { direction: 'right', of: 'target', distance: 5 },
            text: 'moving',
          },
          core.naturalLayoutProposal,
        );
        if (dependent.kind === 'failed') return context.raise(dependent.failure);
        const point = context.resolvePathTargets(plain.result, { source: { id: 'target' }, points: [] }).source;
        return {
          children: [
            context.replay(plain.result),
            context.replay(dependent.result),
            { type: 'node', position: [point[0], point[1]], text: 'query' },
          ],
        };
      },
    });
    const anchor = (x: number): IRCoordinate => ({ type: 'coordinate', id: 'target', position: [x, 10] });
    const scene = (x: number): IRScene => ({
      type: 'scene',
      version: 1,
      children: [anchor(x), { namespace: 'test', type: 'probeEnvironment' }],
    });
    const options = { composites: [definition] };
    const manager = new WeaveManager(scene(0), options);
    manager.mount();
    const expected = compileTestSnapshot(scene(50), options);
    for (const retry of [false, true]) {
      const candidate = manager.prepareUpdate({
        operations: [
          { kind: 'update', target: { kind: 'id', scopeId: manager.root.scopeId, id: 'target' }, input: anchor(50) },
        ],
      });
      expect(candidate.compilation).toEqual(expected);
      if (retry) {
        candidate.commit();
        candidate.finish();
      } else candidate.rollback();
    }
  });

  it('名称块命中仍按当前位置发布，新增同层重名不漏报，回滚不污染重试', () => {
    const input = (duplicate: boolean) => ({ namespace: 'test', type: 'namedBlock', duplicate });
    const carrier: IRNode = { type: 'node', id: 'target', aliasIds: ['alias'], position: [15, 0] };
    const definition = defineComposite({
      namespace: 'test',
      type: 'namedBlock',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('namedBlock'),
        duplicate: boolean(),
      }),
      compile: ({ duplicate }) => ({
        children: [
          { type: 'scope', children: duplicate ? [{ type: 'coordinate', id: 'alias', position: [9, 2] }] : [] },
          { type: 'scope', children: [carrier] },
        ],
      }),
    });
    const scene = (duplicate: boolean): IRScene => ({
      type: 'scene',
      version: 1,
      children: [
        input(duplicate),
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'alias' } },
          ],
        },
      ],
    });
    const options = { composites: [definition] };
    const manager = new WeaveManager(scene(false), options);
    manager.mount();
    const expected = compileTestSnapshot(scene(true), options);
    for (const retry of [false, true]) {
      const update = manager.prepareUpdate({
        operations: [
          { kind: 'update', target: { kind: 'child', scopeId: manager.root.scopeId, index: 0 }, input: input(true) },
        ],
      });
      expect(update.compilation).toEqual(expected);
      if (retry) {
        update.commit();
        update.finish();
      } else update.rollback();
    }
  });

  it('两个作者实例各自读取最后一次提交，失败和回滚不发布私有状态', () => {
    const seen: Array<object | undefined> = [];
    const definition = defineComposite({
      namespace: 'test',
      type: 'owned',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('owned'), value: string() }),
      compile: (ir, _context, memo?: { value: string }) => {
        seen.push(memo);
        if (ir.value === 'fail') throw new Error('aborted');
        return { children: [], memo: { value: ir.value } };
      },
    });
    const input = (value: string) => ({ namespace: 'test', type: 'owned', value });
    const manager = new WeaveManager(
      { type: 'scene', version: 1, children: [input('a'), input('b')] },
      { composites: [definition] },
    );
    manager.mount();
    expect(seen).toEqual([undefined, undefined]);
    const update = (index: number, value: string) =>
      manager.prepareUpdate({
        operations: [
          {
            kind: 'update',
            target: { kind: 'child', scopeId: manager.root.scopeId, index },
            input: input(value),
          },
        ],
      });
    update(0, 'discard').rollback();
    expect(() => update(0, 'fail')).toThrow();
    const success = update(0, 'next');
    success.commit();
    success.finish();
    update(1, 'discard').rollback();
    update(0, 'final').rollback();
    expect(seen.slice(2)).toEqual([{ value: 'a' }, { value: 'a' }, { value: 'a' }, { value: 'b' }, { value: 'next' }]);
  });

  it('独立 Composite 内生成 Scope 的身份互不冲突，外部 Scope 引用不会误判祖先环', () => {
    const first = defineComposite({
      namespace: 'test',
      type: 'firstScope',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('firstScope') }),
      compile: () => ({
        children: [{ type: 'scope', id: 'generatedA', children: [{ type: 'node', position: [0, 0] }] }],
      }),
    });
    const second = defineComposite({
      namespace: 'test',
      type: 'secondScope',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('secondScope') }),
      compile: () => ({
        children: [
          {
            type: 'scope',
            id: 'generatedB',
            children: [{ type: 'node', position: { direction: 'right', of: 'generatedA' } }],
          },
        ],
      }),
    });
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        { namespace: 'test', type: 'firstScope' },
        { namespace: 'test', type: 'secondScope' },
      ],
    };
    const options = { composites: [first, second] };
    const manager = new WeaveManager(source, options);
    const mounted = manager.mount();
    const candidate = manager.prepareUpdate({ operations: [] }, true);
    expect(candidate.compilation).toEqual(mounted.compilation);
    candidate.rollback();
  });

  it('引用几何相同的文字和颜色更新不重新执行 Composite 回调', () => {
    let calls = 0;
    const definition = defineComposite({
      namespace: 'test',
      type: 'geometryConsumer',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('geometryConsumer') }),
      compile: () => {
        calls++;
        return { children: [{ type: 'node', position: { direction: 'right', of: 'anchor' }, text: 'child' }] };
      },
    });
    const anchor: IRNode = { type: 'node', id: 'anchor', text: 'AA', style: { fill: 'red' } };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [anchor, { namespace: 'test', type: 'geometryConsumer' }],
    };
    const options = { composites: [definition] };
    const manager = new WeaveManager(source, options);
    manager.mount();
    const changed: IRNode = { ...anchor, text: 'BB', style: { fill: 'blue' } };
    const candidate = manager.prepareUpdate({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: manager.root.scopeId, id: 'anchor' }, input: changed },
      ],
    });
    expect(calls).toBe(1);
    expect(candidate.compilation).toEqual(
      compileTestSnapshot({ ...source, children: [changed, source.children[1]] }, options),
    );
    candidate.rollback();
  });

  it('Scope 最终位移改变时，生成延迟 Path 与外部目标保持全量等价', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'scopedEdge',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('scopedEdge') }),
      compile: () => ({
        children: [
          { type: 'node', id: 'generated', position: [0, 0] },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'generated' } },
              { type: 'step', kind: 'line', to: { id: 'outside' } },
            ],
          },
        ],
      }),
    });
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        { type: 'coordinate', id: 'outside', position: [200, 0] },
        { type: 'coordinate', id: 'origin', position: [10, 0] },
        {
          type: 'scope',
          position: { kind: 'anchor', target: { id: 'origin' }, selfAnchor: 'center' },
          children: [{ namespace: 'test', type: 'scopedEdge' }],
        },
      ],
    };
    const options = { composites: [definition] };
    const manager = new WeaveManager(source, options, { captureProvenance: true });
    manager.mount();
    const moved: IRCoordinate = { type: 'coordinate', id: 'origin', position: [40, 20] };
    const candidate = manager.prepareUpdate({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: manager.root.scopeId, id: 'origin' }, input: moved },
      ],
    });
    expect(candidate.compilation).toEqual(
      compileTestSnapshot({ ...source, children: [source.children[0], moved, source.children[2]] }, options, {
        captureProvenance: true,
      }),
    );
    candidate.rollback();
  });

  it('生成名称可供外部定位读取，生成路径随后读取外部结果，不构成依赖环', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'stages',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('stages') }),
      compile: () => ({
        children: [
          { type: 'node', id: 'generated', position: [10, 0] },
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'generated' } },
              { type: 'step', kind: 'line', to: { id: 'consumer' } },
            ],
          },
        ],
      }),
    });
    const consumer: IRNode = {
      type: 'node',
      id: 'consumer',
      position: { direction: 'right', of: 'generated', distance: 30 },
    };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ namespace: 'test', type: 'stages' }, consumer],
    };
    const options = { composites: [definition] };
    const execution = { captureProvenance: true };
    const session = new WeaveManager(source, options, execution);
    session.mount();
    const changed: IRNode = {
      ...consumer,
      position: { direction: 'right', of: 'generated', distance: 50 },
    };
    const prepare = () =>
      session.prepareUpdate({
        operations: [
          {
            kind: 'update',
            target: { kind: 'id', scopeId: session.root.scopeId, id: 'consumer' },
            input: changed,
          },
        ],
      });
    const expected = compileTestSnapshot({ ...source, children: [source.children[0], changed] }, options, execution);
    const candidate = prepare();
    expect(candidate.compilation).toEqual(expected);
    candidate.rollback();
    const retry = prepare();
    expect(retry.compilation).toEqual(expected);
    retry.commit();
    retry.finish();
  });

  it('独立更新复用已物化贡献，引用变化重建实例，候选回滚保留旧贡献', () => {
    let calls = 0;
    const definition = defineComposite({
      namespace: 'test',
      type: 'drawing',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('drawing') }),
      compile: () => {
        calls++;
        return {
          children: [
            { type: 'node', id: 'generated', position: [10, 0], text: 'cached' },
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: { id: 'generated' } },
                { type: 'step', kind: 'line', to: { id: 'anchor' } },
              ],
            },
          ],
        };
      },
    });
    const anchor: IRNode = { type: 'node', id: 'anchor', position: [100, 0] };
    const other: IRNode = { type: 'node', id: 'other', position: [200, 0] };
    const source: IRScene = {
      type: 'scene',
      version: 1,
      children: [
        anchor,
        { namespace: 'test', type: 'drawing' },
        other,
        { type: 'coordinate', id: 'consumer', position: { direction: 'right', of: 'generated' } },
      ],
    };
    const options = { composites: [definition] };
    const execution = { captureProvenance: true };
    const session = new WeaveManager(source, options, execution);
    const initial = session.mount();
    const snapshot = structuredClone(initial.compilation.result);
    const changedOther: IRNode = { ...other, position: [250, 20] };
    const independent = session.prepareUpdate({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: session.root.scopeId, id: 'other' }, input: changedOther },
      ],
    });
    expect(calls).toBe(1);
    expect(independent.compilation).toEqual(
      compileTestSnapshot(
        { ...source, children: [anchor, source.children[1], changedOther, source.children[3]] },
        options,
        execution,
      ),
    );
    independent.commit();
    independent.finish();
    const beforeChangedDependency = calls;
    const changedAnchor: IRNode = { ...anchor, position: [150, 50] };
    const changed = session.prepareUpdate({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: session.root.scopeId, id: 'anchor' }, input: changedAnchor },
      ],
    });
    expect(calls).toBe(beforeChangedDependency + 1);
    expect(changed.compilation).toEqual(
      compileTestSnapshot(
        { ...source, children: [changedAnchor, source.children[1], changedOther, source.children[3]] },
        options,
        execution,
      ),
    );
    changed.rollback();
    const beforeRetry = calls;
    const retry = session.prepareUpdate({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: session.root.scopeId, id: 'other' }, input: other },
      ],
    });
    expect(calls).toBe(beforeRetry);
    expect(retry.compilation.result).toEqual(snapshot);
    expect(initial.compilation.result).toEqual(snapshot);
    retry.rollback();
  });
});
