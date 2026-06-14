import { type FC } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { CompositeBaseSchema, type CompositeDefinition, defineComposite } from '@retikz/core';
import { type EmbeddableTier2Adapter, Node } from '../../src';
import { Layout } from '../../src/kernel/Layout';

/**
 * <Layout> 可嵌入 Tier2 聚合：按 namespace 合并 datasets、产 composite、喂 compile
 * @description 可嵌入子组件经 adapter 静态贡献 IR composite 节点 + datasets + makeComposites；
 *   Layout 按 namespace 合并 datasets（同 ref 异引用 fail-loud）、每组调一次 makeComposites、与显式 composites 拼接喂 compileToScene。
 */

/** 可嵌入 fixture 的 props 形状 */
type FixtureProps = { id: string; data: unknown };

/** 可嵌入 fixture 组件类型：函数组件 + 可嵌入静态标记 */
type EmbeddableFixture = FC<FixtureProps> & {
  isTier2Embeddable?: boolean;
  embeddableAdapter?: EmbeddableTier2Adapter;
};

/**
 * 为某 namespace 造一个 composite 定义：节点带 panelId 字段，展开成一个可识别的 Tier1 <Node>
 * @description schema extend CompositeBaseSchema，namespace / type 为 literal；expand 产出 id=`panel-${panelId}` 的 node，
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
 * 造一个 hook-free 可嵌入 fixture：贡献一个 namespace.panel composite 节点 + 一份 datasets，
 *   makeComposites 用 spy 包裹便于断言调用次数
 */
const makeFixture = (
  options: {
    namespace?: string;
    displayName?: string;
    datasets?: Record<string, unknown>;
    marked?: boolean;
  } = {},
): { Fixture: EmbeddableFixture; makeComposites: ReturnType<typeof vi.fn> } => {
  const { namespace = 'demo', displayName = 'DemoFixture', datasets, marked = true } = options;
  const makeComposites = vi.fn(() => [makePanelComposite(namespace)]);
  const adapter: EmbeddableTier2Adapter<FixtureProps> = {
    displayName,
    namespace,
    contribute: (props) => ({
      node: { namespace, type: 'panel', panelId: props.id },
      datasets: datasets ?? { [props.id]: props.data },
      makeComposites,
    }),
  };
  const Fixture: EmbeddableFixture = () => null;
  Fixture.displayName = displayName;
  if (marked) {
    Fixture.isTier2Embeddable = true;
    Fixture.embeddableAdapter = adapter as EmbeddableTier2Adapter;
  }
  return { Fixture, makeComposites };
};

