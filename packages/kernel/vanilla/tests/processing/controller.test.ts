// @vitest-environment jsdom
import type { IRScene } from '@retikz/core';

import { CompositeBaseSchema, defineComposite, defineThemeStyle, ThemeMode } from '@retikz/core';
import { RetikzRuntimeErrorCode } from '@retikz/runtime';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { InputEmbedAdapter, InputScene, VanillaCompileDriver, VanillaCompileDriverSession } from '../../src';

import {
  createProcessingController,
  prepareProcessingInput,
  processToStaticInputResult,
  processToStaticResult,
} from '../../src';

describe('Vanilla processing', () => {
  it('只在 processing prepare 中解析 InputEmbed 的 Composite contribution', () => {
    const definition = defineComposite({
      namespace: 'fixture',
      type: 'box',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('box'),
      }),
      expand: () => ({ children: [] }),
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
              dependencies: [],
              datasets: {},
              makeDefinition,
            },
          ],
        },
      }),
    };
    const input: InputScene = {
      children: [{ type: 'embed', kind: 'fixture-box', id: 'box', props: {} }],
    };

    const prepared = prepareProcessingInput(input, { adapters: [adapter] });

    expect(makeDefinition).toHaveBeenCalledTimes(1);
    expect(prepared.coreOptions.composites).toEqual([definition]);
  });

  it('在同一 Scope 链中把有效 Theme 交给 InputEmbed adapter', () => {
    const themeStyle = defineThemeStyle({
      name: 'academic',
      resolve: () => ({
        semantic: { error: '#aa0000', success: '#00aa00', warning: '#aaaa00' },
        categorical: ['#112233'],
      }),
    });
    const adapter: InputEmbedAdapter<Record<string, never>> = {
      kind: 'theme-probe',
      lower: (_props, context) => {
        expect(context.theme).toMatchObject({ style: 'academic', mode: ThemeMode.Dark });
        expect(context.themeStyles).toEqual([themeStyle]);
        return {
          node: { type: 'node', id: 'theme-probe', position: [0, 0] },
          providerDependencies: { roots: [], providers: [] },
        };
      },
    };

    const prepared = prepareProcessingInput(
      {
        theme: { style: 'academic', mode: ThemeMode.Light },
        children: [
          {
            type: 'scope',
            theme: { mode: ThemeMode.Dark },
            children: [{ type: 'embed', kind: 'theme-probe', id: 'theme-probe', props: {} }],
          },
        ],
      },
      { adapters: [adapter], compile: { themeStyles: [themeStyle] } },
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

    expect(prepareProcessingInput(source, {}).source).toEqual(source);
  });

  it('retained controller 创建时保留 Core 编译诊断', () => {
    expect(() =>
      createProcessingController({
        children: [{ type: 'node', id: 'broken', position: [0, 0], shape: 'missing-shape' }],
      }),
    ).toThrow(/Unknown shape 'missing-shape'/);
  });

  it('controller 仅在完整成功后发布不可变 revision，失败保持上一次结果', () => {
    const controller = createProcessingController({ children: [{ id: 'first', position: [0, 0] }] }, {});
    const first = controller.read();
    const listener = vi.fn();
    const unsubscribe = controller.subscribe(listener);

    controller.update({ children: [{ id: 'second', position: [20, 0] }] });

    const second = controller.read();
    expect(second.revision).toBe(first.revision + 1);
    expect(second.scene).not.toBe(first.scene);
    expect(Object.isFrozen(second)).toBe(true);
    expect(listener).toHaveBeenCalledWith(second);

    expect(() =>
      controller.update({
        children: [{ type: 'node', id: 'broken', position: [0, 0], shape: 'missing-shape' }],
      }),
    ).toThrow();
    expect(controller.read()).toBe(second);

    unsubscribe();
    controller.update({ children: [{ id: 'third', position: [40, 0] }] });
    expect(listener).toHaveBeenCalledTimes(1);
    controller.dispose();
    expect(() => controller.update({ children: [{ id: 'after-dispose', position: [60, 0] }] })).toThrow(/disposed/i);
  });

  it('retained controller 接受新增和移除 Composite contribution 的 InputScene 更新', () => {
    const definition = defineComposite({
      namespace: 'fixture',
      type: 'box',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('box'),
      }),
      expand: () => ({ children: [] }),
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
              dependencies: [],
              datasets: {},
              makeDefinition: () => definition,
            },
          ],
        },
      }),
    };
    const controller = createProcessingController(
      { children: [{ id: 'stable', position: [0, 0] }] },
      { adapters: [adapter] },
    );
    const first = controller.read();

    expect(() =>
      controller.update({
        children: [{ type: 'embed', kind: 'fixture-box', id: 'box', props: {} }],
      }),
    ).not.toThrow();
    expect(controller.read().revision).toBe(first.revision + 1);

    expect(() => controller.update({ children: [{ id: 'restored', position: [20, 0] }] })).not.toThrow();
    expect(controller.read().revision).toBe(first.revision + 2);
    controller.dispose();
  });

  it('候选 Composite topology 编译失败时保留旧 result 并记录 diagnostics', () => {
    const failure = new Error('expected candidate composite failure');
    const definition = defineComposite({
      namespace: 'fixture',
      type: 'broken',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('fixture'),
        type: z.literal('broken'),
      }),
      expand: () => {
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
              dependencies: [],
              datasets: {},
              makeDefinition: () => definition,
            },
          ],
        },
      }),
    };
    const controller = createProcessingController(
      { children: [{ id: 'stable', position: [0, 0] }] },
      { adapters: [adapter] },
    );
    const stable = controller.read();

    expect(() =>
      controller.update({
        children: [{ type: 'embed', kind: 'broken-composite', id: 'broken', props: {} }],
      }),
    ).toThrow(/expected candidate composite failure/);
    expect(controller.read()).toBe(stable);
    expect(controller.diagnostics()).toEqual([
      expect.objectContaining({ message: 'expected candidate composite failure' }),
    ]);
    controller.dispose();
  });

  it('订阅方异常不会回滚已提交 revision，并经诊断边界报告', () => {
    const controller = createProcessingController({ children: [{ id: 'first', position: [0, 0] }] });
    const first = controller.read();
    const failure = new Error('expected subscriber failure');
    controller.subscribe(() => {
      throw failure;
    });

    expect(() => controller.update({ children: [{ id: 'second', position: [20, 0] }] })).not.toThrow();
    expect(controller.read().revision).toBe(first.revision + 1);
    expect(controller.diagnostics()).toContain(failure);
    controller.dispose();
  });

  it('预编译 Scene 只产生 static processing result', () => {
    const scene = { layout: { x: 0, y: 0, width: 1, height: 1 }, primitives: [] };

    const result = processToStaticResult(scene, {});

    expect(result.revision).toBe(0);
    expect(result.compileResult).toBeUndefined();
    expect(result.scene).toBe(scene);
  });

  it('已类型化 IRScene 直接进入 processing，不重走 Input normalize', () => {
    const ir: IRScene = {
      type: 'scene',
      version: 1,
      children: [{ type: 'node', id: 'source', position: [0, 0] }],
    };

    const prepared = prepareProcessingInput(ir, {});

    expect(prepared.source).toBe(ir);
    expect(prepared.authoringSites).toEqual([]);
    expect(prepared.runtimeMeta.layers).toEqual([]);
  });

  it('retained processing 只在成功 Runtime transaction 后替换完整 result', () => {
    const processing = createProcessingController({ children: [{ id: 'first', position: [0, 0] }] });
    const first = processing.read();
    const listener = vi.fn();
    const unsubscribe = processing.subscribe(listener);

    processing.update({ children: [{ id: 'second', position: [20, 0] }] });

    const second = processing.read();
    expect(second.revision).toBe(first.revision + 1);
    expect(second.scene).not.toBe(first.scene);
    expect(listener).toHaveBeenCalledWith(second);
    expect(() =>
      processing.update({ children: [{ id: 'broken', position: [0, 0], shape: 'missing-shape' }] }),
    ).toThrow();
    expect(processing.read()).toBe(second);
    unsubscribe();
    processing.update({ children: [{ id: 'third', position: [40, 0] }] });
    expect(listener).toHaveBeenCalledTimes(1);
    processing.dispose();
  });

  it('controller 在更新间保留同一个 processing instance，并与 static 结果保持一致', () => {
    const instances: Array<object> = [];
    const sessions = new WeakMap<object, VanillaCompileDriverSession>();
    const driver: VanillaCompileDriver = {
      create: input => {
        instances.push(input.instance);
        const existing = sessions.get(input.instance);
        if (existing !== undefined) return existing;
        const session = {
          observers: [],
          resolve: (output: Parameters<VanillaCompileDriverSession['resolve']>[0]) => ({
            primary: output.result,
            observerOutputs: output.observerOutputs,
            layers: [],
            diagnostics: [],
          }),
        };
        sessions.set(input.instance, session);
        return session;
      },
    };
    const first = { children: [{ id: 'first', position: [0, 0] }] };
    const second = { children: [{ id: 'second', position: [20, 0] }] };
    const controller = createProcessingController(first, { compileDriver: driver });

    controller.update(second);

    expect(instances).toHaveLength(2);
    expect(instances[1]).toBe(instances[0]);
    const staticResult = processToStaticInputResult(second, { compileDriver: driver });
    const retainedResult = controller.read();
    expect(retainedResult.revision).toBe(1);
    expect(retainedResult.scene).toEqual(staticResult.scene);
    expect(retainedResult.compileResult).toEqual(staticResult.compileResult);
    expect(retainedResult.artifacts).toEqual(staticResult.artifacts);
    expect(retainedResult.layers).toEqual(staticResult.layers);
    expect(retainedResult.diagnostics).toEqual(staticResult.diagnostics);
    expect(retainedResult.runtimeMeta.layers).toEqual(staticResult.runtimeMeta.layers);
    controller.dispose();
  });

  it('compile driver 解析失败时不发布 retained candidate，并恢复上一份 driver 输入', () => {
    let reject = false;
    const session: VanillaCompileDriverSession = {
      observers: [],
      resolve: output => {
        if (reject) throw new Error('expected driver resolution failure');
        return { primary: output.result, observerOutputs: output.observerOutputs, layers: [], diagnostics: [] };
      },
    };
    const driver: VanillaCompileDriver = {
      create: input => {
        reject = input.source.children.some(child => child.id === 'broken');
        return session;
      },
    };
    const controller = createProcessingController(
      { children: [{ id: 'stable', position: [0, 0] }] },
      { compileDriver: driver },
    );
    const stable = controller.read();
    const listener = vi.fn();
    controller.subscribe(listener);

    expect(() => controller.update({ children: [{ id: 'broken', position: [20, 0] }] })).toThrow(
      /RUNTIME_PARTICIPANT_PREPARE_FAILED/,
    );

    expect(controller.read()).toBe(stable);
    expect(listener).not.toHaveBeenCalled();
    expect(controller.diagnostics()).toEqual([
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantPrepareFailed }),
    ]);
    controller.update({ children: [{ id: 'recovered', position: [40, 0] }] });
    expect(controller.read().revision).toBe(stable.revision + 1);
    controller.dispose();
  });
});
