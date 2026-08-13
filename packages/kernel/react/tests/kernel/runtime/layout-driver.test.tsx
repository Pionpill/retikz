// @vitest-environment jsdom
import type { AnyCompositeDefinition, CompileObserverDefinition, CoreProgramOutput, IRScene } from '@retikz/core';
import type { RenderReadonlyLayer } from '@retikz/render/runtime';

import { compileToScene } from '@retikz/core';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type { LayoutCompileDriver, LayoutCompileOutput } from '../../../src';

import {
  compileLayoutWithDriver,
  createLayoutCompileDriverSession,
  defaultLayoutCompileDriver,
  Layout,
  LayoutCompileDriverError,
  resolveLayoutCompileOutput,
} from '../../../src';

const source = (stroke: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    {
      type: 'path',
      stroke,
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [20, 0] },
      ],
    },
  ],
});

const observer: CompileObserverDefinition<string> = Object.freeze({
  key: 'fixture/react-driver',
  createSession: () =>
    Object.freeze({
      select: () => false,
      observe: () => undefined,
      complete: () => 'same-revision',
    }),
});

const createDriver = (onCommit = vi.fn()): LayoutCompileDriver => {
  const session = Object.freeze({
    observers: Object.freeze([observer]),
    resolve: (coreOutput: CoreProgramOutput<ReadonlyArray<AnyCompositeDefinition>>): LayoutCompileOutput => {
      expect(coreOutput.observerOutputs).toEqual([{ key: observer.key, value: 'same-revision' }]);
      const layers: ReadonlyArray<RenderReadonlyLayer> = Object.freeze([
        Object.freeze({
          key: 'fixture-layer',
          scene: coreOutput.result.scene,
          transform: [1, 0, 0, 1, 0, 4] as const,
        }),
      ]);
      return Object.freeze({
        primary: coreOutput.result,
        observerOutputs: coreOutput.observerOutputs,
        layers,
        diagnostics: Object.freeze(['same-revision']),
      });
    },
    commit: onCommit,
  });
  return Object.freeze({ create: () => session });
};

const normalizeEmptyElements = (value: string): string => value.replace(/><\/(ellipse|path|rect)>/g, ' />');

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

