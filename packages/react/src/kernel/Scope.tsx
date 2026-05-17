import type { FC, ReactNode } from 'react';
import type { IRTransform } from '@retikz/core';
import { TIKZ_SCOPE } from './_displayNames';

/** <Scope> 组件的 props */
export type ScopeProps = {
  /**
   * 可选 scope 引用 id；设值则注册一个 synthetic bbox 节点到父 namespace frame
   * @description 设值则注册一个 synthetic bbox 节点到父 namespace frame，供外部 path / position 引用 scope 整体（注册行为尚未启用）
   */
  id?: string;
  /**
   * 是否创建本地命名空间；true 时子节点 id 不向父 frame 传播（外部不可见）
   * @description 命名空间隔离行为尚未启用，字段提前暴露以保持 IR ↔ JSX 双向稳定
   */
  localNamespace?: boolean;
  /**
   * 局部 transform 列表；数组顺序应用（与 Scene `GroupPrim.transforms` / SVG transform list 一致）
   * @description 支持 6 变体（translate / polar-translate / at-translate / offset-translate / rotate / scale）；4 个 translate 变体由 compile 阶段下沉为 Cartesian translate
   */
  transforms?: Array<IRTransform>;
  /** scope 子节点：嵌套 Node / Path / Coordinate / Scope */
  children?: ReactNode;
};

/**
 * Scope 容器组件——TikZ `\begin{scope}[...]...\end{scope}` 同义
 * @description IR 一等基元（不是 Sugar），emit 对应的 IRScope；compile 时下沉为 Scene `GroupPrim`；由 <TikZ> builder 在 children 扫描阶段读出 props 构造 IR
 */
export const Scope: FC<ScopeProps> = () => null;
Scope.displayName = TIKZ_SCOPE;
