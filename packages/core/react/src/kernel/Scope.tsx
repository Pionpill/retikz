import type { FC, ReactNode } from 'react';
import type { IRScope, IRTransform } from '@retikz/core';
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
  /** 级联主色（TikZ scope `color=`）；内部元素 stroke / fill / 文字未单设则随它，并级联到边 label / 箭头 */
  color?: IRScope['color'];
  /** 级联默认描边色（覆盖主色的 stroke 通道） */
  stroke?: IRScope['stroke'];
  /** 级联默认填充色 */
  fill?: IRScope['fill'];
  /** 级联默认描边宽度（user units） */
  strokeWidth?: IRScope['strokeWidth'];
  /** 级联默认整体透明度 0~1（嵌套替换、不复合，与 TikZ 默认一致） */
  opacity?: IRScope['opacity'];
  /** 级联默认填充透明度 0~1 */
  fillOpacity?: IRScope['fillOpacity'];
  /** 级联默认描边透明度 0~1（TikZ `draw opacity`） */
  drawOpacity?: IRScope['drawOpacity'];
  /** every node 默认样式（TikZ `every node`），扁平独立通道 */
  nodeDefault?: IRScope['nodeDefault'];
  /** every path 默认样式（TikZ `every path`）；箭头走 arrowDefault 通道 */
  pathDefault?: IRScope['pathDefault'];
  /** every label 默认样式（node label + step label 共享） */
  labelDefault?: IRScope['labelDefault'];
  /** every arrow 默认样式（TikZ `every arrow`） */
  arrowDefault?: IRScope['arrowDefault'];
  /** 继承屏障：切外层对应通道继承（true 全切 / 数组按 'node'|'path'|'label'|'arrow' 切） */
  resetStyle?: IRScope['resetStyle'];
  /** 显式栈序：作用于 scope 整体在父层的位置（不影响 scope 内部子元素相对栈序）；缺省 0 = 声明顺序 */
  zIndex?: IRScope['zIndex'];
  /** 裁剪区（rect / circle / ellipse / polygon，scope 局部坐标）；设值则裁剪 scope 内全部子元素 */
  clip?: IRScope['clip'];
  /** scope 子节点：嵌套 Node / Path / Coordinate / Scope */
  children?: ReactNode;
};

/**
 * Scope 容器组件——TikZ `\begin{scope}[...]...\end{scope}` 同义
 * @description IR 一等基元（不是 Sugar），emit 对应的 IRScope；compile 时下沉为 Scene `GroupPrim`；由 <TikZ> builder 在 children 扫描阶段读出 props 构造 IR
 */
export const Scope: FC<ScopeProps> = () => null;
Scope.displayName = TIKZ_SCOPE;
