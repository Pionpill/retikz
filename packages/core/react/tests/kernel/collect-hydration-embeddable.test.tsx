import type { FC } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  type EmbeddableTier2Adapter,
  Node,
  Scope,
  collectHydrationHandlers,
} from '../../src';

/**
 * 水合：collectHydrationHandlers 对可嵌入 Tier2 子组件的处理
 * @description 可嵌入子组件先捕获其自身挂点的 id + on<Event>，但绝不被调用 / 递归（其内部由 composite lowering 管理）——
 *   这正是本特性要修的崩溃：collect 阶段同步调用组件会在 re-render / 语言切换时触发其 hook。
 *   覆盖：自身 id + handler 仍收集且 body 不被调用；普通 Sugar wrapper 仍展开；Scope 内嵌套同理；标记但缺 adapter → throw。
 */

/** 可嵌入子组件 type 上可挂的可嵌入静态属性形状（避免 as any） */
type EmbeddableType<TProps> = FC<TProps> & {
  isTier2Embeddable?: boolean;
  embeddableAdapter?: EmbeddableTier2Adapter;
};

/** 标准 adapter：静态贡献一个占位 node，不解释 datasets / composites */
const makeAdapter = (displayName: string): EmbeddableTier2Adapter => ({
  displayName,
  namespace: 'demo',
  contribute: () => ({
    node: { type: 'node', id: 'a', position: [0, 0] },
    datasets: {},
    makeComposites: () => [],
  }),
});

/**
 * 造一个 hook-free 的可嵌入子组件 fixture，body 命中即翻转闭包标志并抛错
 * @description 用于断言 collect 阶段绝不调用组件 body；marked 控制是否带 isTier2Embeddable，withAdapter 控制是否挂 adapter
 */
const makeEmbeddableFixture = (
  displayName: string,
  options: { marked: boolean; withAdapter: boolean },
): { Component: EmbeddableType<{ id?: string; onClick?: () => void }>; wasCalled: () => boolean } => {
  let called = false;
  const Component: EmbeddableType<{ id?: string; onClick?: () => void }> = () => {
    called = true;
    throw new Error('可嵌入子组件 body 不应在 collect 阶段被调用');
  };
  Component.displayName = displayName;
  if (options.marked) {
    Component.isTier2Embeddable = true;
    if (options.withAdapter) {
      Component.embeddableAdapter = makeAdapter(displayName);
    }
  }
  return { Component, wasCalled: () => called };
};

describe('collectHydrationHandlers + 可嵌入 Tier2', () => {
  it('可嵌入元素自身 id + onClick：收集其挂点 handler，且 body 绝不被调用', () => {
    const click = vi.fn();
    const { Component, wasCalled } = makeEmbeddableFixture('Plot', {
      marked: true,
      withAdapter: true,
    });

    const handlers = collectHydrationHandlers(<Component id="a" onClick={click} />);

    expect(handlers.a.click).toBe(click);
    expect(wasCalled()).toBe(false);
  });

  it('回归：普通 Sugar wrapper 仍被展开，内层 Kernel handler 按 id 收集', () => {
    const click = vi.fn();
    const Wrapper: FC = () => <Node id="x" position={[0, 0]} onClick={click} />;
    Wrapper.displayName = 'MyWrapper';

    const handlers = collectHydrationHandlers(<Wrapper />);

    expect(handlers.x.click).toBe(click);
  });

  it('Scope 内嵌可嵌入元素：自身 id + handler 仍收集，body 不被调用', () => {
    const click = vi.fn();
    const { Component, wasCalled } = makeEmbeddableFixture('Plot', {
      marked: true,
      withAdapter: true,
    });

    const handlers = collectHydrationHandlers(
      <Scope>
        <Component id="a" onClick={click} />
      </Scope>,
    );

    expect(handlers.a.click).toBe(click);
    expect(wasCalled()).toBe(false);
  });

  it('标记但缺 adapter：collectHydrationHandlers fail-loud throw', () => {
    const { Component } = makeEmbeddableFixture('Broken', {
      marked: true,
      withAdapter: false,
    });

    expect(() => collectHydrationHandlers(<Component id="a" />)).toThrow(
      /isTier2Embeddable/,
    );
  });
});
