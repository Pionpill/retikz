import { type FC, createElement } from 'react';
import { describe, expect, it } from 'vitest';
import type { EmbeddableTier2Adapter } from '../../src';
import { Node } from '../../src/kernel/Node';
import { Scope } from '../../src/kernel/Scope';
import { buildIR, buildIRWithContributions } from '../../src/kernel/builder';

/** 可嵌入 fixture 的 props 形状 */
type FixtureProps = { id: string; data: unknown };

/** 可嵌入 fixture 组件类型：函数组件 + 可嵌入静态标记 */
type EmbeddableFixture = FC<FixtureProps> & {
  isTier2Embeddable?: boolean;
  embeddableAdapter?: EmbeddableTier2Adapter;
};

/**
 * 构造一个 hook-free 的可嵌入 fixture
 * @description fixture body 被调用时翻转闭包 flag（应保持 false——可嵌入路径不调用组件本身）；
 *   adapter.contribute 据 props 产出 IR 节点 + datasets，供测试断言
 */
const makeFixture = (
  options: { marked?: boolean; withAdapter?: boolean } = {},
) => {
  const { marked = true, withAdapter = true } = options;
  const state = { bodyCalled: false };
  const displayName = 'DemoFixture';
  const adapter: EmbeddableTier2Adapter<FixtureProps> = {
    displayName,
    namespace: 'demo',
    contribute: (props) => ({
      node: { type: 'node', id: props.id, position: [0, 0] },
      datasets: { [props.id]: props.data },
      makeComposites: () => [],
    }),
  };
  const Fixture: EmbeddableFixture = () => {
    state.bodyCalled = true;
    return null;
  };
  Fixture.displayName = displayName;
  if (marked) Fixture.isTier2Embeddable = true;
  if (withAdapter) Fixture.embeddableAdapter = adapter as EmbeddableTier2Adapter;
  return { Fixture, adapter, state };
};

describe('buildIRWithContributions', () => {
  it('单个可嵌入子组件 → 贡献节点入 IR、记录入 contributions、fixture body 不被调用', () => {
    const { Fixture, state } = makeFixture();
    const result = buildIRWithContributions(<Fixture id="a" data={{ value: 1 }} />);
    expect(result.ir.children).toEqual([
      expect.objectContaining({ type: 'node', id: 'a' }),
    ]);
    expect(result.contributions).toHaveLength(1);
    expect(result.contributions[0]).toMatchObject({ namespace: 'demo' });
    expect(result.contributions[0].datasets).toHaveProperty('a');
    expect(state.bodyCalled).toBe(false);
  });

  it('嵌套在 <Scope> 内的可嵌入子组件 → 贡献节点入该 scope.children，记录仍平铺进 contributions', () => {
    const { Fixture, state } = makeFixture();
    const result = buildIRWithContributions(
      <Scope>
        <Fixture id="b" data={{ value: 2 }} />
      </Scope>,
    );
    const scope = result.ir.children[0];
    expect(scope.type).toBe('scope');
    if (scope.type !== 'scope') throw new Error('expected scope');
    expect(scope.children).toEqual([
      expect.objectContaining({ type: 'node', id: 'b' }),
    ]);
    expect(result.contributions).toHaveLength(1);
    expect(result.contributions[0]).toMatchObject({ namespace: 'demo' });
    expect(state.bodyCalled).toBe(false);
  });

  it('标记 isTier2Embeddable 但缺 embeddableAdapter → fail-loud throw', () => {
    const { Fixture } = makeFixture({ marked: true, withAdapter: false });
    expect(() =>
      buildIRWithContributions(<Fixture id="c" data={null} />),
    ).toThrow(/embeddableAdapter/);
  });

  it('普通 Sugar 函数组件（返回 <Node>）仍正常展开、不记录贡献（回归）', () => {
    const Sugar: FC<{ id: string }> = (props) =>
      createElement(Node, { id: props.id, position: [3, 4] });
    Sugar.displayName = 'Sugar';
    const result = buildIRWithContributions(<Sugar id="s" />);
    expect(result.ir.children).toEqual([
      expect.objectContaining({ type: 'node', id: 's', position: [3, 4] }),
    ]);
    expect(result.contributions).toHaveLength(0);
  });

  it('显式 embeddables 列表可解析未标记的普通函数（displayName 匹配）→ 贡献', () => {
    const displayName = 'UnmarkedFixture';
    const Plain: FC<FixtureProps> = () => null;
    Plain.displayName = displayName;
    const adapter: EmbeddableTier2Adapter<FixtureProps> = {
      displayName,
      namespace: 'demo',
      contribute: (props) => ({
        node: { type: 'node', id: props.id, position: [0, 0] },
        datasets: { [props.id]: props.data },
        makeComposites: () => [],
      }),
    };
    const result = buildIRWithContributions(
      <Plain id="d" data={{ value: 4 }} />,
      [adapter as EmbeddableTier2Adapter],
    );
    expect(result.ir.children).toEqual([
      expect.objectContaining({ type: 'node', id: 'd' }),
    ]);
    expect(result.contributions).toHaveLength(1);
    expect(result.contributions[0]).toMatchObject({ namespace: 'demo' });
  });
});

describe('buildIR（公开路径）', () => {
  it('可嵌入子组件经公开 buildIR 仍嵌入贡献节点（丢弃 contributions）', () => {
    const { Fixture } = makeFixture();
    const ir = buildIR(<Fixture id="a" data={{ value: 1 }} />);
    expect(ir.type).toBe('scene');
    expect(ir.children).toEqual([
      expect.objectContaining({ type: 'node', id: 'a' }),
    ]);
  });
});
