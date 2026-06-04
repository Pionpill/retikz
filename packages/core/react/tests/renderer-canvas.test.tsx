// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { renderToStaticMarkup } from 'react-dom/server';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Scene } from '@retikz/core';
import { buildSvgDocument } from '@retikz/render/svg';
import { type RenderOptions, renderToCanvas } from '@retikz/render/canvas';
import { Layout, Node } from '../src';

const svgScenes: Array<Scene> = [];
const canvasScenes: Array<Scene> = [];
const canvasDrawCalls: Array<HTMLCanvasElement> = [];
const canvasDrawOptions: Array<RenderOptions | undefined> = [];

type TestCanvasContext = Pick<CanvasRenderingContext2D, 'fillRect' | 'measureText'> & {
  font: string;
};

const createTestCanvasContext = (fillRect = vi.fn()): TestCanvasContext => ({
  fillRect,
  font: '',
  measureText: vi.fn(
    () =>
      ({
        width: 8,
        actualBoundingBoxAscent: 8,
        actualBoundingBoxDescent: 2,
      }) as TextMetrics,
  ),
});

vi.mock('@retikz/render/svg', () => ({
  buildSvgDocument: vi.fn((scene: Scene) => {
    svgScenes.push(scene);
    return {
      tag: 'svg',
      attrs: { viewBox: `${scene.layout.x} ${scene.layout.y} ${scene.layout.width} ${scene.layout.height}` },
      children: [],
    };
  }),
}));

vi.mock('@retikz/render/canvas', () => ({
  renderToCanvas: vi.fn((canvas: HTMLCanvasElement, scene: Scene, options?: RenderOptions) => {
    canvasScenes.push(scene);
    canvasDrawCalls.push(canvas);
    canvasDrawOptions.push(options);
    const context = canvas.getContext('2d');
    context?.fillRect(0, 0, 1, 1);
  }),
}));

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  svgScenes.length = 0;
  canvasScenes.length = 0;
  canvasDrawCalls.length = 0;
  canvasDrawOptions.length = 0;
  vi.clearAllMocks();
});

