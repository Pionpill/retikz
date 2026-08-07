import type { IRScope, IRTransformInput } from '@retikz/core';
import type { FC, ReactNode } from 'react';

import type { HydrationEventProps, ScopeStyleProps } from '../protocol';

import { TIKZ_SCOPE } from '../protocol';

/**
 * @description 级联样式子集（graphic state + 四通道 every-X）抽到共享 {@link ScopeStyleProps}，与 `<Layout>` 复用；
 *   本类型额外带容器 / 命名空间 / 局部变换 / 屏障 / 栈序 / 裁剪等 scope 专属字段
 */
export type ScopeProps = ScopeStyleProps &
  HydrationEventProps & {
    /** 仅覆盖已声明字段并由后代 Composite 继承的局部 Theme */
    theme?: IRScope['theme'];
    /**
     * 可选 scope 引用 id；设值后可把整个 scope 的包络当作引用目标
     * @description 外部 path / position 可用 `scope.id` / `scope.id.<anchor>` / `scope.id.<deg>` 引用该包络；
     *   这个外部句柄不受 `localNamespace` 影响
     */
    id?: string;
    /**
     * 是否创建本地命名空间；true 时子节点 id 不向父 frame 传播（外部不可见）
     * @description 子节点 id 只在本 scope 内可引用；外部无法引用这些子节点 id，但 `scope.id` 自己仍可从外层引用
     */
    localNamespace?: boolean;
    /**
     * 局部 transform 列表；数组顺序应用，与 SVG transform list 一致
     * @description 支持 translate / polar-translate / at-translate / offset-translate / between-translate / rotate / scale
     */
    transforms?: Array<IRTransformInput>;
    /**
     * Scope 最终锚点对齐定位
     * @description target 是父坐标系显式点或此前已完成的命名实体；selfAnchor 缺省为固有包络 center
     */
    placement?: IRScope['placement'];
    /** 继承屏障：切外层对应通道继承（true 全切 / 数组按 'node'|'path'|'label'|'arrow' 切） */
    resetStyle?: IRScope['resetStyle'];
    /** 显式栈序：作用于 scope 整体在父层的位置（不影响 scope 内部子元素相对栈序）；缺省 0 = 声明顺序 */
    zIndex?: IRScope['zIndex'];
    /** 裁剪区（rect / circle / ellipse / polygon / path / compound / custom，scope 局部坐标）；设值则裁剪 scope 内全部子元素 */
    clip?: IRScope['clip'];
    /** scope id 注册的 synthetic 包络形状（受控枚举 'rectangle' | 'circle'，非 Node shape 那种开放 shape 引用）；缺省为 'rectangle'（AABB） */
    boundingShape?: IRScope['boundingShape'];
    /** 用户自定义元数据；可在事件 / 水合上下文中读取，不参与布局，也不下传给子元素。须为 JSON 可序列化对象 */
    meta?: IRScope['meta'];
    /** scope 整体的时间轴动画；渲染端播放或降级为静态，不参与布局，也不下传给子元素 */
    animations?: IRScope['animations'];
    /** 可选 compile driver 自行解释的 runtime-only authoring 载荷，不进入 Core IR */
    authoring?: unknown;
    /** scope 子节点：嵌套 Node / Path / Coordinate / Scope */
    children?: ReactNode;
  };

/**
 * Scope 容器组件——TikZ `\begin{scope}[...]...\end{scope}` 同义
 * @description 给一组节点 / 路径提供局部样式、命名空间、变换、最终锚点定位、裁剪和引用包络
 */
export const Scope: FC<ScopeProps> = () => null;
Scope.displayName = TIKZ_SCOPE;
