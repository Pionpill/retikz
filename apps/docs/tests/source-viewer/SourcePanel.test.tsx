// @vitest-environment jsdom
import type { Root } from 'react-dom/client';

import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { SourcePanel } from '../../src/modules/docs/source-viewer';
import { useRightPanelStore } from '../../src/modules/docs/store';

vi.mock('../../src/modules/docs/components/highlight-code', () => ({
  HighlightCode: ({
    code,
    lineNumberStart,
    activeLineRange,
    showLineNumbers,
  }: {
    code: string;
    lineNumberStart?: number;
    activeLineRange?: { start: number; end: number };
    showLineNumbers?: boolean;
  }) => (
    <pre
      data-code={code}
      data-line-number-start={lineNumberStart}
      data-active-line-range={activeLineRange ? `${activeLineRange.start}-${activeLineRange.end}` : ''}
      data-show-line-numbers={showLineNumbers ? 'true' : undefined}
    />
  ),
}));

const roots: Array<Root> = [];

const render = (): HTMLElement => {
  const container = document.createElement('div');
  document.body.appendChild(container);
  const root = createRoot(container);
  roots.push(root);

  act(() => {
    root.render(
      <SourcePanel
        source={{
          label: 'Scalar assertions',
          path: 'packages/kernel/foundation/src/assert.ts',
          startLine: 3,
          endLine: 4,
        }}
      />,
    );
  });

  return container;
};

beforeEach(() => {
  useRightPanelStore.getState().close();
});

afterEach(() => {
  act(() => {
    roots.splice(0).forEach(root => root.unmount());
  });
  document.body.replaceChildren();
  vi.unstubAllGlobals();
});

describe('<SourcePanel>', () => {
  it('获取 raw GitHub 源码，并把引用行范围交给高亮器', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('export const value = 1;'));
    vi.stubGlobal('fetch', fetchMock);

    const container = await render();

    await act(async () => {
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledWith(
      'https://raw.githubusercontent.com/Pionpill/retikz/main/packages/kernel/foundation/src/assert.ts',
      expect.objectContaining({ signal: expect.any(AbortSignal) }),
    );
    expect(container.querySelector('[data-code]')?.getAttribute('data-code')).toBe('export const value = 1;');
    expect(container.querySelector('[data-line-number-start]')?.getAttribute('data-line-number-start')).toBe('1');
    expect(container.querySelector('[data-active-line-range]')?.getAttribute('data-active-line-range')).toBe('3-4');
    expect(container.querySelector('[data-show-line-numbers]')?.getAttribute('data-show-line-numbers')).toBe('true');

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-source-line-highlight-toggle]')?.click();
    });

    expect(container.querySelector('[data-active-line-range]')?.getAttribute('data-active-line-range')).toBe('');
  });

  it('请求失败后允许重试并展示新的源码', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('temporarily unavailable', { status: 503, statusText: 'Service Unavailable' }),
      )
      .mockResolvedValueOnce(new Response('export const recovered = true;'));
    vi.stubGlobal('fetch', fetchMock);

    const container = await render();

    await act(async () => {
      await Promise.resolve();
    });
    expect(container.querySelector('[data-source-retry]')).not.toBeNull();

    await act(async () => {
      container.querySelector<HTMLButtonElement>('[data-source-retry]')?.click();
      await Promise.resolve();
    });

    expect(fetchMock).toHaveBeenCalledTimes(2);
    expect(container.querySelector('[data-code]')?.getAttribute('data-code')).toBe('export const recovered = true;');
  });
});
