// @vitest-environment jsdom
import { isRetikzError } from '@retikz/foundation';
import { createRuntimeIdentity } from '@retikz/runtime';
import { describe, expect, it, vi } from 'vitest';

import type { HydrationHandlers, HydrationTarget } from '../../src/hydration';
import type { HydrationController } from '../../src/hydration';

import { RetikzRenderError, RetikzRenderErrorCode } from '../../src/error';
import { createHydrationController, locateSvg } from '../../src/hydration';

/**
 * 水合 renderer 无关控制器：根级委托 + enter/leave 合成 + dispose
 * @description SVG 路径用 locateSvg（closest data-retikz-id）做定位。构造带挂点的真实 DOM，dispatch DOM 事件，
 *   断言对应 handler 触发 / enter-leave 合成 / rightClick(contextmenu) 映射 / dispose 解绑。
 *   stub 阶段 createHydrationController 空实现，断言此刻预期 fail
 */

/** 构造一个挂载了带 data-retikz-id 子元素的根容器（含一个图元 a，内含两个子节点模拟分段） */
const setupRoot = (): {
  root: HTMLElement;
  nodeA: SVGElement;
  childA1: SVGElement;
  childA2: SVGElement;
  nodeB: SVGElement;
} => {
  const root = document.createElement('div');
  const svgNs = 'http://www.w3.org/2000/svg';
  const nodeA = document.createElementNS(svgNs, 'g');
  nodeA.setAttribute('data-retikz-id', 'a');
  const childA1 = document.createElementNS(svgNs, 'rect');
  const childA2 = document.createElementNS(svgNs, 'text');
  nodeA.appendChild(childA1);
  nodeA.appendChild(childA2);
  const nodeB = document.createElementNS(svgNs, 'rect');
  nodeB.setAttribute('data-retikz-id', 'b');
  root.appendChild(nodeA);
  root.appendChild(nodeB);
  document.body.appendChild(root);
  return { root, nodeA, childA1, childA2, nodeB };
};

/** 在指定 target 上派发可冒泡事件（relatedTarget 用于 over/out 合成） */
const dispatch = (target: EventTarget, type: string, relatedTarget?: EventTarget | null): void => {
  const event =
    type === 'pointerover' || type === 'pointerout'
      ? new MouseEvent(type, { bubbles: true, relatedTarget: relatedTarget ?? null })
      : new Event(type, { bubbles: true });
  target.dispatchEvent(event);
};

