import { type FC, Fragment, useEffect, useState } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { CompositeBaseSchema, type CompositeDefinition, defineComposite } from '@retikz/core';
import {
  type EmbeddableTier2Adapter,
  buildIRWithContributions,
  collectHydrationHandlers,
} from '../../src';
import { Layout } from '../../src/kernel/Layout';

/**
 * 端到端回归护栏：可嵌入 Tier2 子组件的函数体在静态遍历期间「绝不被调用 / 渲染」。
 * @description 该特性存在的根因 bug：可嵌入组件曾在静态遍历（buildIR / collectHydrationHandlers）期间被同步
 *   CALL，触发其 React hooks（useId/useMemo）在 React render 之外执行，污染宿主 hook 顺序——
 *   重渲染 / i18n 语言切换时崩溃。本文件用「函数体一旦执行即抛」的 fixture 钉死两条遍历链与重渲染路径。
 *
 * 测试工具说明：本包 vitest 环境为 `node`（无 jsdom），且仓库未安装 @testing-library/react /
 *   react-test-renderer，React 为 18.2（无 `act`）。为不引入新依赖 / 不改测试环境配置，
 *   用 react-dom/server `renderToStaticMarkup` 驱动真实 React 渲染（hooks 在 SSR 期间确实执行），
 *   并以「同子树多次渲染 + 变更无关 prop」模拟重渲染 / 语言切换；回归向量（静态遍历期误调函数体触发 hook）
 *   在此路径下被完整覆盖。
 */

/** 可嵌入 fixture 的 props 形状 */
type FixtureProps = { id: string; data: unknown };

/** 可嵌入 fixture 组件类型：函数组件 + 可嵌入静态标记 */
type EmbeddableFixture = FC<FixtureProps> & {
  isTier2Embeddable?: boolean;
  embeddableAdapter?: EmbeddableTier2Adapter;
};

/**
 * 为某 namespace 造一个 composite 定义：节点带 panelId，展开成 id=`panel-${panelId}` 的 Tier1 <Node>，
 *   渲染后 SVG 含 data-retikz-id="panel-..." 供断言
 */
const makePanelComposite = (namespace: string): CompositeDefinition => {
  const schema = CompositeBaseSchema.extend({
    namespace: z.literal(namespace),
    type: z.literal('panel'),
    panelId: z.string(),
  });
  return defineComposite({
    schema,
    expand: (node) => ({ type: 'node', id: `panel-${node.panelId}`, position: [0, 0], text: node.panelId }),
  });
};

/**
 * 造一个「函数体一旦执行即抛」的可嵌入 fixture。
 * @description body throw 是护栏核心：组件被标记 isTier2Embeddable 且带可用 adapter，
 *   所以两条静态遍历链都应只读 adapter 静态贡献、绝不调用函数体；一旦被误调即抛、测试失败。
 */
const makeThrowingFixture = (
  options: { namespace?: string; displayName?: string } = {},
): EmbeddableFixture => {
  const { namespace = 'demo', displayName = 'ThrowingPanel' } = options;
  const adapter: EmbeddableTier2Adapter<FixtureProps> = {
    displayName,
    namespace,
    contribute: (props) => ({
      node: { namespace, type: 'panel', panelId: props.id },
      datasets: { [props.id]: props.data },
      makeComposites: () => [makePanelComposite(namespace)],
    }),
  };
  const Fixture: EmbeddableFixture = () => {
    throw new Error('embeddable body must never render');
  };
  Fixture.displayName = displayName;
  Fixture.isTier2Embeddable = true;
  Fixture.embeddableAdapter = adapter as EmbeddableTier2Adapter;
  return Fixture;
};

/**
 * 有状态宿主兄弟组件：持 useState + useEffect（hook），渲染普通 DOM 标记。
 * @description 与抛错可嵌入 fixture 并列挂在同一棵树里；其 hooks 在 SSR 渲染期间执行——
 *   若可嵌入函数体被静态遍历误调并触发自身 hook，将污染本宿主的 hook 顺序。label prop 模拟
 *   i18n 文案，bump prop 模拟一次 state 变更后的重渲染。
 */
const StatefulHost: FC<{ label: string; bump?: number }> = (props) => {
  const { label, bump = 0 } = props;
  // useState + useEffect 让宿主持有真实 hook 序列；bump 进 state 初值，模拟「上次 state 变更」后的渲染。
  const [count] = useState(() => bump);
  useEffect(() => {
    // 无副作用的订阅型 effect：只为占据一个宿主 hook 槽位，验证 hook 顺序不被可嵌入误调污染。
    return () => undefined;
  }, [label, bump]);
  return (
    <span data-host-label={label} data-host-count={count} data-host-bump={bump}>
      {label}
    </span>
  );
};

describe('可嵌入 Tier2 回归护栏：函数体绝不被静态遍历调用 / 渲染', () => {
  it('重渲染护栏：含抛错可嵌入 + 有状态宿主兄弟的 <Layout>，初次渲染与重渲染都不抛、composite 输出两次都在', () => {
    const Throwing = makeThrowingFixture();
    const tree = (label: string, bump: number) => (
      <Fragment>
        <StatefulHost label={label} bump={bump} />
        <Layout width={100} height={100}>
          <Throwing id="guard" data={{ v: 1 }} />
        </Layout>
      </Fragment>
    );

    let first = '';
    let second = '';
    expect(() => {
      first = renderToStaticMarkup(tree('initial', 0));
    }).not.toThrow();
    // 模拟一次 state 变更后的重渲染（bump 变化 + 同一子树）
    expect(() => {
      second = renderToStaticMarkup(tree('initial', 1));
    }).not.toThrow();

    expect(first).toContain('data-retikz-id="panel-guard"');
    expect(second).toContain('data-retikz-id="panel-guard"');
    expect(first).toContain('data-host-label="initial"');
    expect(second).toContain('data-host-label="initial"');
  });

  it('两条遍历链都 hook-free：buildIRWithContributions 与 collectHydrationHandlers 直接喂抛错可嵌入元素都不抛', () => {
    const Throwing = makeThrowingFixture();
    const element = <Throwing id="probe" data={{ v: 2 }} />;

    expect(() => buildIRWithContributions(element)).not.toThrow();
    expect(() => collectHydrationHandlers(element)).not.toThrow();

    // 再钉一遍：buildIRWithContributions 确实静态产出了该可嵌入的贡献（adapter 被读、函数体没被调）
    const { contributions } = buildIRWithContributions(element);
    expect(contributions).toHaveLength(1);
    expect(contributions[0]?.namespace).toBe('demo');
  });

  it('模拟语言切换：同一 <Layout> 子树以变更后的无关 prop（locale 文案）重渲染，仍不抛、输出稳定', () => {
    const Throwing = makeThrowingFixture();
    const tree = (label: string) => (
      <Fragment>
        <StatefulHost label={label} />
        <Layout width={100} height={100}>
          <Throwing id="guard" data={{ v: 3 }} />
        </Layout>
      </Fragment>
    );

    let zh = '';
    let en = '';
    expect(() => {
      zh = renderToStaticMarkup(tree('你好'));
    }).not.toThrow();
    expect(() => {
      en = renderToStaticMarkup(tree('hello'));
    }).not.toThrow();

    // 可嵌入展开输出与语言无关，保持稳定
    expect(zh).toContain('data-retikz-id="panel-guard"');
    expect(en).toContain('data-retikz-id="panel-guard"');
    expect(zh).toContain('data-host-label="你好"');
    expect(en).toContain('data-host-label="hello"');
  });
});
