// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IRAnimationTrack } from '@retikz/core';
import { Layout, Node } from '../src';

/**
 * ADR-04 runtime（react，jsdom）：SVG load track → 内联 <style> 自播；交互 track → WAAPI 桥；animate={false} 静态。
 */
let animateSpy: ReturnType<typeof vi.fn>;

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  animateSpy = vi.fn(() => ({ play: vi.fn(), pause: vi.fn(), cancel: vi.fn(), currentTime: 0, playState: 'idle' }));
  (Element.prototype as unknown as { animate: unknown }).animate = animateSpy;
});

afterEach(() => {
  vi.restoreAllMocks();
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
