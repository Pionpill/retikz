import { Fragment } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Circle, Node, Path, Step, collectHydrationHandlers } from '../src';

/**
 * ADR-01 水合：collectHydrationHandlers（与 buildIR 同源遍历，按 id 收 handler）
 * @description 穿透 Fragment、展开 Sugar 后按各元素 id 把 on<Event> props 收成
 *   `{ [id]: { click, ... } }`（on<Event> → RetikzEventValue 去 on 前缀首字母小写）。
 *   无 id 带 handler → dev warn + 跳过；重复 id → dev warn + 合并/后覆盖。
 *   stub 阶段 collectHydrationHandlers 恒返回 {}，下列断言此刻预期 fail。
 */

afterEach(() => {
  vi.restoreAllMocks();
});

describe('collectHydrationHandlers', () => {
  it('基本：<Node id onClick> 收成 { a: { click } }', () => {
    const click = vi.fn();
    const handlers = collectHydrationHandlers(<Node id="a" position={[0, 0]} onClick={click} />);

    expect(Object.keys(handlers)).toEqual(['a']);
    expect(handlers.a.click).toBe(click);
  });

  it('穿透 Fragment + 多元素：各自按 id 收集', () => {
    const clickA = vi.fn();
    const clickB = vi.fn();
    const handlers = collectHydrationHandlers(
      <Fragment>
        <Node id="a" position={[0, 0]} onClick={clickA} />
        <Node id="b" position={[2, 0]} onClick={clickB} />
      </Fragment>,
    );

    expect(handlers.a.click).toBe(clickA);
    expect(handlers.b.click).toBe(clickB);
  });

  it('Sugar：<Circle id onClick> handler 归到展开后承载 id 的 Kernel 元素', () => {
    const click = vi.fn();
    const handlers = collectHydrationHandlers(
      <Circle id="ring" center={[0, 0]} radius={1} onClick={click} />,
    );

    expect(handlers.ring.click).toBe(click);
  });

  it('无 id 带 handler：dev warn + 跳过，不进注册表', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const click = vi.fn();
    const handlers = collectHydrationHandlers(<Node position={[0, 0]} onClick={click} />);

    expect(handlers).toEqual({});
    expect(warn).toHaveBeenCalledTimes(1);
  });

  it('重复 id：dev warn，合并不同事件、同事件后者覆盖', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const firstClick = vi.fn();
    const secondClick = vi.fn();
    const enter = vi.fn();
    const handlers = collectHydrationHandlers(
      <Fragment>
        <Node id="dup" position={[0, 0]} onClick={firstClick} />
        <Node id="dup" position={[1, 0]} onClick={secondClick} onPointerEnter={enter} />
      </Fragment>,
    );

    // 同事件后者覆盖
    expect(handlers.dup.click).toBe(secondClick);
    // 合并不同事件
    expect(handlers.dup.pointerEnter).toBe(enter);
    expect(warn).toHaveBeenCalled();
  });

  it('全部事件 props → 正确 RetikzEventValue 映射（pointerEnter / rightClick 等）', () => {
    const onClick = vi.fn();
    const onDoubleClick = vi.fn();
    const onRightClick = vi.fn();
    const onPointerDown = vi.fn();
    const onPointerUp = vi.fn();
    const onPointerMove = vi.fn();
    const onPointerEnter = vi.fn();
    const onPointerLeave = vi.fn();
    const onWheel = vi.fn();
    const handlers = collectHydrationHandlers(
      <Node
        id="a"
        position={[0, 0]}
        onClick={onClick}
        onDoubleClick={onDoubleClick}
        onRightClick={onRightClick}
        onPointerDown={onPointerDown}
        onPointerUp={onPointerUp}
        onPointerMove={onPointerMove}
        onPointerEnter={onPointerEnter}
        onPointerLeave={onPointerLeave}
        onWheel={onWheel}
      />,
    );

    expect(handlers.a).toEqual({
      click: onClick,
      doubleClick: onDoubleClick,
      rightClick: onRightClick,
      pointerDown: onPointerDown,
      pointerUp: onPointerUp,
      pointerMove: onPointerMove,
      pointerEnter: onPointerEnter,
      pointerLeave: onPointerLeave,
      wheel: onWheel,
    });
  });

  it('Path id 透传 + handler：<Path id onClick> 收成 { e1: { click } }', () => {
    const click = vi.fn();
    const handlers = collectHydrationHandlers(
      <Path id="e1" onClick={click}>
        <Step kind="move" to={[0, 0]} />
        <Step kind="line" to={[2, 0]} />
      </Path>,
    );

    expect(handlers.e1.click).toBe(click);
  });
});
