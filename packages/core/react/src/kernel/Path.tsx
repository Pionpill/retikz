import type { FC, ReactNode } from 'react';
import type { IRPath } from '@retikz/core';
import { TIKZ_PATH } from './_displayNames';
import type { HydrationEventProps } from './eventProps';

/** <Path> 组件的 props */
export type PathProps = HydrationEventProps & {
  /** 路径 id；其他 path / position 通过这个 id 引用本路径，也作为水合挂点供事件 handler 绑定 */
  id?: IRPath['id'];
  /** 主色（TikZ `color=`）；stroke / 箭头 / step label 未单设则随它（跟主色不跟 stroke） */
  color?: IRPath['color'];
  /** 描边色，省略时用 currentColor */
  stroke?: IRPath['stroke'];
  /** 描边宽度，省略时为 1 */
  strokeWidth?: IRPath['strokeWidth'];
  /** 描边 dash pattern（如 [4, 2]） */
  dashPattern?: IRPath['dashPattern'];
  /** 端点形状（TikZ `line cap`）：`'butt'`（默认 / 直角）/ `'round'`（半圆）/ `'square'`（方头外扩半 stroke） */
  lineCap?: IRPath['lineCap'];
  /** 拐点形状（TikZ `line join`）：`'miter'`（默认 / 尖角）/ `'round'`（圆角）/ `'bevel'`（切角） */
  lineJoin?: IRPath['lineJoin'];
  /** 语义 stroke 档位（TikZ `ultra thin` … `ultra thick`）；显式 `strokeWidth` 始终优先 */
  thickness?: IRPath['thickness'];
  /**
   * 路径级箭头方向
   * @description `'->'` 终点 / `'<-'` 起点 / `'<->'` 两端；省略或 `'none'` 无箭头
   */
  arrow?: IRPath['arrow'];
  /**
   * 箭头详细配置
   * @description 顶层默认 + 可选 `start` / `end` 子对象逐字段 merge override；视觉字段含 `shape` / `scale` / `length` / `width` / `color` / `fill` / `opacity` / `lineWidth`。空心 shape（open / openDiamond / openCircle）上 `fill` silent no-op
   */
  arrowDetail?: IRPath['arrowDetail'];
  /** 闭合区域填充色，CSS 颜色字符串；省略 = 不填充（仅描边）。配合 cycle step 画填充形状 */
  fill?: IRPath['fill'];
  /** 填充规则：`'nonzero'`（默认）/ `'evenodd'`（环形 / 孔洞） */
  fillRule?: IRPath['fillRule'];
  /** 整 path 透明度 0~1；同时作用于 stroke 与 fill */
  opacity?: IRPath['opacity'];
  /** 仅 fill 透明度 0~1 */
  fillOpacity?: IRPath['fillOpacity'];
  /** 仅 stroke 透明度 0~1（TikZ `draw opacity`） */
  drawOpacity?: IRPath['drawOpacity'];
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
  /** 应当全部是 <Step /> */
  children: ReactNode;
};

/**
 * Path 容器——本身不渲染。children 扫描阶段读出其中的 <Step /> 构造 IRPath。
 */
export const Path: FC<PathProps> = () => null;
Path.displayName = TIKZ_PATH;
