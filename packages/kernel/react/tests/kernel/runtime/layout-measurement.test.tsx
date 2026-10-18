// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { Layout, Node } from '../../../src';

afterEach(() => vi.unstubAllGlobals());

describe('Layout 测量接线', () => {
  it.each(['static', 'retained'] as const)('%s 在测量器和宿主字体变化后重新处理', async mode => {
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    const container = document.createElement('div');
    const root = createRoot(container);
    const first = vi.fn(() => ({ width: 40, height: 16 }));
    const second = vi.fn(() => ({ width: 100, height: 16 }));
    const render = (measureText: typeof first, fontFamily: string) =>
      root.render(
        <Layout measureText={measureText} style={{ fontFamily }} runtime={{ mode }}>
          <Node position={[0, 0]}>Alpha</Node>
        </Layout>,
      );
    try {
      await act(() => render(first, 'serif'));
      const initial = container.querySelector('svg')?.getAttribute('viewBox');
      await act(() => render(second, 'monospace'));
      expect(second).toHaveBeenCalledWith('Alpha', expect.objectContaining({ family: 'monospace' }));
      expect(container.querySelector('svg')?.getAttribute('viewBox')).not.toBe(initial);
      expect(container.querySelector('svg')?.style.fontFamily).toBe('monospace');
    } finally {
      await act(() => root.unmount());
    }
  });
  it('将显式测量器与宿主字体交给 Vanilla，并保留显示字体', () => {
    const measureText = vi.fn(() => ({ width: 80, height: 16 }));
    const html = renderToStaticMarkup(
      <Layout measureText={measureText} style={{ fontFamily: 'serif' }}>
        <Node position={[0, 0]}>Alpha</Node>
      </Layout>,
    );
    expect(measureText).toHaveBeenCalledWith('Alpha', expect.objectContaining({ family: 'serif' }));
    expect(html).toContain('font-family:serif');
  });
});
