import { coordinate } from './coordinate';
import { draw } from './draw';
import { node } from './node';
import type { Child, ScopeConfig } from './types';

/**
 * scope 的 fluent 收集器
 * @description `scope(config, build)` 把它交给回调；`.node/.draw/.coordinate/.scope` 把子节点推进内部数组、
 *   链式返回 this。与 hyperscript 数组形态产同一份 children。
 */
export type ScopeBuilder = {
  node: (...args: Parameters<typeof node>) => ScopeBuilder;
  draw: (...args: Parameters<typeof draw>) => ScopeBuilder;
  coordinate: (...args: Parameters<typeof coordinate>) => ScopeBuilder;
  scope: (config: ScopeConfig, build: (s: ScopeBuilder) => void) => ScopeBuilder;
};

const createScopeBuilder = (sink: Array<Child>): ScopeBuilder => {
  const self: ScopeBuilder = {
    node(...args) {
      sink.push(node(...args));
      return self;
    },
    draw(...args) {
      sink.push(draw(...args));
      return self;
    },
    coordinate(...args) {
      sink.push(coordinate(...args));
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
 *   （hyperscript）或回调（fluent，经 ScopeBuilder 收集），单签名联合参数同时接受。
 */
export const scope = (config: ScopeConfig, arg: Array<Child> | ((s: ScopeBuilder) => void)): Child => {
  let children: Array<Child>;
  if (typeof arg === 'function') {
    children = [];
    arg(createScopeBuilder(children));
  } else {
    children = arg;
  }
  return { type: 'scope', ...config, children };
};
