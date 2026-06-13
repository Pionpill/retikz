// @vitest-environment jsdom
import { createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IRAnimationTrack } from '@retikz/core';
import type { AnimationControls } from '../src';
import { Layout, Node, cameraTo, fadeIn, spin } from '../src';
import { convertReactNodeToIR } from '../src';

/**
 * 动画 runtime（react，jsdom）：SVG load track → 内联 <style> 自播；交互 track → WAAPI 桥；animate={false} 静态。
 */
let animateSpy: ReturnType<typeof vi.fn>;
let rafSpy: ReturnType<typeof vi.fn>;

const createRecordingContext = (): CanvasRenderingContext2D => {
  const target: Record<string | symbol, unknown> = { canvas: null, fillStyle: '#000', strokeStyle: '#000', lineWidth: 1, lineDashOffset: 0 };
  return new Proxy(target, {
    get: (t, p) => (p in t ? t[p] : () => undefined),
    set: (t, p, v) => ((t[p] = v), true),
  }) as unknown as CanvasRenderingContext2D;
};

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  animateSpy = vi.fn(() => ({ play: vi.fn(), pause: vi.fn(), cancel: vi.fn(), currentTime: 0, playState: 'idle' }));
  (Element.prototype as unknown as { animate: unknown }).animate = animateSpy;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => createRecordingContext());
  rafSpy = vi.fn(() => 1);
  vi.stubGlobal('requestAnimationFrame', rafSpy);
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

const FADE: Array<IRAnimationTrack> = [{ property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 400 }];
const MANUAL: Array<IRAnimationTrack> = [{ property: 'strokeWidth', keyframes: [{ at: 0, value: 1 }, { at: 1, value: 4 }], duration: 300, trigger: 'manual' }];

const mount = async (node: React.ReactElement): Promise<HTMLElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(() => root.render(node));
  return container;
};

describe('react SVG 动画', () => {
  it('load track → 内联 <style> 含 @keyframes（CSS 自播）', async () => {
    const c = await mount(
      <Layout width={100} height={100}>
        <Node id="a" position={[0, 0]} fill="red" minimumSize={2} animations={FADE} />
      </Layout>,
    );
    const style = c.querySelector('style');
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain('@keyframes');
  });

  it('animate={false} → 无 <style>（静态 base）', async () => {
    const c = await mount(
      <Layout width={100} height={100} animate={false}>
        <Node id="a" position={[0, 0]} fill="red" minimumSize={2} animations={FADE} />
      </Layout>,
    );
    expect(c.querySelector('style')).toBeNull();
  });

  it('交互 track（manual）→ WAAPI 桥调 element.animate', async () => {
    await mount(
      <Layout width={100} height={100}>
        <Node id="a" position={[0, 0]} stroke="#000" minimumSize={2} animations={MANUAL} />
      </Layout>,
    );
    expect(animateSpy).toHaveBeenCalled();
  });
});

describe('preset 集成', () => {
  it('<Node animations={[fadeIn()]}> → 节点 IR 带等价 opacity track', () => {
    const ir = convertReactNodeToIR(<Node id="a" position={[0, 0]} animations={[fadeIn()]} />);
    const node = ir.children[0] as { animations?: Array<IRAnimationTrack> };
    expect(node.animations).toEqual([fadeIn()]);
  });

  it('<Layout animations={[cameraTo(...)]}> → SVG 输出含镜头 @keyframes', async () => {
    const c = await mount(
      <Layout width={100} height={100} animations={[cameraTo({ from: [0, 0, 100, 100], to: [25, 25, 50, 50] })]}>
        <Node id="a" position={[0, 0]} fill="red" minimumSize={2} animations={[spin()]} />
      </Layout>,
    );
    const style = c.querySelector('style');
    expect(style).not.toBeNull();
    expect(style!.textContent).toContain('@keyframes');
    expect(style!.textContent).toContain('translate('); // 镜头 group transform
  });
});

describe('命令式动画句柄（animationRef）', () => {
  it('svg 交互 track → animationRef.current 是 AnimationControls（play/pause/seek）', async () => {
    const ref = createRef<AnimationControls | null>();
    await mount(
      <Layout width={100} height={100} animationRef={ref}>
        <Node id="a" position={[0, 0]} stroke="#000" minimumSize={2} animations={MANUAL} />
      </Layout>,
    );
    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.play).toBe('function');
    expect(typeof ref.current?.pause).toBe('function');
    expect(typeof ref.current?.seek).toBe('function');
  });

  it('canvas load track → animationRef.current 是 rAF 时钟句柄', async () => {
    const ref = createRef<AnimationControls | null>();
    await mount(
      <Layout renderer="canvas" width={100} height={100} animationRef={ref}>
        <Node id="a" position={[0, 0]} fill="red" minimumSize={2} animations={FADE} />
      </Layout>,
    );
    expect(ref.current).not.toBeNull();
    expect(typeof ref.current?.play).toBe('function');
  });

  it('无动画 scene → animationRef.current 保持 null', async () => {
    const ref = createRef<AnimationControls | null>();
    await mount(
      <Layout width={100} height={100} animationRef={ref}>
        <Node id="a" position={[0, 0]} fill="red" minimumSize={2} />
      </Layout>,
    );
    expect(ref.current).toBeNull();
  });
});

describe('react canvas 动画', () => {
  it('renderer="canvas" + load track → 起 rAF 时钟', async () => {
    await mount(
      <Layout renderer="canvas" width={100} height={100}>
        <Node id="a" position={[0, 0]} fill="red" minimumSize={2} animations={FADE} />
      </Layout>,
    );
    expect(rafSpy).toHaveBeenCalled();
  });

  it('renderer="canvas" + animate={false} → 不起 rAF（静态）', async () => {
    await mount(
      <Layout renderer="canvas" width={100} height={100} animate={false}>
        <Node id="a" position={[0, 0]} fill="red" minimumSize={2} animations={FADE} />
      </Layout>,
    );
    expect(rafSpy).not.toHaveBeenCalled();
  });
});
