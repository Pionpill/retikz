import type { IRCoordinate, IRNode, IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import { WeaveManager } from '../../src/weave';
import { compileTestSnapshot } from '../helpers/compilation';

describe('Composite 增量贡献', () => {
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
    const candidate = manager.update({ operations: [] }, true);
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
    const mounted = manager.mount();
    const changed: IRNode = { ...anchor, text: 'BB', style: { fill: 'blue' } };
    const candidate = manager.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'anchor' }, input: changed },
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
    const mounted = manager.mount();
    const moved: IRCoordinate = { type: 'coordinate', id: 'origin', position: [40, 20] };
    const candidate = manager.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: mounted.root.scopeId, id: 'origin' }, input: moved },
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
    const initial = session.mount();
    const changed: IRNode = {
      ...consumer,
      position: { direction: 'right', of: 'generated', distance: 50 },
    };
    const prepare = () =>
      session.update({
        operations: [
          {
            kind: 'update',
            target: { kind: 'id', scopeId: initial.root.scopeId, id: 'consumer' },
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
    const independent = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: initial.root.scopeId, id: 'other' }, input: changedOther },
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
    const changed = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: initial.root.scopeId, id: 'anchor' }, input: changedAnchor },
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
    const retry = session.update({
      operations: [
        { kind: 'update', target: { kind: 'id', scopeId: initial.root.scopeId, id: 'other' }, input: other },
      ],
    });
    expect(calls).toBe(beforeRetry);
    expect(retry.compilation.result).toEqual(snapshot);
    expect(initial.compilation.result).toEqual(snapshot);
    retry.rollback();
  });
});
