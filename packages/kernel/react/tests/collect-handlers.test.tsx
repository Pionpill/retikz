import { type FC, Fragment, forwardRef, memo } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Circle, Node, Path, Scope, Step, collectHydrationHandlers } from '../src';

/**
 * 水合：collectHydrationHandlers（与 buildIR 同源遍历，按 id 收 handler）
 * @description 穿透 Fragment、递归 Scope 子级、展开 Sugar / wrapper 后按各元素 id 把 on<Event> props 收成
 *   `{ [id]: { click, ... } }`（on<Event> → RetikzEventValue 去 on 前缀首字母小写）。
 *   无 id 带 handler → dev warn + 跳过；重复 id → dev warn + 合并/后覆盖。
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

  it('Scope 内元素：递归 Scope 子级收集 handler（不被容器吞掉）', () => {
    const clickA = vi.fn();
    const clickB = vi.fn();
    const handlers = collectHydrationHandlers(
      <Scope>
        <Node id="a" position={[0, 0]} onClick={clickA} />
        <Scope>
          <Node id="b" position={[2, 0]} onClick={clickB} />
        </Scope>
      </Scope>,
    );

    expect(handlers.a.click).toBe(clickA);
    expect(handlers.b.click).toBe(clickB);
  });

  it('Sugar handler 不重复注册：展开后内层 Path 携带同 id 但无 handler', () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined);
    const click = vi.fn();
    const handlers = collectHydrationHandlers(
      <Circle id="ring" center={[0, 0]} radius={1} onClick={click} />,
    );

    expect(handlers.ring.click).toBe(click);
    // 内层展开的 Path 虽透传了 id="ring"，但无 handler → 不触发重复 id warn
    expect(warn).not.toHaveBeenCalled();
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

  describe('带 displayName 的 wrapper 组件展开行为', () => {
    it('普通函数 wrapper（带自定义 displayName）：同步展开 → 内层 Kernel 的 handler 按 id 收集', () => {
      const click = vi.fn();
      const Wrapper: FC = () => <Node id="inner" position={[0, 0]} onClick={click} />;
      Wrapper.displayName = 'MyWrapper';

      const handlers = collectHydrationHandlers(<Wrapper />);

      expect(handlers.inner.click).toBe(click);
    });

    it('函数 wrapper 自身挂 id + handler 时，wrapper 元素自身的 handler 也按其 id 收集（展开前先读自身）', () => {
      const outer = vi.fn();
      const inner = vi.fn();
      const Wrapper: FC<{ id?: string; onClick?: typeof outer }> = () => (
        <Node id="inner" position={[0, 0]} onClick={inner} />
      );
      Wrapper.displayName = 'MyWrapper';

      const handlers = collectHydrationHandlers(<Wrapper id="outer" onClick={outer} />);

      // wrapper 元素自身（id="outer"）的 handler 与展开后内层（id="inner"）的 handler 各自按 id 收集
      expect(handlers.outer.click).toBe(outer);
      expect(handlers.inner.click).toBe(inner);
    });

    it('memo wrapper（type 为对象、非函数）：不被穿透展开 → 内层 handler 不被收集（静默跳过）', () => {
      const click = vi.fn();
      const Inner: FC = () => <Node id="inner" position={[0, 0]} onClick={click} />;
      Inner.displayName = 'Inner';
      const Memoized = memo(Inner);
      Memoized.displayName = 'MemoWrapper';

      const handlers = collectHydrationHandlers(<Memoized />);

      // memo 的 type 是对象不是函数，collect 不调用它展开 → 内层 id="inner" 的 handler 收不到
      expect(handlers).toEqual({});
    });

    it('memo wrapper 自身挂 id + handler：wrapper 元素自身的 handler 仍按其 id 收集（不依赖展开）', () => {
      const onClick = vi.fn();
      const Inner: FC = () => <Node id="inner" position={[0, 0]} />;
      Inner.displayName = 'Inner';
      const Memoized = memo<{ id?: string; onClick?: typeof onClick }>(Inner);
      Memoized.displayName = 'MemoWrapper';

      const handlers = collectHydrationHandlers(<Memoized id="outer" onClick={onClick} />);

      // 自身 handler 读自元素 props（与是否能展开无关）；内层不展开故不出现
      expect(handlers.outer.click).toBe(onClick);
      expect(handlers).not.toHaveProperty('inner');
    });

    it('forwardRef wrapper（type 为对象、非函数）：不被穿透展开 → 内层 handler 不被收集（静默跳过）', () => {
      const click = vi.fn();
      const Forwarded = forwardRef<unknown>(() => <Node id="inner" position={[0, 0]} onClick={click} />);
      Forwarded.displayName = 'ForwardWrapper';

      const handlers = collectHydrationHandlers(<Forwarded />);

      expect(handlers).toEqual({});
    });
  });
});
