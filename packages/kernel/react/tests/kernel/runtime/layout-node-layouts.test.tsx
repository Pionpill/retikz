// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { renderToStaticMarkup } from 'react-dom/server';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { Layout, Node } from '../../../src';

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockImplementation(() => null);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('<Layout onNodeLayouts>', () => {
  it('does not call user observer during render', () => {
    const onNodeLayouts = vi.fn();

    renderToStaticMarkup(
      <Layout onNodeLayouts={onNodeLayouts}>
        <Node id="a" position={[0, 0]} text="A" />
      </Layout>,
    );

    expect(onNodeLayouts).not.toHaveBeenCalled();
  });

  it('notifies compiled node layouts after commit', async () => {
    const onNodeLayouts = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout onNodeLayouts={onNodeLayouts}>
          <Node id="a" position={[0, 0]} text="A" />
        </Layout>,
      );
    });

    expect(onNodeLayouts).toHaveBeenCalledTimes(1);
    expect(onNodeLayouts.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        kind: 'node',
        id: 'a',
        content: expect.objectContaining({
          size: expect.objectContaining({
            width: expect.any(Number),
            height: expect.any(Number),
          }),
        }),
      }),
    ]);

    root.unmount();
    container.remove();
  });
});
