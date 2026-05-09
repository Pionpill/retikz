import type { FC, ReactNode } from 'react';
import type {
  IRFont,
  IRNode,
  IRPosition,
  NodeTextAlign,
  PolarPosition,
} from '@retikz/core';
import { TIKZ_NODE } from './_displayNames';

/** <Node> 组件的 props */
export type NodeProps = {
  /** 节点 id；其他 Path/Draw 通过这个 id 引用本节点 */
  id?: string;
  /** 节点形状：rectangle（默认）/ circle / ellipse / diamond */
  shape?: IRNode['shape'];
  /** 节点中心位置；笛卡尔 [x, y] 或极坐标（编译时解析） */
  position: IRPosition | PolarPosition;
  /** 旋转角度（度数，与 TikZ 一致），绕节点中心；正值顺时针 */
  rotate?: number;
  /**
   * 文本内容（也可以用 children 写）；与 `text` 二选一，`text` 优先。
   *
   * children 多行写法：
   * - `<Node>{'Line 1\nLine 2'}</Node>`（字符串内嵌 `\n`）
   * - ``<Node>{`Line 1\nLine 2`}</Node>``（模板字面量）
   * - `<Node>{['Line 1', 'Line 2']}</Node>`（数组）
   */
  children?: ReactNode;
  /** 显式 text；单字符串 = 一行，数组 = 每元素一行；优先级高于 children */
  text?: string | Array<string>;
  /** 多行文本对齐：left / center（默认）/ right；只影响多行块内各行的水平对齐 */
  align?: NodeTextAlign;
  /** 行高（user units）；不填走 `font.size × 1.2` 默认 */
  lineHeight?: number;
  /** 字体规格：family / size / weight / style 全部可选；不填走渲染端默认值 */
  font?: IRFont;
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
