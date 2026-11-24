// @vitest-environment jsdom
import { CompositeBaseSchema, defineComposite, ThemeMode } from '@retikz/core';
import { ReconcilerMode } from '@retikz/reconciler';
import { describe, expect, it, vi } from 'vitest';
import { literal } from 'zod';

import type { InputEmbedAdapter, InputScene } from '../../src';
import { scene, node, normalizeScene, renderToSvg, embed, SceneRuntime, compileToScene } from '../../src';

describe('Vanilla 处理', () => {
  it('单图可替换为 IR；批次只接受当前版本，导出不再次编译或发布', () => {
    const runtime = SceneRuntime.fromInput(scene([]), {
      reconciler: { mode: ReconcilerMode.Incremental },
    });
    try {
      const input = scene([node({ id: 'point', position: [5, 0] })]);
      runtime.replace(normalizeScene(input).ir);
      const expected = runtime.current;
      const remove = {
        operations: [
          {
            kind: 'remove' as const,
            target: { kind: 'id' as const, id: 'point', scopeId: runtime.getScopeId([], expected) },
          },
        ],
      };
      const listener = vi.fn();
      runtime.subscribe(listener);
      expect(runtime.toSvgString()).toBe(renderToSvg(expected.compilation.result.scene));
      expect(listener).not.toHaveBeenCalled();
      runtime.update(remove, expected);
      const current = runtime.current;
      expect(listener.mock.lastCall?.[0]).toBe(current);
      expect(current.compilation.result.scene.primitives).toHaveLength(0);
      expect(() => runtime.update(remove, expected)).toThrow(/stale/i);
      expect(runtime.current).toBe(current);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      runtime.dispose();
    }
  });

  it('协调器拒绝提交期间的销毁后，会话仍可更新和释放', () => {
    const ir = normalizeScene(scene([])).ir;
    const commit = vi.fn<() => void>();
    const dispose = vi.fn();
    const runtime = new SceneRuntime(ir, {
      createTarget: () => ({
        prepare: () => ({ commit, rollback: () => undefined, dispose: () => undefined }),
        dispose,
      }),
    });
    const listener = vi.fn();
    runtime.subscribe(listener);
    const initial = runtime.current;
    commit.mockImplementationOnce(() => runtime.dispose());
    try {
      expect(() => runtime.replace(ir)).toThrow(/Cannot dispose an active update/);
      expect(runtime.current).toBe(initial);
      expect(listener).not.toHaveBeenCalled();
      expect(dispose).not.toHaveBeenCalled();
      runtime.replace(ir);
      expect(listener).toHaveBeenCalledWith(runtime.current);
    } finally {
      runtime.dispose();
    }
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('一次编译只解析并执行一次嵌入的 Composite 定义', () => {
    const compile = vi.fn(() => ({ children: [] }));
    const definition = defineComposite({
      namespace: 'fixture',
      type: 'box',
      schema: CompositeBaseSchema.extend({
        namespace: literal('fixture'),
        type: literal('box'),
      }),
      compile,
    });
    const makeDefinition = vi.fn(() => definition);
    const adapter: InputEmbedAdapter<Record<string, never>> = {
      kind: 'fixture-box',
      lower: () => ({
        node: { namespace: 'fixture', type: 'box' },
        providerDependencies: {
          roots: [{ capability: 'composite', namespace: 'fixture', type: 'box' }],
          providers: [
            {
              key: { capability: 'composite', namespace: 'fixture', type: 'box' },
              makeDefinition,
            },
          ],
        },
      }),
    };
    const input: InputScene = {
      type: 'scene',
      children: [embed({ adapter, id: 'box', props: {} })],
    };

    compileToScene(input);

    expect(makeDefinition).toHaveBeenCalledTimes(1);
    expect(compile).toHaveBeenCalledOnce();
  });

  it('保留嵌套 Scope 的 Theme 供 Core 解析', () => {
    const adapter: InputEmbedAdapter<Record<string, never>> = {
      kind: 'theme-probe',
      lower: () => {
        return {
          node: { type: 'node', id: 'theme-probe', position: [0, 0] },
          providerDependencies: { roots: [], providers: [] },
        };
      },
    };

    const normalized = normalizeScene({
      type: 'scene',
      theme: { name: 'academic', mode: ThemeMode.Light },
      children: [
        {
          type: 'scope',
          theme: { mode: ThemeMode.Dark },
          children: [embed({ adapter, id: 'theme-probe', props: {} })],
        },
      ],
    });

    expect(normalized.ir.children).toEqual([
      {
        type: 'scope',
        theme: { mode: ThemeMode.Dark },
        children: [{ type: 'node', id: 'theme-probe', position: [0, 0] }],
      },
    ]);
  });

  it('session controller 创建时保留 Core 编译诊断', () => {
    expect(() =>
      SceneRuntime.fromInput({
        type: 'scene',
        children: [{ type: 'node', id: 'broken', position: [0, 0], shape: 'missing-shape' }],
      }),
    ).toThrow(/Unknown provider 'missing-shape'/);
  });

  it('controller 仅在完整成功后发布不可变 revision，失败保持上一次结果', () => {
    const controller = SceneRuntime.fromInput(
      { type: 'scene', children: [{ type: 'node', id: 'first', position: [0, 0] }] },
      {},
    );
    const first = controller.current;
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    controller.replaceInput({ type: 'scene', children: [{ type: 'node', id: 'second', position: [20, 0] }] });

    const second = controller.current;

    expect(second.revision).toBe(first.revision + 1);
    expect(second.compilation.result.scene).not.toBe(first.compilation.result.scene);
    expect(controller.current).toBe(second);
    expect(listener).toHaveBeenCalledWith(second);

    expect(() =>
      controller.replaceInput({
        type: 'scene',
        children: [{ type: 'node', id: 'broken', position: [0, 0], shape: 'missing-shape' }],
      }),
    ).toThrow();
    expect(controller.current).toBe(second);

    unsubscribe();
    controller.replaceInput({ type: 'scene', children: [{ type: 'node', id: 'third', position: [40, 0] }] });

    expect(listener).toHaveBeenCalledTimes(1);

    controller.dispose();

    expect(() =>
      controller.replaceInput({ type: 'scene', children: [{ type: 'node', id: 'after-dispose', position: [60, 0] }] }),
    ).toThrow(/disposed/i);
  });

  it('session controller 接受新增和移除 Composite contribution 的 InputScene 更新', () => {
    const definition = defineComposite({
      namespace: 'fixture',
      type: 'box',
      schema: CompositeBaseSchema.extend({
        namespace: literal('fixture'),
        type: literal('box'),
      }),
      compile: () => ({ children: [] }),
    });
    const adapter: InputEmbedAdapter<Record<string, never>> = {
      kind: 'fixture-box',
      lower: () => ({
        node: { namespace: 'fixture', type: 'box' },
        providerDependencies: {
          roots: [{ capability: 'composite', namespace: 'fixture', type: 'box' }],
          providers: [
            {
              key: { capability: 'composite', namespace: 'fixture', type: 'box' },
              makeDefinition: () => definition,
            },
          ],
        },
      }),
    };
    const phases: Array<string> = [];
    const controller = SceneRuntime.fromInput(
      { type: 'scene', children: [{ type: 'node', id: 'stable', position: [0, 0] }] },
      { reconciler: { trace: record => phases.push(record.phase) } },
    );
    const first = controller.current;

    expect(() =>
      controller.replaceInput({ type: 'scene', children: [embed({ adapter, id: 'box', props: {} })] }),
    ).not.toThrow();
    expect(controller.current.revision).toBe(first.revision + 1);

    expect(() =>
      controller.replaceInput({ type: 'scene', children: [{ type: 'node', id: 'restored', position: [20, 0] }] }),
    ).not.toThrow();
    expect(controller.current.revision).toBe(first.revision + 2);

    controller.dispose();
    expect(phases).toEqual(['mount', 'update', 'update', 'unmount']);
  });

  it('候选 Composite topology 编译失败时保留旧 result 并记录 diagnostics', () => {
    const failure = new Error('expected candidate composite failure');
    const definition = defineComposite({
      namespace: 'fixture',
      type: 'broken',
      schema: CompositeBaseSchema.extend({
        namespace: literal('fixture'),
        type: literal('broken'),
      }),
      compile: () => {
        throw failure;
      },
    });
    const adapter: InputEmbedAdapter<Record<string, never>> = {
      kind: 'broken-composite',
      lower: () => ({
        node: { namespace: 'fixture', type: 'broken' },
        providerDependencies: {
          roots: [{ capability: 'composite', namespace: 'fixture', type: 'broken' }],
          providers: [
            {
              key: { capability: 'composite', namespace: 'fixture', type: 'broken' },
              makeDefinition: () => definition,
            },
          ],
        },
      }),
    };
    const controller = SceneRuntime.fromInput({
      type: 'scene',
      children: [{ type: 'node', id: 'stable', position: [0, 0] }],
    });
    const stable = controller.current;

    expect(() =>
      controller.replaceInput({
        type: 'scene',
        children: [embed({ adapter, id: 'broken', props: {} })],
      }),
    ).toThrow(/expected candidate composite failure/);
    expect(controller.current).toBe(stable);
    expect(controller.diagnostics()).toEqual([
      expect.objectContaining({ message: 'expected candidate composite failure' }),
    ]);

    controller.dispose();
  });

  it('订阅方异常不会回滚已提交 revision，并经诊断边界报告', () => {
    const controller = SceneRuntime.fromInput({
      type: 'scene',
      children: [{ type: 'node', id: 'first', position: [0, 0] }],
    });
    const first = controller.current;
    const failure = new Error('expected subscriber failure');
    controller.subscribe(() => {
      throw failure;
    });

    expect(() =>
      controller.replaceInput({ type: 'scene', children: [{ type: 'node', id: 'second', position: [20, 0] }] }),
    ).not.toThrow();
    expect(controller.current.revision).toBe(first.revision + 1);
    expect(controller.diagnostics()).toContain(failure);

    controller.dispose();
  });

  it('session processing 只在成功 Runtime transaction 后替换完整 result', () => {
    const processing = SceneRuntime.fromInput({
      type: 'scene',
      children: [{ type: 'node', id: 'first', position: [0, 0] }],
    });
    const first = processing.current;
    const listener = vi.fn();
    const unsubscribe = processing.subscribe(listener);

    processing.replaceInput({ type: 'scene', children: [{ type: 'node', id: 'second', position: [20, 0] }] });

    const second = processing.current;

    expect(second.revision).toBe(first.revision + 1);
    expect(second.compilation.result.scene).not.toBe(first.compilation.result.scene);
    expect(listener).toHaveBeenCalledWith(second);
    expect(() =>
      processing.replaceInput({
        type: 'scene',
        children: [{ type: 'node', id: 'broken', position: [0, 0], shape: 'missing-shape' }],
      }),
    ).toThrow();
    expect(processing.current).toBe(second);

    unsubscribe();
    processing.replaceInput({ type: 'scene', children: [{ type: 'node', id: 'third', position: [40, 0] }] });

    expect(listener).toHaveBeenCalledTimes(1);

    processing.dispose();
  });

  it('持续会话通过 diagnostics 交付并清空 warning 回调异常', () => {
    const cause = new Error('warning callback failed');
    const runtime = new SceneRuntime(
      { type: 'scene', version: 1, children: [{ namespace: 'missing', type: 'composite' }] },
      {
        compile: {
          onWarn: () => {
            throw cause;
          },
        },
      },
    );
    try {
      expect(runtime.current.compilation.result.scene.primitives).toEqual([]);
      expect(runtime.diagnostics()).toContain(cause);
      expect(runtime.diagnostics()).toEqual([]);
    } finally {
      runtime.dispose();
    }
  });

  it('单次编译只通知一次 warning', () => {
    const onWarn = vi.fn();
    compileToScene(
      { type: 'scene', version: 1, children: [{ namespace: 'missing', type: 'composite' }] },
      { compile: { onWarn } },
    );
    expect(onWarn).toHaveBeenCalledOnce();
  });
});
