// @vitest-environment jsdom
import type { AnyThemeTokenDefinition, IRScene, ScenePatch } from '@retikz/core';
import type {
  RenderFrameSnapshot,
  RenderRuntimeConfig,
  RetainedRendererFactory,
  RetainedRendererFactoryInput,
} from '@retikz/render/runtime';
import type { RuntimePreparedCommit } from '@retikz/runtime';
import type { FC, ReactNode } from 'react';

import { CompositeBaseSchema, defineComposite, defineInspector, defineThemeTokenNamespace } from '@retikz/core';
import { defineRetainedRenderer } from '@retikz/render/runtime';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type { EmbeddableTier2Adapter } from '../../../src';

import { Layout, Node } from '../../../src';
import { createGeometryContext } from '../../helpers/geometry-context';

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

const inspectionComposite = defineComposite({
  namespace: 'fixture',
  type: 'inspection',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('fixture'),
    type: z.literal('inspection'),
  }),
  artifactSchema: z.strictObject({ width: z.number(), height: z.number() }),
  inspector: defineInspector({
    kind: 'composite',
    optionsInputSchema: z.strictObject({}),
    optionsSchema: z.strictObject({}),
    inspect: (artifact: { width: number; height: number }) => ({
      type: 'path',
      stroke: '#2563eb',
      dashPattern: [4, 2],
      children: [
        { type: 'step', kind: 'move', to: [0, 0] },
        { type: 'step', kind: 'line', to: [artifact.width, artifact.height] },
      ],
    }),
  }),
  compile: () => ({
    children: [{ type: 'node', id: 'inspection-node', position: [0, 0], shape: 'rectangle' }],
    artifact: { width: 20, height: 20 },
  }),
});

const inspectionSource: IRScene = {
  version: 1,
  type: 'scene',
  children: [{ namespace: 'fixture', type: 'inspection' }],
};

type ThemeTokenFixture = FC<{ id: string }> & {
  isTier2Embeddable?: boolean;
  embeddableAdapter?: EmbeddableTier2Adapter;
};

const retainedThemeComposite = defineComposite({
  namespace: 'retained-theme-token',
  type: 'box',
  schema: CompositeBaseSchema.extend({
    namespace: z.literal('retained-theme-token'),
    type: z.literal('box'),
    id: z.string(),
  }),
  expand: (node, context) => {
    const tokens = Object.hasOwn(context.theme.tokens, 'retained-theme-token')
      ? context.theme.tokens['retained-theme-token']
      : undefined;
    const fill = tokens?.fill;
    return {
      type: 'node',
      id: node.id,
      position: [0, 0],
      fill: typeof fill === 'string' ? fill : '#eeeeee',
    };
  },
});

const makeRetainedThemeComposites = () => [retainedThemeComposite];

const createThemeTokenFixture = (displayName: string, definition: AnyThemeTokenDefinition): ThemeTokenFixture => {
  const adapter: EmbeddableTier2Adapter<{ id: string }> = {
    displayName,
    namespace: 'retained-theme-token',
    contribute: props => ({
      node: { namespace: 'retained-theme-token', type: 'box', id: props.id },
      datasets: {},
      makeComposites: makeRetainedThemeComposites,
      themeTokenDefinitions: [definition],
    }),
  };
  const Fixture: ThemeTokenFixture = () => null;
  Fixture.displayName = displayName;
  Fixture.isTier2Embeddable = true;
  Fixture.embeddableAdapter = adapter as EmbeddableTier2Adapter;
  return Fixture;
};

/** 捕获 React client render fail-loud，并在返回前恢复全局错误处理 */
const captureClientRenderError = async (root: ReturnType<typeof createRoot>, element: ReactNode): Promise<Error> => {
  const consoleError = vi.spyOn(console, 'error').mockImplementation(() => undefined);
  let reportedError: Error | undefined;
  const preventReportedError = (event: ErrorEvent): void => {
    event.preventDefault();
    if (reportedError === undefined && event.error instanceof Error) reportedError = event.error;
  };
  window.addEventListener('error', preventReportedError);
  let thrown: unknown;
  try {
    await act(() => root.render(element));
  } catch (cause) {
    thrown = cause;
  } finally {
    window.removeEventListener('error', preventReportedError);
    consoleError.mockRestore();
  }
  const error = thrown instanceof Error ? thrown : reportedError;
  if (error === undefined) throw new Error('expected React client render to fail');
  return error;
};

