// @vitest-environment jsdom
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Layout, Node } from '../src';
import { createGeometryContext } from './helpers/geometryContext';

/**
 * ADR-01 水合：Canvas 模式事件绑定（端到端）
 * @description <Layout renderer="canvas"> 在 <canvas> 上 dispatch 命中节点的 pointer / click 事件 →
 *   对应 onClick 触发。canvas 无逐图元 DOM，定位走 hitTest + client→Scene 逆 meet-fit 坐标映射。
 *   注入几何忠实 context（充当原生 canvas 原语）+ getBoundingClientRect harness，hitTest / 控制器 /
 *   坐标映射真实逻辑仍受测。stub 阶段接线未实装，断言此刻预期 fail。
 */

const SIZE = 200;

/** 在 jsdom canvas 上挂几何 context + 固定 bounding rect harness */
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

describe('Canvas 水合', () => {
  it('在 canvas 上点击命中节点的逻辑位置 → 对应 onClick 触发', async () => {
    const harness = installCanvasHarness();
    const onClick = vi.fn();
    const container = document.createElement('div');
    document.body.appendChild(container);
    const root = createRoot(container);

    await act(() => {
      root.render(
        <Layout renderer="canvas" width={SIZE} height={SIZE}>
          <Node id="a" position={[0, 0]} fill="red" minimumSize={2} onClick={onClick} />
        </Layout>,
      );
    });

    const canvas = container.querySelector('canvas');
    expect(canvas).not.toBeNull();

    // 单节点即整图内容，bbox 中心映射到画布显示中心；点画布中心命中该节点
    await act(() => {
      canvas!.dispatchEvent(
        new MouseEvent('click', { bubbles: true, clientX: SIZE / 2, clientY: SIZE / 2 }),
      );
    });

    expect(onClick).toHaveBeenCalledTimes(1);

    root.unmount();
    container.remove();
    harness.restore();
  });
});
