// @vitest-environment jsdom

import { defineTheme, ThemeMode } from '@retikz/core';
import type { InputEmbedAdapter } from '@retikz/vanilla';
import * as vanilla from '@retikz/vanilla';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Layout, Node, Scope } from '../../../src';

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

  it('static processing 只在 React 提交后通知编译结果', async () => {
    const commit = vi.fn();

    renderToStaticMarkup(
      <Layout onCompileResult={commit} runtime={{ mode: 'static' }}>
        <Node id="static-commit-node" position={[0, 0]} />
      </Layout>,
    );

    expect(commit).not.toHaveBeenCalled();

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(() =>
      root.render(
        <Layout onCompileResult={commit} runtime={{ mode: 'static' }}>
          <Node id="static-commit-node" position={[0, 0]} />
        </Layout>,
      ),
    );

    expect(commit).toHaveBeenCalledTimes(1);

    await act(() => root.unmount());
  });

  it('session 初次挂载只提交 controller 的成功结果', async () => {
    const commit = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <Layout onCompileResult={commit}>
          <Node id="session-commit-node" position={[0, 0]} />
        </Layout>,
      ),
    );

    expect(commit).toHaveBeenCalledTimes(1);

    await act(() => root.unmount());
  });

  it('Strict Effects 不提交被丢弃的 session fallback', async () => {
    const commit = vi.fn();
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <StrictMode>
          <Layout onCompileResult={commit}>
            <Node id="strict-commit-node" position={[0, 0]} />
          </Layout>
        </StrictMode>,
      ),
    );

    expect(commit).toHaveBeenCalledOnce();

    await act(() => root.unmount());
  });

  it('session processing 在 Strict Effects 重放后仍保持可订阅', async () => {
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

  it('session processing 将 JSX source 更新推入同一 Vanilla controller', async () => {
    const mount = vi.spyOn(vanilla.SceneRuntime, 'fromInput');
    const replaceInput = vi.spyOn(vanilla.SceneRuntime.prototype, 'replaceInput');
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() =>
      root.render(
        <Layout>
          <Node id="first" position={[0, 0]} />
        </Layout>,
      ),
    );
    const initialSessions = mount.mock.results.map(result => result.value);
    await act(() =>
      root.render(
        <Layout>
          <Node id="second" position={[20, 0]} />
        </Layout>,
      ),
    );

    expect(mount).toHaveBeenCalledTimes(initialSessions.length);
    expect(replaceInput).toHaveBeenCalledOnce();
    expect(initialSessions).toContain(replaceInput.mock.contexts[0]);
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
    const diagnostics = vi.fn(() => Object.freeze([diagnostic]));
    const fromInput = vanilla.SceneRuntime.fromInput;
    vi.spyOn(vanilla.SceneRuntime, 'fromInput').mockImplementation((...args) => {
      const controller = fromInput(...args);
      vi.spyOn(controller, 'diagnostics').mockImplementation(diagnostics);
      return controller;
    });
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
    const createController = vanilla.SceneRuntime.fromInput;
    const disposers: Array<ReturnType<typeof vi.fn>> = [];
    vi.spyOn(vanilla.SceneRuntime, 'fromInput').mockImplementation((source, options) => {
      const controller = createController(source, options);
      disposers.push(vi.spyOn(controller, 'dispose'));

      return controller;
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

    // 单次编译的会话已经释放；这里只统计 Strict Effects 创建的持续会话
    expect(disposers.filter(dispose => dispose.mock.calls.length === 0)).toHaveLength(2);

    await act(() => root.unmount());
    await act(() => vi.runAllTimers());

    for (const dispose of disposers) expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('session source update 失败时保留最后成功宿主帧', async () => {
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

    const successfulFrame = container.innerHTML;

    await expect(
      act(() =>
        root.render(
          <Layout>
            <Node id="stable-node" position={[0, 0]} />
            <Node id="invalid-node" position={[20, 0]} shape={{ type: 'unregistered-rollback-shape' }} />
          </Layout>,
        ),
      ),
    ).resolves.toBeUndefined();

    expect(container.querySelectorAll('[data-retikz-id="stable-node"]')).toHaveLength(1);
    expect(container.innerHTML).toBe(successfulFrame);

    await act(() => root.unmount());
  });

  it('Scope 主题由 Core 解析，embed 只收到作者位置', async () => {
    const resolveTheme = vi.fn(() => ({}));
    const testTheme = defineTheme({ name: 'academic', resolve: resolveTheme });
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
        <Layout theme={{ name: 'academic', mode: ThemeMode.Light }} extensions={{ themeDefinitions: [testTheme] }}>
          <Scope theme={{ mode: ThemeMode.Dark }}>
            <ThemeProbe />
          </Scope>
        </Layout>,
      ),
    );

    expect(resolveTheme).toHaveBeenCalledWith({ mode: ThemeMode.Dark });
    expect(receiveContext).toHaveBeenCalled();
    for (const [context] of receiveContext.mock.calls) {
      expect(context).not.toHaveProperty('theme');
      expect(context).not.toHaveProperty('themeDefinitions');
    }

    await act(() => root.unmount());
  });
});
