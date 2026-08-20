// @vitest-environment jsdom
import type {
  InputEmbedAdapter,
  ProcessingController,
  VanillaCompileDriver,
  VanillaCompileDriverSession,
} from '@retikz/vanilla';

import { defineThemeStyle, ThemeMode } from '@retikz/core';
import * as vanilla from '@retikz/vanilla';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Layout, Node, Scope } from '../../../src';
const testThemeStyle = defineThemeStyle({
  name: 'academic',
  resolve: () => ({
    semantic: { error: '#aa0000', success: '#00aa00', warning: '#aaaa00' },
    categorical: ['#112233'],
  }),
});

/** 创建记录完整帧提交的 Vanilla compile driver */
const createCommitTrackingCompileDriver = (): Readonly<{
  driver: VanillaCompileDriver;
  commit: ReturnType<typeof vi.fn>;
}> => {
  const sessions = new WeakMap<object, VanillaCompileDriverSession>();
  const commit = vi.fn();
  const driver: VanillaCompileDriver = {
    create: input => {
      const existing = sessions.get(input.instance);
      if (existing !== undefined) return existing;
      const session: VanillaCompileDriverSession = {
        observers: [],
        resolve: output => ({
          primary: output.result,
          observerOutputs: output.observerOutputs,
          layers: [],
          diagnostics: [],
        }),
        commit,
      };
      sessions.set(input.instance, session);
      return session;
    },
  };
  return Object.freeze({ driver, commit });
};

