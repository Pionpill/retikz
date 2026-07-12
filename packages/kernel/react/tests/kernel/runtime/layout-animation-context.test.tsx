import type { IRAnimationTrack } from '@retikz/core';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { AnimationModeProvider, Layout, Node } from '../../../src';

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

const animatedLayout = (animate: boolean, snapshotAt?: number): React.ReactElement => (
  <Layout width={100} height={100} animate={animate} snapshotAt={snapshotAt}>
    <Node id="a" position={[0, 0]} fill="red" minimumSize={2} animations={FADE} />
  </Layout>
);

const hasAnimationStyle = (node: React.ReactNode): boolean => renderToStaticMarkup(node).includes('<style>');

describe('AnimationModeProvider', () => {
  it('未使用 Provider 时保留 Layout 自身的显式配置', () => {
    expect(hasAnimationStyle(animatedLayout(false))).toBe(false);
  });

  it('enabled 覆盖后代 Layout 的 animate={false}', () => {
    expect(
      hasAnimationStyle(<AnimationModeProvider mode="enabled">{animatedLayout(false)}</AnimationModeProvider>),
    ).toBe(true);
  });

  it('disabled 覆盖后代 Layout 的 animate={true}', () => {
    expect(
      hasAnimationStyle(<AnimationModeProvider mode="disabled">{animatedLayout(true)}</AnimationModeProvider>),
    ).toBe(false);
  });

  it('system 忽略后代显式值并在 SSR 中按 no-preference 处理', () => {
    expect(
      hasAnimationStyle(<AnimationModeProvider mode="system">{animatedLayout(false)}</AnimationModeProvider>),
    ).toBe(true);
  });

  it('嵌套时使用最近的 Provider', () => {
    expect(
      hasAnimationStyle(
        <AnimationModeProvider mode="disabled">
          <AnimationModeProvider mode="enabled">{animatedLayout(false)}</AnimationModeProvider>
        </AnimationModeProvider>,
      ),
    ).toBe(true);
  });

  it('snapshotAt 继续优先于 enabled Provider', () => {
    expect(
      hasAnimationStyle(<AnimationModeProvider mode="enabled">{animatedLayout(false, 200)}</AnimationModeProvider>),
    ).toBe(false);
  });
});
