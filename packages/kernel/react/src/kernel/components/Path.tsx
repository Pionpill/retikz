import type { IRPath, PathThicknessValue, WayDSL } from '@retikz/core';
import type { InputPath } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import type { HydrationEventProps } from '../protocol';

import { TIKZ_PATH } from '../protocol';

export type PathProps = HydrationEventProps & {
  /** 实例视觉覆盖，逐字段覆盖继承默认值 */
  style?: InputPath['style'];
  /** 可选 compile driver 自行解释的 runtime-only authoring 载荷，不进入 Core IR */
  authoring?: unknown;
  kind?: IRPath['kind'];
  kindOptions?: IRPath['kindOptions'];
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
  roundedCorners?: IRPath['roundedCorners'];
  /** 语义 stroke 档位糖（TikZ `ultra thin` … `ultra thick`）；构造 IR 时解析为 `strokeWidth`，显式 `strokeWidth` 始终优先 */
  thickness?: PathThicknessValue;
  /**
   * 路径级箭头方向
   * @description `'->'` 终点 / `'<-'` 起点 / `'<->'` 两端；省略或 `'none'` 无箭头
   */
  arrow?: InputPath['arrow'];
  /**
   * 箭头详细配置
   * @description 顶层默认 + 可选 `start` / `end` 子对象逐字段 merge override。空心 shape
   *   （open / openStealth / openDiamond / openCircle）上 `fill` silent no-op
   */
  arrowDetail?: InputPath['arrowDetail'];
  /**
   * 箭头端点放置配置
   * @description `overlap` 为实际端点共享值，`start` / `end` 可逐端覆盖；比例从默认位置插值到最终视觉后缘与逻辑端点对齐的位置
   */
  arrowPlacement?: InputPath['arrowPlacement'];
  /** 显式栈序：大者在上；缺省 0 = 声明顺序；同值稳定保序；只在同层子节点间生效 */
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
   * 沿路径在归一化位置放标记（首批仅箭头）
   * @description 每个 `{ pos, mark }`：`pos∈[0,1]`，`mark.kind:'arrow'` + 视觉子集（shape 为已注册箭头名，方向随路径切线）
   */
  marks?: IRPath['marks'];
  /** TikZ 风格路径走向简写，由 Vanilla 统一解析为步骤 */
  way?: WayDSL;
  /** 应当全部是 <Step /> */
  children?: ReactNode;
};

/**
 * Path 用一组 `<Step>` 声明路径
 * @description 本组件自身不渲染 DOM；最终路径由 `<Layout>` 根据 step 序列、样式、箭头和标记输出
 */
export const Path: FC<PathProps> = () => null;
Path.displayName = TIKZ_PATH;