describe('<Layout> 的 Vanilla Input processing', () => {
  beforeEach(() => {
    (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
    document.body.replaceChildren();
  });

  it('将 JSX children 作为 InputScene 交给 static processing', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <Layout runtime={{ mode: 'static' }}>
          <Node id="input-node" position={[0, 0]} />
        </Layout>,
      ),
    );

    expect(container.querySelector('[data-retikz-id="input-node"]')).not.toBeNull();
    await act(() => root.unmount());
  });

  it('static processing 只在 React 提交后通知 compile driver', async () => {
    const { driver, commit } = createCommitTrackingCompileDriver();

    renderToStaticMarkup(
      <Layout compileDriver={driver} runtime={{ mode: 'static' }}>
        <Node id="static-commit-node" position={[0, 0]} />
      </Layout>,
    );
    expect(commit).not.toHaveBeenCalled();

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(() =>
      root.render(
        <Layout compileDriver={driver} runtime={{ mode: 'static' }}>
          <Node id="static-commit-node" position={[0, 0]} />
        </Layout>,
      ),
    );

    expect(commit).toHaveBeenCalledTimes(1);
    await act(() => root.unmount());
  });

  it('retained 初次挂载只提交 controller 的成功结果', async () => {
    const { driver, commit } = createCommitTrackingCompileDriver();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <Layout compileDriver={driver}>
          <Node id="retained-commit-node" position={[0, 0]} />
        </Layout>,
      ),
    );

    expect(commit).toHaveBeenCalledTimes(1);
    await act(() => root.unmount());
  });

  it('Strict Effects 不提交被丢弃的 retained fallback', async () => {
    const { driver, commit } = createCommitTrackingCompileDriver();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <StrictMode>
          <Layout compileDriver={driver}>
            <Node id="strict-commit-node" position={[0, 0]} />
          </Layout>
        </StrictMode>,
      ),
    );

    expect(commit).toHaveBeenCalledTimes(2);
    await act(() => root.unmount());
  });

  it('retained processing 在 Strict Effects 重放后仍保持可订阅', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <StrictMode>
          <Layout>
            <Node id="strict-node" position={[0, 0]} />
          </Layout>
        </StrictMode>,
      ),
    );

    expect(container.querySelector('[data-retikz-id="strict-node"]')).not.toBeNull();
    await act(() => root.unmount());
  });

  it('retained processing 将 JSX source 更新推入同一 Vanilla controller', async () => {
    const instances: Array<object> = [];
    const sessions = new WeakMap<object, VanillaCompileDriverSession>();
    const compileDriver: VanillaCompileDriver = {
      create: input => {
        instances.push(input.instance);
        const existing = sessions.get(input.instance);
        if (existing !== undefined) return existing;
        const session: VanillaCompileDriverSession = {
          observers: [],
          resolve: output => ({
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
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <Layout compileDriver={compileDriver}>
          <Node id="first" position={[0, 0]} />
        </Layout>,
      ),
    );
    await act(() =>
      root.render(
        <Layout compileDriver={compileDriver}>
          <Node id="second" position={[20, 0]} />
        </Layout>,
      ),
    );

    expect(instances).toHaveLength(3);
    expect(instances[2]).toBe(instances[1]);
    expect(container.querySelector('[data-retikz-id="second"]')).not.toBeNull();
    await act(() => root.unmount());
  });

  it('将 Vanilla controller 的结构化诊断转发给 runtime.onDiagnostic', async () => {
    const diagnostic = Object.freeze({
      code: 'RUNTIME_TEST_DIAGNOSTIC',
      phase: 'run' as const,
      severity: 'warning' as const,
      message: 'test diagnostic',
    });
    const controller = vanilla.createProcessingController({ children: [{ id: 'diagnostic-node', position: [0, 0] }] });
    const diagnostics = vi.fn(() => Object.freeze([diagnostic]));
    const observedController: ProcessingController = Object.freeze({ ...controller, diagnostics });
    vi.spyOn(vanilla, 'createProcessingController').mockReturnValue(observedController);
    const onDiagnostic = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() => root.render(<Layout runtime={{ onDiagnostic }} />));

    expect(onDiagnostic).toHaveBeenCalledWith(diagnostic);
    expect(diagnostics).toHaveBeenCalledTimes(1);
    await act(() => root.unmount());
  });

  it('Strict Effects 重放后在最终卸载时释放 Vanilla controller', async () => {
    vi.useFakeTimers();
    const createController = vanilla.createProcessingController;
    const controllers: Array<Readonly<{ controller: ProcessingController; dispose: ReturnType<typeof vi.fn> }>> = [];
    vi.spyOn(vanilla, 'createProcessingController').mockImplementation((source, options) => {
      const controller = createController(source, options);
      const dispose = vi.fn(controller.dispose);
      const observedController: ProcessingController = Object.freeze({ ...controller, dispose });
      controllers.push(Object.freeze({ controller: observedController, dispose }));
      return observedController;
    });
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <StrictMode>
          <Layout>
            <Node id="dispose-node" position={[0, 0]} />
          </Layout>
        </StrictMode>,
      ),
    );
    expect(controllers).toHaveLength(2);

    await act(() => root.unmount());
    await act(() => vi.runAllTimers());

    for (const controller of controllers) expect(controller.dispose).toHaveBeenCalledTimes(1);
  });

  it('retained source update 失败时保留最后成功宿主帧', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <Layout>
          <Node id="stable-node" position={[0, 0]} />
        </Layout>,
      ),
    );
    expect(container.querySelector('[data-retikz-id="stable-node"]')).not.toBeNull();

    await expect(
      act(() =>
        root.render(
          <Layout>
            <Node id="stable-node" position={[0, 0]} />
            <Node id="stable-node" position={[20, 0]} />
          </Layout>,
        ),
      ),
    ).resolves.toBeUndefined();

    expect(container.querySelectorAll('[data-retikz-id="stable-node"]')).toHaveLength(1);
    await act(() => root.unmount());
  });

  it('仅通过 Vanilla processing 将嵌入式 Scope Theme 交给 React bridge', async () => {
    const receiveContext = vi.fn();
    const adapter: InputEmbedAdapter = {
      kind: 'ThemeProbe',
      lower: (_props, context) => {
        receiveContext(context);
        return {
          node: { type: 'node', id: 'theme-probe', position: [0, 0] },
          providerDependencies: { roots: [], providers: [] },
        };
      },
    };
    const ThemeProbe = Object.assign(() => null, {
      isTier2Embeddable: true as const,
      inputEmbedAdapter: adapter,
    });
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <Layout theme={{ style: 'academic', mode: ThemeMode.Light }} themeStyles={[testThemeStyle]}>
          <Scope theme={{ mode: ThemeMode.Dark }}>
            <ThemeProbe />
          </Scope>
        </Layout>,
      ),
    );

    expect(receiveContext).toHaveBeenCalledWith(
      expect.objectContaining({
        theme: expect.objectContaining({ style: 'academic', mode: ThemeMode.Dark }),
        themeStyles: [testThemeStyle],
      }),
    );
    await act(() => root.unmount());
  });
});