describe('Layout renderer 规格', () => {
  it('react-canvas-mode-mounts：renderer="canvas" 挂载 canvas，并在 effect 中完成一次绘制', async () => {
    const fillRect = vi.fn();
    const context = createTestCanvasContext(fillRect);
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((contextId: string) =>
        (contextId === '2d' ? (context as unknown as CanvasRenderingContext2D) : null)
      );
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="canvas" width={320} height={180}>
          <Node id="a" position={[0, 0]}>
            A
          </Node>
        </Layout>,
      );
    });

    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInstanceOf(HTMLCanvasElement);
    // 位图按名义显示尺寸开（ratio=1），renderToCanvas 把内容 meet-fit 进去——镜像 svg width/height attrs
    expect(canvas?.width).toBe(320);
    expect(canvas?.height).toBe(180);
    expect(renderToCanvas).toHaveBeenCalledTimes(1);
    expect(canvasDrawCalls[0]).toBe(canvas);
    expect(getContext).toHaveBeenCalledWith('2d');
    expect(fillRect).toHaveBeenCalledWith(0, 0, 1, 1);

    root.unmount();
    getContext.mockRestore();
  });

  it('canvas-host-object-fit-contain：canvas 用 object-fit:contain，受限容器宽度下按比例 letterbox 不拉伸高度', async () => {
    const context = createTestCanvasContext();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((contextId: string) =>
        (contextId === '2d' ? (context as unknown as CanvasRenderingContext2D) : null)
      );
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="canvas" width={320} height={180}>
          <Node id="a" position={[0, 0]}>
            A
          </Node>
        </Layout>,
      );
    });

    // bitmap 与 CSS 盒比例不一致时（容器 max-width 收窄宽度但高度固定），object-fit:contain 让位图按比例
    // letterbox（对齐 SVG preserveAspectRatio="meet"），而非拉伸填充
    const canvas = container.querySelector('canvas');
    expect(canvas?.style.objectFit).toBe('contain');

    root.unmount();
    getContext.mockRestore();
  });

  it('canvas-host-bitmap-equals-nominal-size：位图按名义 width/height 开（镜像 svg attrs），renderToCanvas 内部 meet-fit', async () => {
    const context = createTestCanvasContext();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((contextId: string) =>
        (contextId === '2d' ? (context as unknown as CanvasRenderingContext2D) : null)
      );
    const container = document.createElement('div');
    const root = createRoot(container);

    // 名义盒 720×360 远大于单个节点的内容边界
    await act(() => {
      root.render(
        <Layout renderer="canvas" width={720} height={360}>
          <Node id="a" position={[0, 0]}>
            A
          </Node>
        </Layout>,
      );
    });

    const canvas = container.querySelector('canvas');
    const scene = canvasScenes[0];
    // jsdom 无 devicePixelRatio → ratio=1；位图 = 名义 720×360（intrinsic 比对齐 svg width/height attrs，
    // 响应式 height:auto 下与 svg 一致），renderToCanvas 把内容 meet-fit 进位图，而非位图 = 内容边界
    expect(canvas?.width).toBe(720);
    expect(canvas?.height).toBe(360);
    expect(scene.layout.width).not.toBe(720);

    root.unmount();
    getContext.mockRestore();
  });

  it('canvas-host-font-family: 画布渲染时把 CSS font-family 传给 Canvas renderer', async () => {
    const context = createTestCanvasContext();
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((contextId: string) =>
        (contextId === '2d' ? (context as unknown as CanvasRenderingContext2D) : null)
      );
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="canvas" width={120} height={80} style={{ fontFamily: 'Inter, sans-serif' }}>
          <Node id="a" position={[0, 0]}>
            A
          </Node>
        </Layout>,
      );
    });

    expect(canvasDrawOptions[0]?.defaultFontFamily).toBe('Inter, sans-serif');

    root.unmount();
    getContext.mockRestore();
  });

  it('default-renderer-is-svg：未传 renderer 时仍输出 svg，且不会触发 canvas 分支', () => {
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((contextId: string) =>
        (contextId === '2d' ? (createTestCanvasContext() as unknown as CanvasRenderingContext2D) : null)
      );

    const markup = renderToStaticMarkup(
      <Layout width={120} height={80}>
        <Node id="a" position={[0, 0]}>
          A
        </Node>
      </Layout>,
    );

    expect(markup).toContain('<svg');
    expect(markup).not.toContain('<canvas');
    expect(buildSvgDocument).toHaveBeenCalledTimes(1);
    expect(renderToCanvas).not.toHaveBeenCalled();

    getContext.mockRestore();
  });

  it('svg-canvas-same-scene：同一份 JSX 在 svg 与 canvas 路径进入 renderer 前得到同一份 Scene', async () => {
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((contextId: string) =>
        (contextId === '2d' ? (createTestCanvasContext() as unknown as CanvasRenderingContext2D) : null)
      );

    renderToStaticMarkup(
      <Layout width={120} height={80}>
        <Node id="a" position={[0, 0]}>
          A
        </Node>
      </Layout>,
    );

    const container = document.createElement('div');
    const root = createRoot(container);
    await act(() => {
      root.render(
        <Layout renderer="canvas" width={120} height={80}>
          <Node id="a" position={[0, 0]}>
            A
          </Node>
        </Layout>,
      );
    });

    expect(svgScenes).toHaveLength(1);
    expect(canvasScenes).toHaveLength(1);
    expect(canvasScenes[0]).toEqual(svgScenes[0]);

    root.unmount();
    getContext.mockRestore();
  });

  it('canvas-host-dpr-fallback：非法 devicePixelRatio 回退为 1', async () => {
    const getContext = vi
      .spyOn(HTMLCanvasElement.prototype, 'getContext')
      .mockImplementation((contextId: string) =>
        (contextId === '2d' ? (createTestCanvasContext() as unknown as CanvasRenderingContext2D) : null)
      );
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'devicePixelRatio');
    Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, value: Number.NaN });
    const container = document.createElement('div');
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="canvas" width={120} height={80}>
          <Node id="a" position={[0, 0]}>
            A
          </Node>
        </Layout>,
      );
    });

    const canvas = container.querySelector('canvas');
    // ratio 回退为 1：位图 = 名义 120×80 × 1（有限值；若 ratio=NaN 则会得 NaN）
    expect(canvas?.width).toBe(120);
    expect(canvas?.height).toBe(80);

    root.unmount();
    getContext.mockRestore();
    if (descriptor) {
      Object.defineProperty(globalThis, 'devicePixelRatio', descriptor);
    }
  });
});
