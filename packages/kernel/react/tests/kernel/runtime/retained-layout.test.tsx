// @vitest-environment jsdom
import type { IRScene, SceneRuntimeSnapshot } from '@retikz/core';
import type {
  RenderRuntimeConfig,
  RetainedRendererFactory,
  RetainedRendererFactoryInput,
} from '@retikz/render/runtime';
import type { RuntimePreparedCommit } from '@retikz/runtime';

import { CompositeBaseSchema, defineComposite } from '@retikz/core';
import { defineRetainedRenderer } from '@retikz/render/runtime';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import { Layout, Node } from '../../../src';

const source = (fill: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'changed', position: [0, 0], shape: 'rectangle', fill },
    { type: 'node', id: 'stable', position: [40, 0], shape: 'rectangle', fill: '#ffffff' },
  ],
});

const stableComposite = defineComposite({
  namespace: 'fixture',
  type: 'stable',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('fixture'),
    type: z.literal('stable'),
  }),
  expand: () => ({ type: 'node', id: 'stable-composite', position: [0, 0], shape: 'rectangle' }),
});

const compositeSource: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ namespace: 'fixture', type: 'stable' }],
};

/** 构造只保留 committed snapshot 的第三方 renderer */
const createMemoryRendererFactory = (
  capability: 'none' | 'entity',
  onDispose?: () => void,
  onPrepare?: (host: SVGSVGElement | HTMLCanvasElement, config: RenderRuntimeConfig) => void,
): RetainedRendererFactory =>
  ((input: RetainedRendererFactoryInput) => {
    let current: SceneRuntimeSnapshot | undefined;
    const prepare = (snapshot: SceneRuntimeSnapshot, config: RenderRuntimeConfig): RuntimePreparedCommit => {
      onPrepare?.(input.host, config);
      const previous = current;
      return Object.freeze({
        commit: () => {
          current = snapshot;
        },
        rollback: () => {
          current = previous;
        },
        dispose: () => undefined,
      });
    };
    const definition = {
      capability,
      prepareMount: (snapshot: SceneRuntimeSnapshot, config: RenderRuntimeConfig) => prepare(snapshot, config),
      prepare: (_patch: unknown, snapshot: SceneRuntimeSnapshot, config: RenderRuntimeConfig) =>
        prepare(snapshot, config),
      read: () => {
        if (current === undefined) throw new Error('memory renderer is not committed');
        return Object.freeze({ snapshot: current });
      },
      dispose: () => {
        current = undefined;
        onDispose?.();
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

describe('React Layout retained Runtime', () => {
  it('Definition 数组容器重建但元素 identity 不变时复用 retained session', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const baseFactory = createMemoryRendererFactory('entity');
    const rendererFactory = vi.fn(baseFactory) as unknown as RetainedRendererFactory;

    await act(() =>
      root.render(<Layout ir={compositeSource} composites={[stableComposite]} runtime={{ rendererFactory }} />),
    );
    const stable = container.querySelector('[data-retikz-id="stable-composite"]');
    await act(() =>
      root.render(<Layout ir={compositeSource} composites={[stableComposite]} runtime={{ rendererFactory }} />),
    );

    expect(rendererFactory).toHaveBeenCalledTimes(1);
    expect(container.querySelector('[data-retikz-id="stable-composite"]')).toBe(stable);
    await act(() => root.unmount());
  });

  it('等价 inline JSX 与显式 composite Definition 复用 retained session', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const baseFactory = createMemoryRendererFactory('entity');
    const rendererFactory = vi.fn(baseFactory) as unknown as RetainedRendererFactory;

    await act(() =>
      root.render(
        <Layout composites={[stableComposite]} runtime={{ rendererFactory }}>
          <Node id="node" position={[0, 0]} />
        </Layout>,
      ),
    );
    await act(() =>
      root.render(
        <Layout composites={[stableComposite]} runtime={{ rendererFactory }}>
          <Node id="node" position={[0, 0]} />
        </Layout>,
      ),
    );

    expect(rendererFactory).toHaveBeenCalledTimes(1);
    await act(() => root.unmount());
  });

  it('普通 JSX/IR rerender 复用 session，并保留未变 SVG 节点 identity', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(() => root.render(<Layout ir={source('#ef4444')} />));
    const stable = container.querySelector('[data-retikz-id="stable"]');

    await act(() => root.render(<Layout ir={source('#22c55e')} />));

    expect(container.querySelector('[data-retikz-id="stable"]')).toBe(stable);
    await act(() => root.unmount());
  });

  it('onArtifacts 只在 Core artifact commit 时调用，config-only 更新不重复调用', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onArtifacts = vi.fn();
    const initial = source('#ef4444');
    await act(() =>
      root.render(<Layout ir={initial} artifacts={{ nodeLayouts: true }} onArtifacts={onArtifacts} handlers={{}} />),
    );
    expect(onArtifacts).toHaveBeenCalledTimes(1);

    await act(() =>
      root.render(
        <Layout
          ir={initial}
          artifacts={{ nodeLayouts: true }}
          onArtifacts={onArtifacts}
          handlers={{ changed: { click: vi.fn() } }}
        />,
      ),
    );
    expect(onArtifacts).toHaveBeenCalledTimes(1);

    await act(() =>
      root.render(
        <Layout ir={source('#22c55e')} artifacts={{ nodeLayouts: true }} onArtifacts={onArtifacts} handlers={{}} />,
      ),
    );
    expect(onArtifacts).toHaveBeenCalledTimes(2);
    await act(() => root.unmount());
  });

  it('replace-only renderer fallback diagnostic 在成功 transaction 后投递', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const onDiagnostic = vi.fn();
    const rendererFactory = createMemoryRendererFactory('none');
    await act(() => root.render(<Layout ir={source('#ef4444')} runtime={{ rendererFactory, onDiagnostic }} />));

    await act(() => root.render(<Layout ir={source('#22c55e')} runtime={{ rendererFactory, onDiagnostic }} />));

    expect(onDiagnostic).toHaveBeenCalledWith(
      expect.objectContaining({ code: 'RETAINED_RENDERER_CAPABILITY_FALLBACK', severity: 'warning' }),
    );
    await act(() => root.unmount());
  });

  it('onArtifacts throw 只告警，不回滚已提交 host', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(() =>
      root.render(
        <Layout
          ir={source('#ef4444')}
          artifacts={{ nodeLayouts: true }}
          onArtifacts={() => {
            throw new Error('callback failure');
          }}
        />,
      ),
    );

    expect(container.querySelector('[data-retikz-id="changed"]')).not.toBeNull();
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('onArtifacts callback failed'), expect.any(Error));
    await act(() => root.unmount());
  });

  it('animationRef callback throw 只告警、initial 不重复发布且仍可清理 session', async () => {
    const warning = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const container = document.createElement('div');
    const root = createRoot(container);
    const onDispose = vi.fn();
    const rendererFactory = createMemoryRendererFactory('entity', onDispose);
    const animationRef = vi.fn(() => {
      if (animationRef.mock.calls.length === 1) throw new Error('ref callback failure');
    });

    await act(() =>
      root.render(<Layout ir={source('#ef4444')} animationRef={animationRef} runtime={{ rendererFactory }} />),
    );

    expect(animationRef).toHaveBeenCalledTimes(1);
    expect(warning).toHaveBeenCalledWith(expect.stringContaining('animationRef callback failed'), expect.any(Error));
    await act(() => root.unmount());
    expect(onDispose).toHaveBeenCalledTimes(1);
  });

  it('Canvas numeric bitmap size 变化时复用 retained session 并重新 prepare', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const widths: Array<number> = [];
    const onDispose = vi.fn();
    const rendererFactory = createMemoryRendererFactory('entity', onDispose, (host, config) => {
      if (host instanceof HTMLCanvasElement && config.canvas?.width !== undefined) widths.push(config.canvas.width);
    });

    await act(() =>
      root.render(<Layout renderer="canvas" ir={source('#ef4444')} width={100} runtime={{ rendererFactory }} />),
    );
    await act(() =>
      root.render(<Layout renderer="canvas" ir={source('#ef4444')} width={200} runtime={{ rendererFactory }} />),
    );

    expect(widths).toEqual([100, 200]);
    expect(onDispose).not.toHaveBeenCalled();
    await act(() => root.unmount());
    expect(onDispose).toHaveBeenCalledTimes(1);
  });

  it('Canvas config prepare 失败时 React 不提前修改 committed bitmap 尺寸', async () => {
    vi.spyOn(console, 'error').mockImplementation(() => undefined);
    const preventReportedError = (event: ErrorEvent): void => event.preventDefault();
    window.addEventListener('error', preventReportedError);
    const container = document.createElement('div');
    const root = createRoot(container);
    let prepareCount = 0;
    const rendererFactory = createMemoryRendererFactory('entity', undefined, () => {
      prepareCount += 1;
      if (prepareCount > 1) throw new Error('candidate rejected');
    });

    await act(() =>
      root.render(<Layout renderer="canvas" ir={source('#ef4444')} width={100} runtime={{ rendererFactory }} />),
    );
    const canvas = container.querySelector('canvas');
    if (canvas === null) throw new Error('expected retained Canvas host');

    let failure: unknown;
    try {
      await act(() =>
        root.render(<Layout renderer="canvas" ir={source('#ef4444')} width={200} runtime={{ rendererFactory }} />),
      );
    } catch (cause) {
      failure = cause;
    }

    expect(failure).toBeDefined();
    expect(canvas.width).toBe(100);
    window.removeEventListener('error', preventReportedError);
  });
});
