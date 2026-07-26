// @vitest-environment jsdom
import type { IRScene } from '@retikz/core';

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

describe('<Layout onArtifacts>', () => {
  it('does not call user observer during render', () => {
    const onArtifacts = vi.fn();

    renderToStaticMarkup(
      <Layout artifacts={{ nodeLayouts: true }} onArtifacts={onArtifacts}>
        <Node id="a" position={[0, 0]} text="A" />
      </Layout>,
    );

    expect(onArtifacts).not.toHaveBeenCalled();
  });

  it('notifies immutable compiled artifacts after commit', async () => {
    const onArtifacts = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout artifacts={{ nodeLayouts: true }} onArtifacts={onArtifacts}>
          <Node id="a" position={[0, 0]} text="A" />
        </Layout>,
      );
    });

    expect(onArtifacts).toHaveBeenCalledTimes(1);
    expect(onArtifacts.mock.calls[0][0]).toEqual([
      expect.objectContaining({
        kind: 'nodeLayout',
        occurrence: { sourcePath: 'children[0].node', expansionPath: [] },
        value: expect.objectContaining({
          kind: 'node',
          id: 'a',
          content: expect.objectContaining({
            size: expect.objectContaining({
              width: expect.any(Number),
              height: expect.any(Number),
            }),
          }),
        }),
      }),
    ]);
    expect(Object.isFrozen(onArtifacts.mock.calls[0][0])).toBe(true);

    root.unmount();
    container.remove();
  });

  it('does not recompile for an equivalent inline artifacts option', async () => {
    const onArtifacts = vi.fn();
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }],
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const renderLayout = (tick: number) => (
      <div data-tick={tick}>
        <Layout ir={ir} artifacts={{ nodeLayouts: true }} onArtifacts={onArtifacts} />
      </div>
    );

    await act(() => {
      root.render(renderLayout(0));
    });
    expect(onArtifacts).toHaveBeenCalledTimes(1);

    await act(() => {
      root.render(renderLayout(1));
    });
    expect(onArtifacts).toHaveBeenCalledTimes(1);

    root.unmount();
    container.remove();
  });

  it('does not notify again when only the inline observer identity changes', async () => {
    let notificationCount = 0;
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [{ type: 'node', id: 'a', position: [0, 0], text: 'A' }],
    };
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);
    const renderLayout = (tick: number) => (
      <div data-tick={tick}>
        <Layout
          ir={ir}
          artifacts={{ nodeLayouts: true }}
          onArtifacts={() => {
            notificationCount += 1;
          }}
        />
      </div>
    );

    await act(() => {
      root.render(renderLayout(0));
    });
    expect(notificationCount).toBe(1);

    await act(() => {
      root.render(renderLayout(1));
    });
    expect(notificationCount).toBe(1);

    root.unmount();
    container.remove();
  });
});