describe('Hydration 控制器', () => {
  it('click-dispatch：点击命中 id 的子元素 → 对应 handler 触发', () => {
    const { root, childA1 } = setupRoot();
    const onClick = vi.fn();
    const handlers: HydrationHandlers = { a: { click: onClick } };
    const controller = createHydrationController(root, handlers, locateSvg);

    dispatch(childA1, 'click');

    expect(onClick).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('right-click-maps-contextmenu：DOM contextmenu → rightClick handler 触发', () => {
    const { root, nodeB } = setupRoot();
    const onRightClick = vi.fn();
    const handlers: HydrationHandlers = { b: { rightClick: onRightClick } };
    const controller = createHydrationController(root, handlers, locateSvg);

    dispatch(nodeB, 'contextmenu');

    expect(onRightClick).toHaveBeenCalledTimes(1);
    controller.dispose();
  });

  it('enter-leave-synthesis：pointerEnter/Leave 经 pointermove + 命中 id 状态机合成，跨 id 触发一次、同 id 内不重复', () => {
    const { root, nodeA, childA1, childA2, nodeB } = setupRoot();
    const onEnterA = vi.fn();
    const onLeaveA = vi.fn();
    const onEnterB = vi.fn();
    const handlers: HydrationHandlers = {
      a: { pointerEnter: onEnterA, pointerLeave: onLeaveA },
      b: { pointerEnter: onEnterB },
    };
    const controller = createHydrationController(root, handlers, locateSvg);

    // 进入图元 a 的子节点 → a 的 enter 一次
    dispatch(childA1, 'pointermove');
    expect(onEnterA).toHaveBeenCalledTimes(1);
    expect(onLeaveA).toHaveBeenCalledTimes(0);

    // 在图元 a 内部 childA1 → childA2 移动（命中 id 仍是 a）→ 不重复触发 enter / leave
    dispatch(childA2, 'pointermove');
    expect(onEnterA).toHaveBeenCalledTimes(1);
    expect(onLeaveA).toHaveBeenCalledTimes(0);

    // 跨 id 移动到图元 b → a 的 leave 一次、b 的 enter 一次
    dispatch(nodeB, 'pointermove');
    expect(onLeaveA).toHaveBeenCalledTimes(1);
    expect(onEnterB).toHaveBeenCalledTimes(1);

    void nodeA;
    controller.dispose();
  });

  it('同一 semantic owner 的多个 occurrence 之间移动不重复触发 enter/leave', () => {
    const root = document.createElement('div');
    const owner = createRuntimeIdentity('hydration-owner', ['owner']);
    const targets: ReadonlyArray<HydrationTarget> = ['shape', 'label'].map(segment => ({
      identity: createRuntimeIdentity('hydration-owner', ['owner', segment]),
      semanticOwner: owner,
      publicId: 'owner',
    }));
    let current: HydrationTarget | null = targets[0];
    const onEnter = vi.fn();
    const onLeave = vi.fn();
    const controller = createHydrationController(
      root,
      { owner: { pointerEnter: onEnter, pointerLeave: onLeave } },
      () => current,
    );

    root.dispatchEvent(new Event('pointermove'));
    current = targets[1];
    root.dispatchEvent(new Event('pointermove'));

    expect(onEnter).toHaveBeenCalledTimes(1);
    expect(onLeave).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('leave-whole-figure：pointerleave 离开整图 → lastHitId 的 leave 触发并清空命中态', () => {
    const { root, childA1 } = setupRoot();
    const onLeaveA = vi.fn();
    const handlers: HydrationHandlers = { a: { pointerLeave: onLeaveA } };
    const controller = createHydrationController(root, handlers, locateSvg);

    // 先进入图元 a 建立命中态
    dispatch(childA1, 'pointermove');
    expect(onLeaveA).toHaveBeenCalledTimes(0);

    // 离开整图（root pointerleave，不冒泡）→ a 的 leave 一次
    root.dispatchEvent(new MouseEvent('pointerleave', { bubbles: false, relatedTarget: null }));
    expect(onLeaveA).toHaveBeenCalledTimes(1);

    // 命中态已清空：再 pointerleave 不重复触发
    root.dispatchEvent(new MouseEvent('pointerleave', { bubbles: false, relatedTarget: null }));
    expect(onLeaveA).toHaveBeenCalledTimes(1);

    controller.dispose();
  });

  it('dispose-detaches：dispose 后事件不再触发、listener 解绑', () => {
    const { root, childA1 } = setupRoot();
    const onClick = vi.fn();
    const handlers: HydrationHandlers = { a: { click: onClick } };
    const controller = createHydrationController(root, handlers, locateSvg);

    dispatch(childA1, 'click');
    expect(onClick).toHaveBeenCalledTimes(1);

    controller.dispose();
    dispatch(childA1, 'click');
    expect(onClick).toHaveBeenCalledTimes(1); // 解绑后不再增加
    expect(() => controller.dispose()).not.toThrow(); // 再次 dispose 不抛
  });

  it('dispose-retry：单个 listener 解绑失败时保留失败项并继续清理，其后可重试', () => {
    const { root, childA1 } = setupRoot();
    const onClick = vi.fn();
    const onDoubleClick = vi.fn();
    const originalRemove = root.removeEventListener.bind(root);
    let rejectClickRemoval = true;
    const remove = vi.spyOn(root, 'removeEventListener').mockImplementation((type, listener, options) => {
      if (type === 'click' && rejectClickRemoval) {
        rejectClickRemoval = false;
        throw new Error('click listener removal rejected');
      }
      originalRemove(type, listener, options);
    });
    const controller = createHydrationController(
      root,
      { a: { click: onClick, doubleClick: onDoubleClick } },
      locateSvg,
    );

    expect(() => controller.dispose()).toThrow('click listener removal rejected');
    dispatch(childA1, 'click');
    dispatch(childA1, 'dblclick');
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(onDoubleClick).not.toHaveBeenCalled();
    expect(remove.mock.calls.map(([type]) => type)).toEqual(['click', 'dblclick']);

    expect(() => controller.dispose()).not.toThrow();
    dispatch(childA1, 'click');
    expect(onClick).toHaveBeenCalledTimes(1);
    expect(remove.mock.calls.map(([type]) => type)).toEqual(['click', 'dblclick', 'click']);
  });

  it('no-handler-no-throw：命中 id 但无对应事件 handler → 静默、不抛', () => {
    const { root, nodeB } = setupRoot();
    const handlers: HydrationHandlers = { a: { click: vi.fn() } };
    const controller = createHydrationController(root, handlers, locateSvg);

    expect(() => dispatch(nodeB, 'click')).not.toThrow();
    controller.dispose();
  });

  it('listener 注册中途失败会反向清理已挂载 listener', () => {
    const added: Array<string> = [];
    const removed: Array<string> = [];
    const root = {
      addEventListener: (type: string) => {
        if (type === 'dblclick') throw new Error('listener rejected');
        added.push(type);
      },
      removeEventListener: (type: string) => removed.push(type),
    } as unknown as EventTarget;

    expect(() =>
      createHydrationController(root, { node: { click: vi.fn(), doubleClick: vi.fn() } }, () => null),
    ).toThrow('listener rejected');
    expect(added).toEqual(['click']);
    expect(removed).toEqual(['click']);
  });

  it('listener 注册与反向解绑连续失败时暴露可重试的 controller，且保留注册失败为 primary cause', () => {
    const listeners = new Map<string, EventListener>();
    let rejectRemoval = true;
    const setupCause = new Error('listener rejected');
    const cleanupCause = new Error('listener removal rejected');
    const root = {
      addEventListener: (type: string, listener: EventListenerOrEventListenerObject) => {
        if (type === 'dblclick') throw setupCause;
        listeners.set(type, listener as EventListener);
      },
      removeEventListener: (type: string) => {
        if (rejectRemoval) {
          rejectRemoval = false;
          throw cleanupCause;
        }
        listeners.delete(type);
      },
    } as unknown as EventTarget;

    let failure: unknown;
    try {
      createHydrationController(root, { node: { click: vi.fn(), doubleClick: vi.fn() } }, () => null);
    } catch (cause) {
      failure = cause;
    }

    expect(failure).toBeInstanceOf(RetikzRenderError);
    expect(isRetikzError(failure)).toBe(true);
    expect(failure).toEqual(
      expect.objectContaining({
        name: 'RetikzRenderError',
        code: RetikzRenderErrorCode.HydrationControllerSetupFailed,
        cause: setupCause,
        details: expect.objectContaining({ cleanupCause }),
      }),
    );
    expect(listeners.has('click')).toBe(true);
    if (!(failure instanceof RetikzRenderError)) throw new Error('expected hydration setup error');
    const controller = failure.details.controller as HydrationController;
    expect(() => controller.dispose()).not.toThrow();
    expect(listeners.size).toBe(0);
  });
});

describe('locateSvg 定位', () => {
  it('closest-data-id：从子元素上溯到最近 data-retikz-id', () => {
    const { childA1 } = setupRoot();
    const event = new Event('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: childA1, configurable: true });
    expect(locateSvg(event)).toBe('a');
  });

  it('miss-returns-null：事件落在无挂点元素 → null', () => {
    const bare = document.createElement('div');
    const event = new Event('click', { bubbles: true });
    Object.defineProperty(event, 'target', { value: bare, configurable: true });
    expect(locateSvg(event)).toBeNull();
  });
});