describe('<Layout> 可嵌入 Tier2 聚合', () => {
  it('同 namespace 两个可嵌入子组件 → datasets 合并、makeComposites 只调一次（含 a + b）、两面板都渲染', () => {
    const dataA = { a: [1, 2] };
    const dataB = { b: [3, 4] };
    const sharedMake = vi.fn(() => [makePanelComposite('demo')]);
    const mkAdapter = (displayName: string, datasets: Record<string, unknown>): EmbeddableTier2Adapter<FixtureProps> => ({
      displayName,
      namespace: 'demo',
      contribute: (props) => ({
        node: { namespace: 'demo', type: 'panel', panelId: props.id },
        datasets,
        makeComposites: sharedMake,
      }),
    });
    const First: EmbeddableFixture = () => null;
    First.displayName = 'First';
    First.isTier2Embeddable = true;
    First.embeddableAdapter = mkAdapter('First', dataA) as EmbeddableTier2Adapter;
    const Second: EmbeddableFixture = () => null;
    Second.displayName = 'Second';
    Second.isTier2Embeddable = true;
    Second.embeddableAdapter = mkAdapter('Second', dataB) as EmbeddableTier2Adapter;

    const svg = renderToStaticMarkup(
      <Layout width={100} height={100}>
        <First id="one" data={null} />
        <Second id="two" data={null} />
      </Layout>,
    );

    expect(sharedMake).toHaveBeenCalledTimes(1);
    expect(sharedMake).toHaveBeenCalledWith(expect.objectContaining({ a: [1, 2], b: [3, 4] }));
    expect(svg).toContain('data-retikz-id="panel-one"');
    expect(svg).toContain('data-retikz-id="panel-two"');
  });

  it('不同 namespace 两个可嵌入子组件 → 每个 namespace 的 makeComposites 各调一次、两结果都生效', () => {
    const fixA = makeFixture({ namespace: 'alpha', displayName: 'Alpha' });
    const fixB = makeFixture({ namespace: 'beta', displayName: 'Beta' });

    const svg = renderToStaticMarkup(
      <Layout width={100} height={100}>
        <fixA.Fixture id="p" data={{ v: 1 }} />
        <fixB.Fixture id="q" data={{ v: 2 }} />
      </Layout>,
    );

    expect(fixA.makeComposites).toHaveBeenCalledTimes(1);
    expect(fixB.makeComposites).toHaveBeenCalledTimes(1);
    expect(svg).toContain('data-retikz-id="panel-p"');
    expect(svg).toContain('data-retikz-id="panel-q"');
  });

  it('显式 composites prop 与可嵌入贡献并存 → 用户 composite 定义与可嵌入 composite 都展开', () => {
    // demo fixture 自带 makeComposites（贡献 demo.panel 定义）
    const { Fixture } = makeFixture({ namespace: 'demo', displayName: 'DemoFixture' });
    // user fixture 只贡献 user.panel composite 节点，makeComposites 返回空——其定义由显式 composites prop 提供
    const userSchema = CompositeBaseSchema.extend({
      namespace: z.literal('user'),
      type: z.literal('panel'),
      panelId: z.string(),
    });
    const userComposite = defineComposite({
      schema: userSchema,
      expand: (node) => ({ type: 'node', id: `user-${node.panelId}`, position: [2, 2], text: node.panelId }),
    });
    const userAdapter: EmbeddableTier2Adapter<FixtureProps> = {
      displayName: 'UserFixture',
      namespace: 'user',
      contribute: (props) => ({
        node: { namespace: 'user', type: 'panel', panelId: props.id },
        datasets: {},
        makeComposites: () => [],
      }),
    };
    const UserFixture: EmbeddableFixture = () => null;
    UserFixture.displayName = 'UserFixture';
    UserFixture.isTier2Embeddable = true;
    UserFixture.embeddableAdapter = userAdapter as EmbeddableTier2Adapter;

    const svg = renderToStaticMarkup(
      <Layout width={100} height={100} composites={[userComposite]}>
        <Fixture id="emb" data={{ v: 1 }} />
        <UserFixture id="manual" data={null} />
      </Layout>,
    );

    expect(svg).toContain('data-retikz-id="panel-emb"');
    expect(svg).toContain('data-retikz-id="user-manual"');
  });

  it('同 namespace 同 reference 不同对象引用 → render 抛错（fail-loud）', () => {
    const fixA = makeFixture({ namespace: 'demo', displayName: 'A', datasets: { shared: { x: 1 } } });
    const fixB = makeFixture({ namespace: 'demo', displayName: 'B', datasets: { shared: { x: 1 } } });
    expect(() =>
      renderToStaticMarkup(
        <Layout width={100} height={100}>
          <fixA.Fixture id="a" data={null} />
          <fixB.Fixture id="b" data={null} />
        </Layout>,
      ),
    ).toThrow(/reference "shared"/);
  });

  it('同 namespace 同 reference 同对象引用 → 不抛、正常渲染', () => {
    const shared = { x: 1 };
    const fixA = makeFixture({ namespace: 'demo', displayName: 'A', datasets: { shared } });
    const fixB = makeFixture({ namespace: 'demo', displayName: 'B', datasets: { shared } });
    expect(() =>
      renderToStaticMarkup(
        <Layout width={100} height={100}>
          <fixA.Fixture id="a" data={null} />
          <fixB.Fixture id="b" data={null} />
        </Layout>,
      ),
    ).not.toThrow();
  });

  it('零可嵌入子组件（纯 Kernel）→ 输出与不带本特性时一致（kernel 节点照常渲染）', () => {
    const svg = renderToStaticMarkup(
      <Layout width={100} height={100}>
        <Node id="plain" position={[0, 0]} text="hi" />
      </Layout>,
    );
    expect(svg).toContain('data-retikz-id="plain"');
    expect(svg).toContain('<svg');
  });

  it('<Layout embeddables={[adapter]}> 注入未标记 fixture → 仍嵌入 + 聚合渲染', () => {
    const displayName = 'UnmarkedFixture';
    const makeComposites = vi.fn(() => [makePanelComposite('demo')]);
    const Plain: FC<FixtureProps> = () => null;
    Plain.displayName = displayName;
    const adapter: EmbeddableTier2Adapter<FixtureProps> = {
      displayName,
      namespace: 'demo',
      contribute: (props) => ({
        node: { namespace: 'demo', type: 'panel', panelId: props.id },
        datasets: { [props.id]: props.data },
        makeComposites,
      }),
    };

    const svg = renderToStaticMarkup(
      <Layout width={100} height={100} embeddables={[adapter as EmbeddableTier2Adapter]}>
        <Plain id="z" data={{ v: 9 }} />
      </Layout>,
    );

    expect(makeComposites).toHaveBeenCalledTimes(1);
    expect(svg).toContain('data-retikz-id="panel-z"');
  });
});
