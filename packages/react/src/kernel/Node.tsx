import type { FC, ReactNode } from 'react';
import type { IRNode, IRPosition, PolarPosition } from '@retikz/core';
import { TIKZ_NODE } from './_displayNames';

/** <Node> 组件的 props */
export type NodeProps = {
  /** 节点 id；其他 Path/Draw 通过这个 id 引用本节点 */
  id?: string;
  /** 节点中心位置；笛卡尔 [x, y] 或极坐标（编译时解析） */
  position: IRPosition | PolarPosition;
  /** 旋转角度（度数，与 TikZ 一致），绕节点中心；正值顺时针 */
  rotate?: number;
  /** 文本内容；也支持 children 形式（仅字符串） */
  children?: ReactNode;
  /** 显式 text，优先级高于 children */
  text?: string;
  /** 字号；不填用默认值 */
  fontSize?: number;
  /** 内边距：内容到 border 的距离 */
  padding?: number;
  /** 外边距：border 到 path 附着点的距离；不影响 border 位置；必须 ≥ 0 */
  margin?: number;
  /** 背景色 */
  fill?: IRNode['fill'];
  /** 描边色 */
  stroke?: IRNode['stroke'];
  /** 描边宽度 */
  strokeWidth?: number;
};

/**
 * Node 是 DSL 标记组件——本身不渲染任何 React 元素。
 * 由 <Tikz> 在 children 扫描阶段读出 props 构造 IR，
 * 再由 compileToScene + renderPrim 产出最终 SVG。
 */
export const Node: FC<NodeProps> = () => null;
Node.displayName = TIKZ_NODE;
