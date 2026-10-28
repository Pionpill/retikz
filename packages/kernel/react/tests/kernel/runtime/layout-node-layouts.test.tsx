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
  it('渲染期间不调用用户观察者', () => {
    const onArtifacts = vi.fn();

    renderToStaticMarkup(
      <Layout artifacts={{ nodeLayouts: true }} onArtifacts={onArtifacts}>
        <Node id="a" position={[0, 0]} text="A" />
      </Layout>,
    );

    expect(onArtifacts).not.toHaveBeenCalled();
  });

  it('提交后通知不可变的编译产物', async () => {
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

  it('不会重新编译等效的内联产物选项', async () => {
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

  it('只有内联观察者身份发生变化时，不再通知', async () => {
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
