// @vitest-environment jsdom

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { ComponentPreviewCard } from '../../src/modules/docs/components/component-preview/ComponentPreviewCard';
import { PreviewControlBar } from '../../src/modules/docs/components/component-preview/control-panel/PreviewControlBar';
import { PreviewControlPanel } from '../../src/modules/docs/components/component-preview/control-panel/PreviewControlPanel';
import { defineControlledPreview, definePreviewControls } from '../../src/modules/docs/preview';

Object.assign(globalThis, { IS_REACT_ACT_ENVIRONMENT: true });

let resize: (width: number, height: number) => void = () => undefined;
class PreviewResizeObserver {
  constructor(callback: (entries: Array<{ contentRect: { width: number; height: number } }>) => void) {
    resize = (width, height) => callback([{ contentRect: { width, height } }]);
  }
  observe() {}
  disconnect() {}
  unobserve() {}
}
vi.stubGlobal('ResizeObserver', PreviewResizeObserver);

const controls = definePreviewControls({
  presentation: 'panel',
  sections: [{ controls: [{ kind: 'switch', id: 'enabled', label: 'Enabled', defaultValue: false }] }],
});
const contract = { controls, canonicalValues: { enabled: false }, relatedApis: [] };
const demo = defineControlledPreview(contract, (values, dimensions) => (
  <output>
    {dimensions?.width}x{dimensions?.height}:{String(values.enabled)}
  </output>
));

beforeEach(() => {
  vi.spyOn(HTMLElement.prototype, 'clientWidth', 'get').mockReturnValue(800);
  vi.spyOn(HTMLElement.prototype, 'clientHeight', 'get').mockReturnValue(600);
});

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
});

describe('showcase preview', () => {
  it.each([PreviewControlBar, PreviewControlPanel])('%s 范围标签承担播放开关，不再占用独立播放按钮', Controls => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const field = { kind: 'range', id: 'gap', label: '面板间距', defaultValue: 20, min: 0, max: 40, step: 2 } as const;
    const definition = definePreviewControls({ presentation: 'panel', sections: [{ controls: [field] }] });
    const startRangePlayback = vi.fn();
    const stopRangePlayback = vi.fn();
    const state = {
      values: { gap: 20 },
      canonicalValues: { gap: 20 },
      setValue: vi.fn(),
      applyValues: vi.fn(),
      reset: vi.fn(),
      startRangePlayback,
      stopRangePlayback,
    };
    act(() => root.render(<Controls definition={definition} controlState={state} onClose={() => undefined} />));
    const label = container.querySelector<HTMLButtonElement>('button[aria-pressed]');
    expect(label?.textContent).toBe('面板间距');
    expect(label?.getAttribute('aria-pressed')).toBe('false');
    expect(container.querySelector('button[aria-label="播放范围"]')).toBeNull();
    act(() => label?.click());
    expect(startRangePlayback).toHaveBeenCalledWith(field);
    act(() =>
      root.render(
        <Controls
          definition={definition}
          controlState={{ ...state, rangePlaybackId: 'gap' }}
          onClose={() => undefined}
        />,
      ),
    );
    expect(label?.getAttribute('aria-pressed')).toBe('true');
    act(() => label?.click());
    expect(stopRangePlayback).toHaveBeenCalledOnce();
    expect(container.querySelector('[role="slider"]')).not.toBeNull();
    act(() => root.unmount());
  });

  it('实测尺寸驱动重排，代码切换保留预览和控件状态，零尺寸不覆盖有效尺寸', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const requestSource = vi.fn();
    act(() =>
      root.render(
        <ComponentPreviewCard
          mode="showcase"
          onSourceRequested={requestSource}
          responsive
          name="responsive"
          Component={demo.Component}
          controlContract={contract}
          source={{ react: { files: [{ filename: 'demo.tsx', code: '<Demo />', lang: 'tsx' }] } }}
        />,
      ),
    );
    const output = container.querySelector('output');
    expect(output?.textContent).toBe('800x600:false');
    expect(requestSource).not.toHaveBeenCalled();
    expect(container.querySelector('aside')).toBeNull();
    expect(container.querySelector('[data-slot="preview-control-bar"]')).not.toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('button[role="switch"]')?.click());
    expect(output?.textContent).toBe('800x600:true');
    const codeButton = Array.from(container.querySelectorAll('button')).find(button => button.textContent === '代码');
    act(() => codeButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(requestSource).toHaveBeenCalledOnce();
    expect(container.querySelector('output')).toBe(output);
    expect(output?.closest('[aria-hidden="true"]')).not.toBeNull();
    expect(
      container.querySelector('[data-slot="preview-control-bar"]')?.closest('[aria-hidden="true"]'),
    ).not.toBeNull();
    expect(container.querySelector('[aria-label="代码模式"]')).not.toBeNull();
    act(() => {
      resize(326, 504);
      expect(output?.textContent).toBe('326x504:true');
    });
    expect(output?.textContent).toBe('326x504:true');
    act(() => resize(0, 0));
    expect(output?.textContent).toBe('326x504:true');
    const previewButton = Array.from(container.querySelectorAll('button')).find(
      button => button.textContent === '预览',
    );
    act(() => previewButton?.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', bubbles: true })));
    expect(output?.closest('[aria-hidden="true"]')).toBeNull();
    expect(container.querySelector('[data-slot="preview-control-bar"]')?.closest('[aria-hidden="true"]')).toBeNull();
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Zoom in"]')?.click());
    expect(output?.parentElement?.style.transform).toContain('scale(1.2)');
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="Reset"]')?.click());
    expect(output?.parentElement?.style.transform).toContain('scale(1)');
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="切换到常规模式"]')?.click());
    expect(container.querySelector('[data-preview-mode="default"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="preview-control-bar"]')).toBeNull();
    expect(container.querySelector('output')?.textContent).toContain(':true');
    expect(container.querySelector('output')?.textContent).toBe('800x600:true');
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="切换到展示模式"]')?.click());
    expect(container.querySelector('[data-preview-mode="showcase"]')).not.toBeNull();
    expect(container.querySelector('[data-slot="preview-control-bar"]')).not.toBeNull();
    expect(container.querySelector('output')?.textContent).toBe('800x600:true');
    act(() => root.unmount());
  });
  it('默认关闭响应式，两种布局都保留 demo 自身尺寸', () => {
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    act(() =>
      root.render(
        <ComponentPreviewCard mode="showcase" name="fixed" Component={demo.Component} controlContract={contract} />,
      ),
    );
    expect(container.querySelector('output')?.textContent).toBe('x:false');
    act(() => container.querySelector<HTMLButtonElement>('button[aria-label="切换到常规模式"]')?.click());
    expect(container.querySelector('output')?.textContent).toBe('x:false');
    act(() => root.unmount());
  });
});
