// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Layout, Node } from '../../../src';

type TestCanvasContext = Readonly<{
  context: CanvasRenderingContext2D;
  fillText: ReturnType<typeof vi.fn>;
}>;

/** 给 retained Canvas 提供完整的录制型原生 context surface */
const createTestCanvasContext = (): TestCanvasContext => {
  const fillText = vi.fn();
  const target: Record<string | symbol, unknown> = {
    canvas: null,
    fillStyle: '#000000',
    strokeStyle: '#000000',
    lineWidth: 1,
    font: '',
    fillText,
    measureText: () => ({
      width: 8,
      actualBoundingBoxAscent: 8,
      actualBoundingBoxDescent: 2,
    }),
  };
  const context = new Proxy(target, {
    get(value, key) {
      if (key in value) return value[key];
      return vi.fn();
    },
    set(value, key, next) {
      value[key] = next;
      return true;
    },
  }) as unknown as CanvasRenderingContext2D;
  return { context, fillText };
};

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('Layout retained renderer 规格', () => {
  it('默认 SVG 显示尺寸等于取景框，单轴保持比例', () => {
    const ir = {
      version: 1,
      type: 'scene',
      children: [],
      viewBox: { x: -20, y: -10, width: 240, height: 120 },
    } as const;
    const svg = renderToStaticMarkup(<Layout ir={{ ...ir, children: [] }} />);
    expect(svg).toContain('width="240"');
    expect(svg).toContain('height="120"');
    const scaled = renderToStaticMarkup(<Layout ir={{ ...ir, children: [] }} width={480} />);
    expect(scaled).toContain('width="480"');
    expect(scaled).toContain('height="240"');
  });

  it('Canvas 默认 CSS 尺寸不乘 DPR，更新后跟随内容边界', async () => {
    const recorded = createTestCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recorded.context);
    vi.stubGlobal('devicePixelRatio', 2);
    const container = document.createElement('div');
    const root = createRoot(container);
    try {
      await act(() => root.render(<Layout renderer="canvas" viewBox={{ x: -20, y: -10, width: 240, height: 120 }} />));
      const canvas = container.querySelector('canvas');
      expect(canvas?.style.width).toBe('240px');
      expect(canvas?.style.height).toBe('120px');
      expect(canvas?.width).toBe(480);
      expect(canvas?.height).toBe(240);
      await act(() => root.render(<Layout renderer="canvas" viewBox={{ x: 0, y: 0, width: 300, height: 100 }} />));
      expect(container.querySelector('canvas')).toBe(canvas);
      expect(canvas?.style.width).toBe('300px');
      expect(canvas?.width).toBe(600);
    } finally {
      await act(() => root.unmount());
      vi.unstubAllGlobals();
    }
  });

  it('react-canvas-mode-mounts：renderer="canvas" 挂载并绘制当前 Scene', async () => {
    const recorded = createTestCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recorded.context);
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
    expect(canvas?.width).toBe(320);
    expect(canvas?.height).toBe(180);
    expect(recorded.fillText).toHaveBeenCalledWith('A', expect.any(Number), expect.any(Number));
    await act(() => root.unmount());
  });

  it('canvas-host-object-fit-contain：shell 保持 contain 显示语义', async () => {
    const recorded = createTestCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recorded.context);
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(() => {
      root.render(
        <Layout renderer="canvas" width={320} height={180} ir={{ version: 1, type: 'scene', children: [] }} />,
      );
    });
    expect(container.querySelector('canvas')?.style.objectFit).toBe('contain');
    await act(() => root.unmount());
  });

  it('canvas-host-bitmap-equals-nominal-size：位图按名义尺寸创建', async () => {
    const recorded = createTestCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recorded.context);
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(() => {
      root.render(
        <Layout renderer="canvas" width={720} height={360} ir={{ version: 1, type: 'scene', children: [] }} />,
      );
    });
    expect(container.querySelector('canvas')?.width).toBe(720);
    expect(container.querySelector('canvas')?.height).toBe(360);
    await act(() => root.unmount());
  });

  it('canvas-host-font-family：React shell 保留 font-family', async () => {
    const recorded = createTestCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recorded.context);
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
    expect(container.querySelector('canvas')?.style.fontFamily).toContain('Inter');
    await act(() => root.unmount());
  });

  it('default-renderer-is-svg：SSR 默认输出带 opaque seed 的 SVG', () => {
    const markup = renderToStaticMarkup(
      <Layout width={120} height={80}>
        <Node id="a" position={[0, 0]}>
          A
        </Node>
      </Layout>,
    );
    expect(markup).toContain('<svg');
    expect(markup).toContain('data-retikz-id="a"');
    expect(markup).not.toContain('<canvas');
  });

  it('svg-canvas-host-parity：同一 JSX 可进入两种 retained host shell', async () => {
    const recorded = createTestCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recorded.context);
    const svgMarkup = renderToStaticMarkup(<Layout ir={{ version: 1, type: 'scene', children: [] }} />);
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(() => {
      root.render(<Layout renderer="canvas" ir={{ version: 1, type: 'scene', children: [] }} />);
    });
    expect(svgMarkup).toContain('<svg');
    expect(container.querySelector('canvas')).not.toBeNull();
    await act(() => root.unmount());
  });

  it('canvas-host-dpr-fallback：非法 devicePixelRatio 回退为 1', async () => {
    const recorded = createTestCanvasContext();
    vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => recorded.context);
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'devicePixelRatio');
    Object.defineProperty(globalThis, 'devicePixelRatio', { configurable: true, value: Number.NaN });
    const container = document.createElement('div');
    const root = createRoot(container);
    await act(() => {
      root.render(
        <Layout renderer="canvas" width={120} height={80} ir={{ version: 1, type: 'scene', children: [] }} />,
      );
    });
    expect(container.querySelector('canvas')?.width).toBe(120);
    expect(container.querySelector('canvas')?.height).toBe(80);
    await act(() => root.unmount());
    if (descriptor === undefined) Reflect.deleteProperty(globalThis, 'devicePixelRatio');
    else Object.defineProperty(globalThis, 'devicePixelRatio', descriptor);
  });
});
