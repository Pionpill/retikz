import type { IRPath, WayDSL } from '@retikz/core';
import type { InputPath } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import type { HydrationEventProps } from '../protocol';
import { TIKZ_PATH } from '../protocol';

/** 用步骤或路径简写声明路径，并设置样式、箭头与交互 */
export type PathProps = HydrationEventProps & {
  /** 实例视觉覆盖，逐字段覆盖继承默认值 */
  style?: InputPath['style'];
  /** 可选 compile driver 自行解释的 runtime-only authoring 载荷，不进入 Core IR */
  authoring?: unknown;
  /**
   * 路径定义，省略时使用内置 stroke；自定义种类通过 Layout.extensions.paths 注册
   * @default 'stroke'
   */
  kind?: IRPath['kind'];
  /** 所选路径定义的 JSON 参数；内置 stroke 不接受此字段 */
  kindOptions?: IRPath['kindOptions'];
  /** 附着于整条路径的一个或多个几何标签 */
  label?: IRPath['label'];
  /** 路径 id；其他 path / position 通过这个 id 引用本路径，也作为水合挂点供事件 handler 绑定 */
  id?: IRPath['id'];
  /** 用户自定义元数据；可在事件 / 水合上下文中读取，不参与布局。须为 JSON 可序列化对象 */
  meta?: IRPath['meta'];
  /** 路径级时间轴动画；渲染端播放或降级为静态，不参与布局 */
  animations?: IRPath['animations'];
  /**
   * 折线拐角几何圆角半径（TikZ `rounded corners=`）
   * @description 对每个 line↔line 接缝插切圆弧、改路径几何（区别于 lineJoin 仅描边）；curve / arc / bezier / fold 接缝保持尖；按相邻段长 clamp；省略 = 尖角
   */
  cornerRadius?: IRPath['cornerRadius'];
  /**
   * 路径起点与终点的箭头配置
   * @description 支持方向简写 ->、<-、<->，或用 start 与 end 分别配置端点箭头
   */
  arrow?: InputPath['arrow'];
  /**
   * 显式栈序：大者在上；缺省 0 = 声明顺序；同值稳定保序；只在同层子节点间生效
   * @default 0
   */
  zIndex?: IRPath['zIndex'];
  /**
   * 整条 path 旋转（度，绕包围盒中心，正向 = 屏幕 y-down 视觉顺时针）
   * @description 等价把 path 包一层绕其包围盒中心旋转的 Scope；端点先在当前 scope resolve 再整体旋转
   */
  rotate?: IRPath['rotate'];
  /**
   * 整条 path 缩放（绕包围盒中心）：number 等比，或 `{ x, y }` 非等比
   */
  scale?: IRPath['scale'];
  /**
   * 沿路径按弧长比例放置图元标记
   * @description 复用箭头外观或注册标记定义，任何位置均不截断路径
   */
  marks?: IRPath['marks'];
  /** TikZ 风格路径走向简写，由 Vanilla 统一解析为步骤 */
  way?: WayDSL;
  /** 应当全部是 `<Step />` */
  children?: ReactNode;
};

/**
 * Path 用一组 `<Step>` 声明路径
 * @description 本组件自身不渲染 DOM；最终路径由 `<Layout>` 根据 step 序列、样式、箭头和标记输出
 */
export const Path: FC<PathProps> = () => null;
Path.displayName = TIKZ_PATH;
