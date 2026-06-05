// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout, Node } from '../src';
import { createGeometryContext } from './helpers/geometryContext';

/**
 * ADR-01 水合：renderer 双模事件等价（roadmap 验收硬指标）
 * @description 同一 <Node id onClick> 在 renderer="svg" 与 renderer="canvas" 下点击同一逻辑位置 →
 *   同一 spy 触发（同一注册表 + 同一分发，定位层不同）。stub 阶段接线未实装，断言此刻预期 fail。
 */

const SIZE = 200;

const installCanvasHarness = (): { restore: () => void } => {
  const getContext = vi
    .spyOn(HTMLCanvasElement.prototype, 'getContext')
    .mockImplementation((contextId: string) =>
      contextId === '2d' ? (createGeometryContext()) : null,
    );
  const getRect = vi
    .spyOn(HTMLCanvasElement.prototype, 'getBoundingClientRect')
    .mockImplementation(
      () => ({ left: 0, top: 0, right: SIZE, bottom: SIZE, width: SIZE, height: SIZE, x: 0, y: 0, toJSON: () => ({}) }),
    );
  return {
    restore: () => {
      getContext.mockRestore();
      getRect.mockRestore();
    },
  };
};

beforeEach(() => {
  (globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe('renderer 双模事件等价', () => {
  it('同一 <Node onClick> 在 svg 与 canvas 下点击 → 同一 spy 各触发一次', async () => {
    const onClick = vi.fn();
    const figure = (
      <Node id="a" position={[0, 0]} fill="red" minimumSize={2} onClick={onClick} />
    );

    // ── svg ──
    const svgContainer = document.createElement('div');
    document.body.appendChild(svgContainer);
    const svgRoot = createRoot(svgContainer);
    await act(() => {
      svgRoot.render(
        <Layout renderer="svg" width={SIZE} height={SIZE}>
          {figure}
        </Layout>,
      );
    });
    const svgTarget = svgContainer.querySelector('[data-retikz-id="a"]');
    expect(svgTarget).not.toBeNull();
    await act(() => {
      svgTarget!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });
    svgRoot.unmount();
    svgContainer.remove();

    expect(onClick).toHaveBeenCalledTimes(1);

    // ── canvas（同一逻辑位置：图心）──
    const harness = installCanvasHarness();
    const canvasContainer = document.createElement('div');
    document.body.appendChild(canvasContainer);
    const canvasRoot = createRoot(canvasContainer);
    await act(() => {
      canvasRoot.render(
        <Layout renderer="canvas" width={SIZE} height={SIZE}>
          {figure}
        </Layout>,
      );
    });
    const canvas = canvasContainer.querySelector('canvas');
    expect(canvas).not.toBeNull();
    await act(() => {
      canvas!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: SIZE / 2, clientY: SIZE / 2 }),
      );
    });
    canvasRoot.unmount();
    canvasContainer.remove();
    harness.restore();

    // 双模各触发一次，同一 spy 累计两次
    expect(onClick).toHaveBeenCalledTimes(2);
  });
});
