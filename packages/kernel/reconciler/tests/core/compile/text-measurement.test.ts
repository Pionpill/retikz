import type { IRNode, IRScene, TextFont, TextMeasurer } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, naturalLayoutProposal } from '@retikz/core';
import { describe, expect, it, vi } from 'vitest';
import { literal } from 'zod';

import { createCompileRuntime } from '../../../src/compile/runtime';
import { WeaveManager } from '../../../src/weave';
import { compileTestResult } from '../../helpers/compilation';

const emptyScene: IRScene = { type: 'scene', version: 1, children: [] };

describe('单次编译文字测量', () => {
  it('独立 Composite 试算与最终正文共享本次测量', () => {
    const parent = defineComposite({
      namespace: 'test',
      type: 'measure',
      schema: CompositeBaseSchema.extend({ namespace: literal('test'), type: literal('measure') }),
      compile: (_, context) => {
        for (const x of [0, 100]) {
          context.layoutChild({ type: 'node', text: 'same', position: [x, 0] }, naturalLayoutProposal);
        }
        return { children: [{ type: 'node', text: 'same' }] };
      },
    });
    const measureText = vi.fn<TextMeasurer>(() => ({ width: 20, height: 10 }));
    const result = compileTestResult(
      { ...emptyScene, children: [{ namespace: 'test', type: 'measure' }] },
      {
        composites: [parent],
        measureText,
      },
    );
    expect(measureText).toHaveBeenCalledTimes(1);
    expect(result.scene.primitives.length).toBeGreaterThan(0);
  });

  it('按文本和全部字体值区分缓存，绕过缓存不覆盖或填充记录', () => {
    let width = 10;
    const source = vi.fn<TextMeasurer>(() => ({ width, height: 10 }));
    const measure = createCompileRuntime(emptyScene, { measureText: source }).context.host.measureText;
    const font: TextFont = { size: 10, family: 'serif', weight: 400, style: 'normal' };
    expect(measure('same', font).width).toBe(10);
    width = 20;
    expect(measure('same', { ...font }).width).toBe(10);
    expect(source).toHaveBeenCalledTimes(1);
    expect(measure('same', font, true).width).toBe(20);
    expect(source).toHaveBeenLastCalledWith('same', font, true);
    expect(measure('same', font).width).toBe(10);
    expect(measure('uncached', font, true).width).toBe(20);
    width = 30;
    expect(measure('uncached', font).width).toBe(30);
    for (const changed of [{ size: 11 }, { family: 'sans-serif' }, { weight: 700 }, { style: 'italic' as const }]) {
      expect(measure('same', { ...font, ...changed }).width).toBe(30);
    }
    expect(source).toHaveBeenCalledTimes(8);
  });

  it('异常不进入缓存，宿主与消费者修改度量对象不污染缓存', () => {
    const failure = new Error('measurement failed');
    const metrics = { width: 10, height: 12 };
    const source = vi
      .fn<TextMeasurer>()
      .mockImplementationOnce(() => {
        throw failure;
      })
      .mockReturnValue(metrics);
    const measure = createCompileRuntime(emptyScene, { measureText: source }).context.host.measureText;
    expect(() => measure('text', { size: 10 })).toThrow(failure);
    const measured = measure('text', { size: 10 });
    expect(measured.width).toBe(10);
    metrics.width = 20;
    measured.width = 30;
    expect(measure('text', { size: 10 })).toEqual({ width: 10, height: 12 });
    expect(source).toHaveBeenCalledTimes(2);
  });

  it('正文、节点标签和路径标签共享测量，每次全量编译重新建立缓存', () => {
    const source: IRScene = {
      ...emptyScene,
      children: [
        { type: 'node', text: 'same', label: { text: 'same', font: { size: 10 } } },
        { type: 'node', text: 'same', position: [100, 0] },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0], label: { text: 'same', font: { size: 10 } } },
          ],
        },
      ],
    };
    const measureText = vi.fn<TextMeasurer>(() => ({ width: 20, height: 10, ascent: 8, descent: 2 }));
    const options = { measureText, fontSize: 10 };
    const first = compileTestResult(source, options);
    expect(measureText).toHaveBeenCalledTimes(1);
    expect(compileTestResult(source, options)).toEqual(first);
    expect(measureText).toHaveBeenCalledTimes(2);
  });

  it('增量批次共享测量，提交、回滚和失败后都不沿用上批缓存', () => {
    const nodes: Array<IRNode> = [
      { type: 'node', id: 'a', text: 'first' },
      { type: 'node', id: 'b', text: 'first', position: [100, 0] },
    ];
    let reject = false;
    const measureText = vi.fn<TextMeasurer>(() => {
      if (reject) throw new Error('measurement failed');
      return { width: 20, height: 10 };
    });
    const manager = new WeaveManager({ ...emptyScene, children: nodes }, { measureText });
    const mounted = manager.mount();
    expect(measureText).toHaveBeenCalledTimes(1);
    const update = (text: string) =>
      manager.update({
        operations: nodes.map(node => ({
          kind: 'update',
          target: { kind: 'id', scopeId: mounted.root.scopeId, id: node.id! },
          input: { ...node, text },
        })),
      });
    const second = update('second');
    expect(measureText).toHaveBeenCalledTimes(2);
    second.commit();
    second.finish();
    const rolledBack = update('first');
    expect(measureText).toHaveBeenCalledTimes(3);
    rolledBack.rollback();
    reject = true;
    expect(() => update('first')).toThrow('measurement failed');
    expect(measureText).toHaveBeenCalledTimes(4);
    reject = false;
    const retried = update('first');
    expect(measureText).toHaveBeenCalledTimes(5);
    expect(retried.compilation.result).toEqual(mounted.compilation.result);
    retried.rollback();
  });
});
