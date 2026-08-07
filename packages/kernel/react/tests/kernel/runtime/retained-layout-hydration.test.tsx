// @vitest-environment jsdom
import type { IRScene } from '@retikz/core';
import type {
  RenderFrameSnapshot,
  RetainedRendererFactory,
  RetainedRendererFactoryInput,
} from '@retikz/render/runtime';
import type { RuntimePreparedCommit } from '@retikz/runtime';

import { defineRetainedRenderer } from '@retikz/render/runtime';
import { StrictMode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { renderToString } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Layout } from '../../../src';

const source = (fill: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'changed', position: [0, 0], shape: 'rectangle', fill },
    { type: 'node', id: 'stable', position: [40, 0], shape: 'rectangle', fill: '#ffffff' },
  ],
});

/** 在 jsdom 中生成真实服务端 seed，并隔离预期的 layout-effect warning */
const renderSeed = (ir: IRScene): string => {
  const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  try {
    return renderToString(<Layout idPrefix="hydration" ir={ir} />);
  } finally {
    error.mockRestore();
  }
};

/** 构造记录每个 renderer instance dispose 次数的第三方 factory */
const createDisposeRecordingFactory = (disposeCounts: Array<number>): RetainedRendererFactory =>
  ((input: RetainedRendererFactoryInput) => {
    const instance = disposeCounts.push(0) - 1;
    let current: RenderFrameSnapshot | undefined;
    const prepare = (frame: RenderFrameSnapshot): RuntimePreparedCommit => {
      const previous = current;
      return Object.freeze({
        commit: () => {
          current = frame;
        },
        rollback: () => {
          current = previous;
        },
        dispose: () => undefined,
      });
    };
    const definition = {
      capability: 'entity' as const,
      readonlyLayerCapability: 'supported' as const,
      prepareMount: (frame: RenderFrameSnapshot) => prepare(frame),
      prepare: (_patch: unknown, frame: RenderFrameSnapshot) => prepare(frame),
      read: () => {
        if (current === undefined) throw new Error('renderer is not committed');
        return Object.freeze({ frame: current });
      },
      dispose: () => {
        current = undefined;
        disposeCounts[instance] += 1;
      },
    };
    return input.backend === 'svg'
      ? defineRetainedRenderer({ ...definition, backend: 'svg', host: input.host })
      : defineRetainedRenderer({ ...definition, backend: 'canvas', host: input.host });
  }) as RetainedRendererFactory;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('React Layout retained hydration', () => {
  it('matching SSR seed 原位接管，后续 rerender 不让 React 重写 renderer-owned descendants', async () => {
    const container = document.createElement('div');
    container.innerHTML = renderSeed(source('#ef4444'));
    const stable = container.querySelector('[data-retikz-id="stable"]');
    const changed = container.querySelector('[data-retikz-id="changed"]');

    const root = hydrateRoot(container, <Layout idPrefix="hydration" ir={source('#ef4444')} />);
    await act(() => Promise.resolve());

    expect(container.querySelector('[data-retikz-id="stable"]')).toBe(stable);
    expect(container.querySelector('[data-retikz-id="changed"]')).toBe(changed);

    await act(() => root.render(<Layout idPrefix="hydration" ir={source('#22c55e')} />));
    const retainedChanged = container.querySelector('[data-retikz-id="changed"]');
    expect(retainedChanged).toBe(changed);
    expect(retainedChanged?.getAttribute('fill')).toBe('#22c55e');

    await act(() => root.render(<Layout className="config-only" idPrefix="hydration" ir={source('#22c55e')} />));
    expect(container.querySelector('[data-retikz-id="changed"]')).toBe(retainedChanged);
    expect(retainedChanged?.getAttribute('fill')).toBe('#22c55e');
    await act(() => root.unmount());
  });

  it('mismatched SSR seed 在首个 committed callback 发布前完成 replace', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const container = document.createElement('div');
    container.innerHTML = renderSeed(source('#ef4444'));
    const mismatched = container.querySelector('[data-retikz-id="changed"]');
    mismatched?.setAttribute('fill', '#000000');
    const onArtifacts = vi.fn(() => {
      const committed = container.querySelector('[data-retikz-id="changed"]');
      expect(committed).not.toBe(mismatched);
      expect(committed?.getAttribute('fill')).toBe('#ef4444');
    });

    const root = hydrateRoot(
      container,
      <Layout
        artifacts={{ nodeLayouts: true }}
        idPrefix="hydration"
        ir={source('#ef4444')}
        onArtifacts={onArtifacts}
      />,
      { onRecoverableError: () => undefined },
    );
    await act(() => Promise.resolve());

    expect(onArtifacts).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-retikz-id="changed"]')?.getAttribute('fill')).toBe('#ef4444');
    await act(() => root.unmount());
    error.mockRestore();
  });

  it('StrictMode effect replay 与最终 unmount 对每个 renderer instance 只 dispose 一次', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const disposeCounts: Array<number> = [];
    const rendererFactory = createDisposeRecordingFactory(disposeCounts);

    await act(() =>
      root.render(
        <StrictMode>
          <Layout idPrefix="strict" ir={source('#ef4444')} runtime={{ rendererFactory }} />
        </StrictMode>,
      ),
    );
    expect(disposeCounts.length).toBeGreaterThanOrEqual(2);

    await act(() => root.unmount());
    expect(disposeCounts.every(count => count === 1)).toBe(true);
  });
});
