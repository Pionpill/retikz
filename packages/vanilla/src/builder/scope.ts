import { coordinate } from './coordinate';
import { draw } from './draw';
import { node } from './node';
import type { Child, CoordinateConfig, DrawConfig, NodeConfig, ScopeConfig, Way } from './types';

/**
 * scope 的 fluent 收集器
 * @description `scope(config, build)` 把它交给回调；`.node/.draw/.coordinate/.scope` 把子节点推进内部数组、
 *   链式返回 this。与 hyperscript 数组形态产同一份 children。
 */
export type ScopeBuilder = {
  node: (...args: Parameters<typeof node>) => ScopeBuilder;
  draw: (way: Way, config?: DrawConfig) => ScopeBuilder;
  coordinate: (id: string, config: CoordinateConfig) => ScopeBuilder;
  scope: (config: ScopeConfig, build: (s: ScopeBuilder) => void) => ScopeBuilder;
};

const createScopeBuilder = (sink: Child[]): ScopeBuilder => {
  const self: ScopeBuilder = {
    node(...args: [NodeConfig?] | [string, NodeConfig?]) {
      sink.push(node(...(args as Parameters<typeof node>)));
      return self;
    },
    draw(way, config) {
      sink.push(draw(way, config));
      return self;
    },
    coordinate(id, config) {
      sink.push(coordinate(id, config));
      return self;
    },
    scope(config, build) {
      sink.push(scope(config, build));
      return self;
    },
  };
  return self;
};

/**
 * 构造一个 scope IR 子节点（分组容器 + 样式默认 + transforms）
 * @description `config` 与 core `IRScope` / React `<Scope>` 顶层逐字一致——只透传 `transforms`（IRTransform[]，
 *   合并顺序 = 数组顺序，首元素最内层）+ 样式默认，**不自造 xshift/yshift 糖**。children 两形态：数组
 *   （hyperscript）或回调（fluent，经 ScopeBuilder 收集）。
 */
export function scope(config: ScopeConfig, children: Child[]): Child;
export function scope(config: ScopeConfig, build: (s: ScopeBuilder) => void): Child;
export function scope(config: ScopeConfig, arg: Child[] | ((s: ScopeBuilder) => void)): Child {
  let children: Child[];
  if (typeof arg === 'function') {
    children = [];
    arg(createScopeBuilder(children));
  } else {
    children = arg;
  }
  return { type: 'scope', ...config, children };
}