describe('Layout compile driver', () => {
  it('默认 driver 使用空 observers、空 diagnostics 与冻结空 readonly layers', () => {
    const session = defaultLayoutCompileDriver.create({
      instance: {},
      source: source('#111827'),
      authoringSites: Object.freeze([]),
      coreOptions: {},
    });

    expect(session.observers).toEqual([]);
    const output = session.resolve({
      result: {
        scene: { primitives: [], layout: { x: 0, y: 0, width: 0, height: 0 } },
        artifacts: [],
        spatialHandles: { entries: [] },
      },
      diagnostics: [],
      observerOutputs: [],
    });
    expect(output.observerOutputs).toEqual([]);
    expect(output.layers).toEqual([]);
    expect(output.diagnostics).toEqual([]);
    expect(Object.isFrozen(output.layers)).toBe(true);
  });

  it('driver session 会脱离并冻结 observers 列表', () => {
    const observers: Array<CompileObserverDefinition> = [observer];
    const driver: LayoutCompileDriver = Object.freeze({
      create: () => ({
        observers,
        resolve: coreOutput => ({
          primary: coreOutput.result,
          observerOutputs: coreOutput.observerOutputs,
          layers: Object.freeze([]),
          diagnostics: Object.freeze([]),
        }),
      }),
    });
    const session = createLayoutCompileDriverSession(driver, {
      instance: {},
      source: source('#111827'),
      authoringSites: Object.freeze([]),
      coreOptions: {},
    });

    observers.length = 0;
    expect(session.observers).toEqual([observer]);
    expect(Object.isFrozen(session.observers)).toBe(true);
    expect(Object.isFrozen(session)).toBe(true);
  });

  it('driver 返回非法只读层时统一抛出可由 retained host 回滚的结构化错误', () => {
    const coreOutput: CoreProgramOutput<ReadonlyArray<AnyCompositeDefinition>> = Object.freeze({
      result: compileToScene(source('#111827'), {}),
      diagnostics: Object.freeze([]),
      observerOutputs: Object.freeze([]),
    });
    const duplicateLayer = Object.freeze({
      key: 'duplicate',
      scene: coreOutput.result.scene,
      transform: [1, 0, 0, 1, 0, 0] as const,
    });
    const session = Object.freeze({
      observers: Object.freeze([]),
      resolve: () =>
        Object.freeze({
          primary: coreOutput.result,
          observerOutputs: coreOutput.observerOutputs,
          layers: Object.freeze([duplicateLayer, duplicateLayer]),
          diagnostics: Object.freeze([]),
        }),
    });

    expect(() => resolveLayoutCompileOutput(session, coreOutput)).toThrow(LayoutCompileDriverError);
  });

  it('static 与 retained SSR 通过同一 driver 得到相同 primary 与 readonly layer', () => {
    const driver = createDriver();
    const staticHtml = renderToString(
      <Layout ir={source('#2563eb')} compileDriver={driver} idPrefix="driver" runtime={{ mode: 'static' }} />,
    );
    const retainedHtml = renderToString(<Layout ir={source('#2563eb')} compileDriver={driver} idPrefix="driver" />);

    expect(staticHtml.match(/<path/g)).toHaveLength(2);
    expect(normalizeEmptyElements(retainedHtml)).toBe(normalizeEmptyElements(staticHtml));
  });

  it('static observed driver 保留 Core onWarn 通知', () => {
    const onWarn = vi.fn();
    const input = Object.freeze({
      instance: {},
      source: {
        version: 1 as const,
        type: 'scene' as const,
        children: [{ namespace: 'missing', type: 'composite' }],
      },
      authoringSites: Object.freeze([]),
      coreOptions: { onWarn },
    });
    const session = createLayoutCompileDriverSession(createDriver(), input);

    compileLayoutWithDriver(input, session);

    expect(onWarn).toHaveBeenCalledTimes(1);
  });

  it('retained 只在整帧提交后发布同 revision output，driver 失败保留上一帧', async () => {
    const onCommit = vi.fn();
    const onRuntimeDiagnostic = vi.fn();
    let reject = false;
    let resolveCount = 0;
    const base = createDriver(onCommit);
    const baseSession = base.create({
      instance: {},
      source: source('#ef4444'),
      authoringSites: [],
      coreOptions: {},
    });
    const session = Object.freeze({
      ...baseSession,
      resolve: (output: CoreProgramOutput<ReadonlyArray<AnyCompositeDefinition>>) => {
        resolveCount += 1;
        if (reject && resolveCount >= 5) throw new Error('driver rejected candidate');
        return baseSession.resolve(output);
      },
    });
    const driver: LayoutCompileDriver = {
      create: () => session,
    };
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <Layout ir={source('#ef4444')} compileDriver={driver} runtime={{ onDiagnostic: onRuntimeDiagnostic }} />,
      ),
    );
    const committed = container.querySelector('path');
    expect(committed?.getAttribute('stroke')).toBe('#ef4444');
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]?.[0]).toMatchObject({ diagnostics: ['same-revision'] });

    reject = true;
    await act(() =>
      root.render(
        <Layout ir={source('#22c55e')} compileDriver={driver} runtime={{ onDiagnostic: onRuntimeDiagnostic }} />,
      ),
    );
    expect(onRuntimeDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_PREPARE_FAILED', phase: 'run' }),
    );
    expect(onRuntimeDiagnostic).toHaveBeenCalledTimes(1);
    expect(container.querySelector('path') === committed).toBe(true);
    expect(committed?.getAttribute('stroke')).toBe('#ef4444');
    expect(onCommit).toHaveBeenCalledTimes(1);
    await act(() => root.unmount());
  });

  it('hydration 原位接管同一 driver frame 并在 commit 后发布 output', async () => {
    const serverDriver = createDriver();
    const html = renderToString(
      <Layout ir={source('#7c3aed')} compileDriver={serverDriver} idPrefix="driver-hydrate" />,
    );
    const container = document.createElement('div');
    container.innerHTML = html;
    expect(container.querySelector('[data-retikz-readonly-layer="fixture-layer"]')).not.toBeNull();
    const onCommit = vi.fn();
    const clientDriver = createDriver(onCommit);

    const root = hydrateRoot(
      container,
      <Layout ir={source('#7c3aed')} compileDriver={clientDriver} idPrefix="driver-hydrate" />,
    );
    await act(() => Promise.resolve());

    expect(container.querySelectorAll('[data-retikz-readonly-layer="fixture-layer"]')).toHaveLength(1);
    expect(onCommit).toHaveBeenCalledTimes(1);
    expect(onCommit.mock.calls[0]?.[0]).toMatchObject({ diagnostics: ['same-revision'] });
    await act(() => root.unmount());
  });
});
