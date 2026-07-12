import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlRuntimeState } from '../../src/modules/docs/components/component-preview/preview-panel';
import type { RendererMode } from '../../src/modules/docs/components/component-preview/types';

import * as componentPreviewExports from '../../src/modules/docs/components/component-preview';
import * as previewContextExports from '../../src/modules/docs/components/component-preview/context';
import { usePreviewControlRuntime } from '../../src/modules/docs/components/component-preview/preview-panel';

type ProbeProps = {
  rendererMode: RendererMode;
  onRuntime: (state: PreviewControlRuntimeState) => void;
};

const Probe = (props: ProbeProps) => {
  const { rendererMode, onRuntime } = props;
  const state = usePreviewControlRuntime({
    rendererMode,
    renderPaneRef: { current: null },
    hovered: false,
    pinned: false,
    expanded: false,
  });
  onRuntime(state);
  return null;
};

describe('usePreviewControlRuntime', () => {
  it('does not expose runtime internals from the top-level component-preview barrel', () => {
    expect(componentPreviewExports).not.toHaveProperty('usePreviewControlRuntime');
  });

  it('only exposes preview-control names in context exports', () => {
    expect(previewContextExports).toMatchObject({
      PreviewControlStateContext: expect.anything(),
      usePreviewControlContext: expect.any(Function),
      usePreviewControlValue: expect.any(Function),
    });
    expect(Object.keys(previewContextExports)).toHaveLength(5);
  });

  it('提供 remount key、runtime 与 control state', () => {
    let latest: PreviewControlRuntimeState | null = null;

    renderToStaticMarkup(<Probe rendererMode="svg" onRuntime={state => (latest = state)} />);

    expect(latest).not.toBeNull();
    const runtimeState: PreviewControlRuntimeState = latest!;

    expect(runtimeState.remountKey).toBe(0);
    expect(runtimeState.runtime.rendererMode).toBe('svg');
    expect(runtimeState.runtime.renderPane).toBeNull();
    expect(runtimeState.runtime.active('drag')).toBe(false);
    expect(runtimeState.runtime.value('curve')).toBeUndefined();
    expect(runtimeState.controlState.values).toEqual({});
    expect(typeof runtimeState.runtime.remount).toBe('function');
    expect(typeof runtimeState.runtime.setActive).toBe('function');
    expect(typeof runtimeState.runtime.setValue).toBe('function');
    expect(Object.keys(runtimeState.runtime).sort()).toEqual([
      'active',
      'expanded',
      'hovered',
      'pinned',
      'remount',
      'renderPane',
      'rendererMode',
      'setActive',
      'setValue',
      'value',
    ]);
  });
});
