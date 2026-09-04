// @vitest-environment jsdom
import type { IRAnimationTrack } from '@retikz/core';
import type { AnimationMode } from '@retikz/react';
import type { FC } from 'react';

import { Layout, Node } from '@retikz/react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it } from 'vitest';

import type { PreviewControlState } from '../../src/modules/docs/components/component-preview/types';

import { PreviewPanel, usePreviewPanelState } from '../../src/modules/docs/components/component-preview/preview-panel';
import { useComponentPreviewStore } from '../../src/modules/docs/store/useComponentPreviewStore';

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

const controlState: PreviewControlState = {
  canonicalValues: {},
  values: {},
  setValue: () => undefined,
  applyValues: () => undefined,
  reset: () => undefined,
};

const ExplicitlyEnabledDemo: FC = () => (
  <Layout animate={true} width={100} height={100}>
    <Node id="enabled" position={[0, 0]} minimumSize={2} animations={FADE} />
  </Layout>
);

const ExplicitlyDisabledDemo: FC = () => (
  <Layout animate={false} width={100} height={100}>
    <Node id="disabled" position={[0, 0]} minimumSize={2} animations={FADE} />
  </Layout>
);

const ViewBoxOnlySvgDemo: FC = () => <svg viewBox="0 0 100 100" />;

const PreviewHarness: FC<{ Component: FC }> = props => {
  const state = usePreviewPanelState({
    controlState,
    rendererMode: 'svg',
    size: 'md',
    dragEnabled: false,
    expanded: false,
  });
  return <PreviewPanel state={state} Component={props.Component} />;
};

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

afterEach(() => {
  useComponentPreviewStore.getState().setAnimationMode('system');
  document.body.replaceChildren();
});

const renderPreview = async (Component: FC): Promise<HTMLElement> => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  await act(() => root.render(<PreviewHarness Component={Component} />));
  return container;
};

describe('ComponentPreview 全局动画模式', () => {
  it.each(['system', 'enabled', 'disabled'] satisfies Array<AnimationMode>)('持久化并读取 %s 模式', mode => {
    useComponentPreviewStore.getState().setAnimationMode(mode);
    expect(useComponentPreviewStore.getState().animationMode).toBe(mode);
  });

  it('共享 PreviewPanel 的 disabled 覆盖 demo 显式开启', async () => {
    useComponentPreviewStore.getState().setAnimationMode('disabled');
    expect((await renderPreview(ExplicitlyEnabledDemo)).querySelector('style')).toBeNull();
  });

  it('共享 PreviewPanel 的 enabled 覆盖 demo 显式关闭', async () => {
    useComponentPreviewStore.getState().setAnimationMode('enabled');
    expect((await renderPreview(ExplicitlyDisabledDemo)).querySelector('style')).not.toBeNull();
  });

  it('PreviewPanel 为只有 viewBox 的 SVG 提供完整可用尺寸', async () => {
    const svg = (await renderPreview(ViewBoxOnlySvgDemo)).querySelector('svg');

    expect(svg?.parentElement?.classList.contains('h-full')).toBe(true);
    expect(svg?.parentElement?.classList.contains('w-full')).toBe(true);
  });
});