/** 构造只保留 committed snapshot 的第三方 renderer */
const createMemoryRendererFactory = (
  capability: 'none' | 'entity',
  onDispose?: () => void,
  onPrepare?: (host: SVGSVGElement | HTMLCanvasElement, config: RenderRuntimeConfig) => void,
  onPatch?: (patch: ScenePatch) => void,
): RetainedRendererFactory =>
  ((input: RetainedRendererFactoryInput) => {
    let current: RenderFrameSnapshot | undefined;
    const prepare = (frame: RenderFrameSnapshot, config: RenderRuntimeConfig): RuntimePreparedCommit => {
      onPrepare?.(input.host, config);
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
      capability,
      inspectionCapability: 'supported' as const,
      prepareMount: (frame: RenderFrameSnapshot, config: RenderRuntimeConfig) => prepare(frame, config),
      prepare: (patch: ScenePatch, frame: RenderFrameSnapshot, config: RenderRuntimeConfig) => {
        onPatch?.(patch);
        return prepare(frame, config);
      },
      read: () => {
        if (current === undefined) throw new Error('memory renderer is not committed');
        return Object.freeze({ frame: current });
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
  it('createRoot rerender 在 embedded definition add/remove 时重建 retained session 且不保留 stale owner', async () => {
    const definition = defineThemeTokenNamespace({
      namespace: 'retained-theme-token',
      schema: z.strictObject({ fill: z.string().optional() }),
    });
    const Fixture = createThemeTokenFixture('RetainedThemeFixture', definition);
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(() =>
        root.render(
          <Layout>
            <Node id="plain-before" position={[0, 0]} />
          </Layout>,
        ),
      );
      await act(() =>
        root.render(
          <Layout theme={{ tokens: { 'retained-theme-token': { fill: '#123456' } } }}>
            <Fixture id="embedded-token-node" />
          </Layout>,
        ),
      );

      expect(container.querySelector('[data-retikz-id="embedded-token-node"]')?.getAttribute('fill')).toBe('#123456');

      const error = await captureClientRenderError(
        root,
        <Layout theme={{ tokens: { 'retained-theme-token': { fill: '#654321' } } }}>
          <Node id="owner-removed" position={[0, 0]} />
        </Layout>,
      );

      expect(error.message).toMatch(/scene\.theme\.tokens\.retained-theme-token.*unknown Theme token namespace/i);
    } finally {
      await act(() => root.unmount());
    }
  });

  it('createRoot retained rerender 对同 namespace 不同 embedded definition identity fail-loud', async () => {
    const firstDefinition = defineThemeTokenNamespace({
      namespace: 'retained-theme-token',
      schema: z.strictObject({ fill: z.string().optional() }),
    });
    const conflictingDefinition = defineThemeTokenNamespace({
      namespace: 'retained-theme-token',
      schema: z.strictObject({ fill: z.string().optional() }),
    });
    const First = createThemeTokenFixture('RetainedThemeFirst', firstDefinition);
    const Conflict = createThemeTokenFixture('RetainedThemeConflict', conflictingDefinition);
    const container = document.createElement('div');
    const root = createRoot(container);

    try {
      await act(() =>
        root.render(
          <Layout>
            <First id="first-token-node" />
          </Layout>,
        ),
      );
      const error = await captureClientRenderError(
        root,
        <Layout>
          <First id="first-token-node" />
          <Conflict id="conflict-token-node" />
        </Layout>,
      );

      expect(error.message).toMatch(/retained-theme-token.*conflict/i);
    } finally {
      await act(() => root.unmount());
    }
  });

  it('recreates a retained session when inspect changes without comparing the new frame to the stale SSR seed', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const rendererFactory = vi.fn(createMemoryRendererFactory('entity')) as unknown as RetainedRendererFactory;

    await act(() =>
      root.render(<Layout ir={inspectionSource} composites={[inspectionComposite]} runtime={{ rendererFactory }} />),
    );
    await act(() =>
      root.render(
        <Layout
          ir={inspectionSource}
          composites={[inspectionComposite]}
          inspect={{ layout: true }}
          runtime={{ rendererFactory }}
        />,
      ),
    );

    expect(rendererFactory).toHaveBeenCalledTimes(2);
    await act(() => root.unmount());
  });

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

  it('rendererFactory identity 变化时释放旧 instance 并重建 retained session', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const firstDispose = vi.fn();
    const secondDispose = vi.fn();
    const firstBaseFactory = createMemoryRendererFactory('entity', firstDispose);
    const secondBaseFactory = createMemoryRendererFactory('entity', secondDispose);
    const firstFactory = vi.fn(firstBaseFactory) as unknown as RetainedRendererFactory;
    const secondFactory = vi.fn(secondBaseFactory) as unknown as RetainedRendererFactory;

    await act(() => root.render(<Layout ir={source('#ef4444')} runtime={{ rendererFactory: firstFactory }} />));
    await act(() => root.render(<Layout ir={source('#ef4444')} runtime={{ rendererFactory: secondFactory }} />));

    expect(firstFactory).toHaveBeenCalledTimes(1);
    expect(secondFactory).toHaveBeenCalledTimes(1);
    expect(firstDispose).toHaveBeenCalledTimes(1);
    expect(secondDispose).not.toHaveBeenCalled();

    await act(() => root.unmount());
    expect(firstDispose).toHaveBeenCalledTimes(1);
    expect(secondDispose).toHaveBeenCalledTimes(1);
  });

  it('unmount 会重试失败的 retained renderer cleanup', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const disposeFailure = new Error('dispose failed');
    let rejectDispose = true;
    const dispose = vi.fn(() => {
      if (rejectDispose) {
        rejectDispose = false;
        throw disposeFailure;
      }
    });
    const rendererFactory = createMemoryRendererFactory('entity', dispose);

    await act(() => root.render(<Layout ir={source('#ef4444')} runtime={{ rendererFactory }} />));
    await expect(act(() => root.unmount())).resolves.toBeUndefined();

    expect(dispose).toHaveBeenCalledTimes(2);
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

  it('默认 retained auto 发布局部 Patch，retained full 发布 replaceScene Patch', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const autoPatches: Array<ScenePatch> = [];
    const fullPatches: Array<ScenePatch> = [];
    const autoFactory = createMemoryRendererFactory('entity', undefined, undefined, patch => autoPatches.push(patch));
    const fullFactory = createMemoryRendererFactory('entity', undefined, undefined, patch => fullPatches.push(patch));

    await act(() => root.render(<Layout ir={source('#ef4444')} runtime={{ rendererFactory: autoFactory }} />));
    await act(() => root.render(<Layout ir={source('#22c55e')} runtime={{ rendererFactory: autoFactory }} />));
    expect(autoPatches[0]?.operations[0]?.kind).toBe('update');

    await act(() =>
      root.render(
        <Layout
          ir={source('#ef4444')}
          runtime={{ mode: 'retained', updateStrategy: 'full', rendererFactory: fullFactory }}
        />,
      ),
    );
    await act(() =>
      root.render(
        <Layout
          ir={source('#22c55e')}
          runtime={{ mode: 'retained', updateStrategy: 'full', rendererFactory: fullFactory }}
        />,
      ),
    );
    expect(fullPatches[0]?.operations[0]?.kind).toBe('replaceScene');
    await act(() => root.unmount());
  });

  it('updateStrategy 变化时在同一 host 上释放旧 Session 并重建', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const dispose = vi.fn();
    const baseFactory = createMemoryRendererFactory('entity', dispose);
    const rendererFactory = vi.fn(baseFactory) as unknown as RetainedRendererFactory;

    await act(() =>
      root.render(
        <Layout ir={source('#ef4444')} runtime={{ mode: 'retained', updateStrategy: 'auto', rendererFactory }} />,
      ),
    );
    const host = container.querySelector('svg');
    await act(() =>
      root.render(
        <Layout ir={source('#ef4444')} runtime={{ mode: 'retained', updateStrategy: 'full', rendererFactory }} />,
      ),
    );

    expect(container.querySelector('svg')).toBe(host);
    expect(rendererFactory).toHaveBeenCalledTimes(2);
    expect(dispose).toHaveBeenCalledTimes(1);
    await act(() => root.unmount());
    expect(dispose).toHaveBeenCalledTimes(2);
  });

  it('retained 切到 static 时释放旧 Session 并替换 host', async () => {
    const container = document.createElement('div');
    const root = createRoot(container);
    const dispose = vi.fn();
    const rendererFactory = createMemoryRendererFactory('entity', dispose);

    await act(() => root.render(<Layout ir={source('#ef4444')} runtime={{ mode: 'retained', rendererFactory }} />));
    const retainedHost = container.querySelector('svg');
    await act(() => root.render(<Layout ir={source('#22c55e')} runtime={{ mode: 'static' }} />));

    expect(dispose).toHaveBeenCalledTimes(1);
    expect(container.querySelector('svg')).not.toBe(retainedHost);
    expect(container.querySelector('[data-retikz-id="changed"]')?.getAttribute('fill')).toBe('#22c55e');
    await act(() => root.unmount());
  });

  it('static Canvas 完整重绘时复用同一 host', async () => {
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation((contextId: string) =>
      contextId === '2d' ? createGeometryContext() : null,
    );
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() => root.render(<Layout renderer="canvas" ir={source('#ef4444')} runtime={{ mode: 'static' }} />));
    const host = container.querySelector('canvas');
    await act(() => root.render(<Layout renderer="canvas" ir={source('#22c55e')} runtime={{ mode: 'static' }} />));

    expect(host).not.toBeNull();
    expect(container.querySelector('canvas')).toBe(host);
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
