import type { FC, ReactNode } from 'react';
import type { IRPath } from '@retikz/core';
import { TIKZ_PATH } from './_displayNames';

/** <Path> 组件的 props */
export type PathProps = {
  /** 描边色，省略时用 currentColor */
  stroke?: IRPath['stroke'];
  /** 描边宽度，省略时为 1 */
  strokeWidth?: IRPath['strokeWidth'];
  /** SVG stroke-dasharray 模式（如 "4 2"） */
  strokeDasharray?: IRPath['strokeDasharray'];
  /**
   * 路径级箭头方向。`'->'` = 终点；`'<-'` = 起点；`'<->'` = 两端；
   * 省略或 `'none'` = 无箭头。
   */
  arrow?: IRPath['arrow'];
  /**
   * 箭头形状。默认 `'normal'`（实心三角）。其他：`'open'` 空心三角、
   * `'stealth'` 倒钩、`'diamond'` 菱形、`'circle'` 圆点。
   */
  arrowShape?: IRPath['arrowShape'];
  /** 闭合区域填充色，CSS 颜色字符串；省略 = 不填充（仅描边）。配合 cycle step 画填充形状 */
  fill?: IRPath['fill'];
  /** SVG fill-rule：`'nonzero'`（默认）/ `'evenodd'`（环形 / 孔洞） */
  fillRule?: IRPath['fillRule'];
  /** 应当全部是 <Step /> */
  children: ReactNode;
};

/**
 * Path 容器——本身不渲染。children 扫描阶段读出其中的 <Step /> 构造 IRPath。
 */
export const Path: FC<PathProps> = () => null;
Path.displayName = TIKZ_PATH;
