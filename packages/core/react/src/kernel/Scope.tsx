import type { FC, ReactNode } from 'react';
import type { IRScope, IRTransform } from '@retikz/core';
import { TIKZ_SCOPE } from './_displayNames';
import type { HydrationEventProps } from './event-props';
import type { ScopeStyleProps } from './_fields';

/**
 * <Scope> 组件的 props
 * @description 级联样式子集（graphic state + 四通道 every-X）抽到共享 {@link ScopeStyleProps}，与 `<Layout>` 复用；
 *   本类型额外带容器 / 命名空间 / 局部变换 / 屏障 / 栈序 / 裁剪等 scope 专属字段
 */
export type ScopeProps = ScopeStyleProps & HydrationEventProps & {
  /**
   * 可选 scope 引用 id；设值则注册一个 synthetic rectangle bbox 节点到父 namespace frame
   * @description 该 bbox 节点供外部 path / position 把整个 scope 当矩形 referent 引用
   *   （`scope.id` / `scope.id.<anchor>` / `scope.id.<deg>` 走与普通 rectangle Node 一致的 anchor 取值）；
   *   始终注册在父 frame，不受 `localNamespace` 影响——它是 scope 对外的句柄
   */
  id?: string;
  /**
   * 是否创建本地命名空间；true 时子节点 id 不向父 frame 传播（外部不可见）
   * @description compile 进入本 scope 时 push 一个独立 namespace frame，子节点 id 只在本 frame 可见、
   *   出场即弹出；外部无法引用子节点 id（`scope.id` 句柄仍在父 frame 可见，不受影响）
   */
  localNamespace?: boolean;
  /**
   * 局部 transform 列表；数组顺序应用（与 Scene `GroupPrim.transforms` / SVG transform list 一致）
   * @description 支持 7 变体（translate / polar-translate / at-translate / offset-translate / between-translate / rotate / scale）；5 个 translate 变体由 compile 阶段下沉为 Cartesian translate
   */
  transforms?: Array<IRTransform>;
  /** 继承屏障：切外层对应通道继承（true 全切 / 数组按 'node'|'path'|'label'|'arrow' 切） */
  resetStyle?: IRScope['resetStyle'];
  /** 显式栈序：作用于 scope 整体在父层的位置（不影响 scope 内部子元素相对栈序）；缺省 0 = 声明顺序 */
  zIndex?: IRScope['zIndex'];
  /** 裁剪区（rect / circle / ellipse / polygon，scope 局部坐标）；设值则裁剪 scope 内全部子元素 */
  clip?: IRScope['clip'];
  /** scope id 注册的 synthetic 包络形状名（与 Node shape 同词表，如 'circle'）；缺省为 'rectangle'（AABB） */
  boundingShape?: string;
  /** provenance 元数据：原样透传进本 scope emit 的 GroupPrim，renderer 忽略、不参与布局、不下传子元素；典型由 Tier 2 lowering 注入（标记 series / layer 层）。须为 JSON 可序列化对象 */
  meta?: IRScope['meta'];
  /** 时间轴动画 tracks（作用于 scope group；raw track）：透传进 emit 的 GroupPrim，renderer 播放或降级到静态。不参与布局、不下传子元素 */
  animations?: IRScope['animations'];
  /** scope 子节点：嵌套 Node / Path / Coordinate / Scope */
  children?: ReactNode;
};

/**
 * Scope 容器组件——TikZ `\begin{scope}[...]...\end{scope}` 同义
 * @description IR 一等基元（不是 Sugar），emit 对应的 IRScope；compile 时下沉为 Scene `GroupPrim`；由 <TikZ> builder 在 children 扫描阶段读出 props 构造 IR
 */
export const Scope: FC<ScopeProps> = () => null;
Scope.displayName = TIKZ_SCOPE;
