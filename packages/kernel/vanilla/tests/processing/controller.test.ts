// @vitest-environment jsdom
import type { IRScene } from '@retikz/core';
import { CompositeBaseSchema, defineComposite, defineTheme, ThemeMode } from '@retikz/core';
import { ReconcilerMode } from '@retikz/reconciler';
import { describe, expect, it, vi } from 'vitest';
import { literal } from 'zod';

import type { InputEmbedAdapter, InputScene } from '../../src';
import { scene, node, normalizeScene, renderToSvg, embed, SceneRuntime, compileToScene } from '../../src';
import { prepareProcessingInput } from '../../src/runtime/_input/prepare';

describe('Vanilla 处理', () => {
  it('单图可替换为 IR；批次只接受当前版本，导出不再次编译或发布', () => {
    const runtime = SceneRuntime.fromInput(scene([]), {
      reconciler: { mode: ReconcilerMode.Incremental },
    });
    try {
      const input = scene([node({ id: 'point', position: [5, 0] })]);
      runtime.replace(normalizeScene(input).ir);
      const expected = runtime.read();
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
      expect(runtime.renderToSvg()).toBe(renderToSvg(expected.compilation.result.scene));
      expect(listener).not.toHaveBeenCalled();
      runtime.update(remove, expected);
      const current = runtime.read();
      expect(listener.mock.lastCall?.[0]).toBe(current);
      expect(current.compilation.result.scene.primitives).toHaveLength(0);
      expect(() => runtime.update(remove, expected)).toThrow(/stale/i);
      expect(runtime.read()).toBe(current);
      expect(listener).toHaveBeenCalledTimes(1);
    } finally {
      runtime.dispose();
    }
  });

  it('订阅回调不能重入写操作，订阅者始终读到正在通知的版本', () => {
    const input: InputScene = { type: 'scene', children: [] };
    const reenter = vi.fn<() => void>();
    const controller = SceneRuntime.fromInput(input);
    controller.subscribe(reenter);
    const versions: Array<number> = [];
    const failures: Array<unknown> = [];
    reenter.mockImplementationOnce(() => {
      try {
        controller.replace(input);
      } catch (cause) {
        failures.push(cause);
      }
    });
    controller.subscribe(result => versions.push(result.revision, controller.read().revision));
    try {
      controller.replace(input);
      controller.replace(input);
      expect(failures).toHaveLength(1);
      expect(versions).toEqual([1, 1, 2, 2]);
    } finally {
      controller.dispose();
    }
  });

  it('只在 processing prepare 中解析 InputEmbed 的 Composite contribution', () => {
    const definition = defineComposite({
      namespace: 'fixture',
      type: 'box',
      schema: CompositeBaseSchema.extend({
        namespace: literal('fixture'),
        type: literal('box'),
      }),
      compile: () => ({ children: [] }),
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

    const prepared = prepareProcessingInput(input);

    expect(makeDefinition).toHaveBeenCalledTimes(1);
    expect(prepared.coreOptions.composites).toEqual([definition]);
  });

  it('保留嵌套 Scope 的 Theme 供 Core 解析', () => {
    const themeName = defineTheme({
      name: 'academic',
      resolve: () => ({
        semantic: { error: '#aa0000', success: '#00aa00', warning: '#aaaa00', guide: '#666666' },
        categorical: ['#112233'],
      }),
    });
    const adapter: InputEmbedAdapter<Record<string, never>> = {
      kind: 'theme-probe',
      lower: () => {
        return {
          node: { type: 'node', id: 'theme-probe', position: [0, 0] },
          providerDependencies: { roots: [], providers: [] },
        };
      },
    };

    const prepared = prepareProcessingInput(
      {
        type: 'scene',
        theme: { name: 'academic', mode: ThemeMode.Light },
        children: [
          {
            type: 'scope',
            theme: { mode: ThemeMode.Dark },
            children: [embed({ adapter, id: 'theme-probe', props: {} })],
          },
        ],
      },
      { themeDefinitions: [themeName] },
    );

    expect(prepared.source.children).toEqual([
      {
        type: 'scope',
        theme: { mode: ThemeMode.Dark },
        children: [{ type: 'node', id: 'theme-probe', position: [0, 0] }],
      },
    ]);
  });

  it('IRScene 直接进入 processing，不触发 Input normalize 或 schema parse', () => {
    const source = {
      type: 'scene' as const,
      version: 1 as const,
      children: [{ type: 'node' as const, id: 'a', position: [0, 0] as [number, number] }],
    };

    expect(prepareProcessingInput(source).source).toEqual(source);
  });

  it('retained controller 创建时保留 Core 编译诊断', () => {
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
    const first = controller.read();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    controller.replace({ type: 'scene', children: [{ type: 'node', id: 'second', position: [20, 0] }] });

    const second = controller.read();

    expect(second.revision).toBe(first.revision + 1);
    expect(second.compilation.result.scene).not.toBe(first.compilation.result.scene);
    expect(controller.read()).toBe(second);
    expect(listener).toHaveBeenCalledWith(second);

    expect(() =>
      controller.replace({
        type: 'scene',
        children: [{ type: 'node', id: 'broken', position: [0, 0], shape: 'missing-shape' }],
      }),
    ).toThrow();
    expect(controller.read()).toBe(second);

    unsubscribe();
    controller.replace({ type: 'scene', children: [{ type: 'node', id: 'third', position: [40, 0] }] });

    expect(listener).toHaveBeenCalledTimes(1);

    controller.dispose();

    expect(() =>
      controller.replace({ type: 'scene', children: [{ type: 'node', id: 'after-dispose', position: [60, 0] }] }),
    ).toThrow(/disposed/i);
  });

  it('retained controller 接受新增和移除 Composite contribution 的 InputScene 更新', () => {
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
    const first = controller.read();

    expect(() =>
      controller.replace({ type: 'scene', children: [embed({ adapter, id: 'box', props: {} })] }),
    ).not.toThrow();
    expect(controller.read().revision).toBe(first.revision + 1);

    expect(() =>
      controller.replace({ type: 'scene', children: [{ type: 'node', id: 'restored', position: [20, 0] }] }),
    ).not.toThrow();
    expect(controller.read().revision).toBe(first.revision + 2);

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
    const stable = controller.read();

    expect(() =>
      controller.replace({
        type: 'scene',
        children: [embed({ adapter, id: 'broken', props: {} })],
      }),
    ).toThrow(/expected candidate composite failure/);
    expect(controller.read()).toBe(stable);
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
    const first = controller.read();
    const failure = new Error('expected subscriber failure');
    controller.subscribe(() => {
      throw failure;
    });

    expect(() =>
      controller.replace({ type: 'scene', children: [{ type: 'node', id: 'second', position: [20, 0] }] }),
    ).not.toThrow();
    expect(controller.read().revision).toBe(first.revision + 1);
    expect(controller.diagnostics()).toContain(failure);

    controller.dispose();
  });

  it('已类型化 IRScene 直接进入 processing，不重走 Input normalize', () => {
    const ir: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'node', id: 'source', position: [0, 0] }],
    };

    const prepared = prepareProcessingInput(ir);

    expect(prepared.source).toBe(ir);
  });

  it('retained processing 只在成功 Runtime transaction 后替换完整 result', () => {
    const processing = SceneRuntime.fromInput({
      type: 'scene',
      children: [{ type: 'node', id: 'first', position: [0, 0] }],
    });
    const first = processing.read();
    const listener = vi.fn();
    const unsubscribe = processing.subscribe(listener);

    processing.replace({ type: 'scene', children: [{ type: 'node', id: 'second', position: [20, 0] }] });

    const second = processing.read();

    expect(second.revision).toBe(first.revision + 1);
    expect(second.compilation.result.scene).not.toBe(first.compilation.result.scene);
    expect(listener).toHaveBeenCalledWith(second);
    expect(() =>
      processing.replace({
        type: 'scene',
        children: [{ type: 'node', id: 'broken', position: [0, 0], shape: 'missing-shape' }],
      }),
    ).toThrow();
    expect(processing.read()).toBe(second);

    unsubscribe();
    processing.replace({ type: 'scene', children: [{ type: 'node', id: 'third', position: [40, 0] }] });

    expect(listener).toHaveBeenCalledTimes(1);

    processing.dispose();
  });

  it('持续会话通过 diagnostics 交付并清空 warning 回调异常', () => {
    const cause = new Error('warning callback failed');
    const runtime = SceneRuntime.fromIR(
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
      expect(runtime.read().compilation.result.scene.primitives).toEqual([]);
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
