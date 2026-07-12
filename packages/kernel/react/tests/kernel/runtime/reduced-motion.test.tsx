// @vitest-environment jsdom
import type { IRAnimationTrack } from '@retikz/core';
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Layout, Node } from '../../../src';

const FADE: Array<IRAnimationTrack> = [
  {
    property: 'opacity',
    keyframes: [
      { at: 0, value: 0 },
      { at: 1, value: 1 },
    ],
    duration: 400,
  },
];

const MANUAL: Array<IRAnimationTrack> = [
  {
    property: 'strokeWidth',
    keyframes: [
      { at: 0, value: 1 },
      { at: 1, value: 4 },
    ],
    duration: 300,
    trigger: 'manual',
  },
];

const roots = new Set<Root>();
let animateSpy: ReturnType<typeof vi.fn>;

const mount = async (node: React.ReactElement): Promise<HTMLElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.add(root);
  await act(() => root.render(node));
  return container;
};

const stubReducedMotion = (initialMatches: boolean): { setMatches: (matches: boolean) => void } => {
  let matches = initialMatches;
  const listeners = new Set<() => void>();
  vi.stubGlobal(
    'matchMedia',
    vi.fn(() => ({
      get matches() {
        return matches;
      },
      addEventListener: (type: string, listener: () => void) => {
        if (type === 'change') listeners.add(listener);
      },
      removeEventListener: (type: string, listener: () => void) => {
        if (type === 'change') listeners.delete(listener);
      },
    })),
  );
  return {
    setMatches: next => {
      matches = next;
      for (const listener of listeners) listener();
    },
  };
};

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  animateSpy = vi.fn(() => ({ play: vi.fn(), pause: vi.fn(), cancel: vi.fn(), currentTime: 0, playState: 'idle' }));
  (Element.prototype as unknown as { animate: unknown }).animate = animateSpy;
});

afterEach(async () => {
  for (const root of roots) {
    await act(() => root.unmount());
  }
  roots.clear();
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('React SVG reduced motion', () => {
  it('初始 prefers-reduced-motion → 无 CSS / WAAPI 动画', async () => {
    stubReducedMotion(true);
    const container = await mount(
      <Layout width={100} height={100}>
        <Node id="a" position={[0, 0]} fill="red" minimumSize={2} animations={FADE} />
        <Node id="b" position={[20, 0]} stroke="#000" minimumSize={2} animations={MANUAL} />
      </Layout>,
    );

    expect(container.querySelector('style') === null).toBe(true);
    expect(animateSpy).not.toHaveBeenCalled();
  });

  it('系统偏好切为 reduced-motion → 即时降级静态输出', async () => {
    const reducedMotion = stubReducedMotion(false);
    const container = await mount(
      <Layout width={100} height={100}>
        <Node id="a" position={[0, 0]} fill="red" minimumSize={2} animations={FADE} />
      </Layout>,
    );
    expect(container.querySelector('style') !== null).toBe(true);

    await act(() => reducedMotion.setMatches(true));

    expect(container.querySelector('style') === null).toBe(true);
  });
});
