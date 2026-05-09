import type { FC, ReactNode } from 'react';
import type {
  IRFont,
  IRLineSpec,
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
   * - `<Node><Text fill="red">L1</Text>L2</Node>`（混 `<Text>` 带样式行）
   */
  children?: ReactNode;
  /**
   * 显式 text，优先级高于 children：
   * - `string` — 单行
   * - `Array<string>` — 多行无样式覆盖
   * - `Array<string | LineSpec>` — 多行，可对单行覆盖 fill / opacity / font
   */
  text?: string | Array<IRLineSpec>;
  /** 多行文本对齐：left / center（默认）/ right；只影响多行块内各行的水平对齐 */
  align?: NodeTextAlign;
  /** 行高（user units）；不填走 `font.size × 1.2` 默认 */
  lineHeight?: number;
  /** 字体规格：family / size / weight / style 全部可选；不填走渲染端默认值 */
  font?: IRFont;
  /** 横向内边距（text → 左右 border）；不填走 `padding` 兜底，再走默认 */
  innerXSep?: number;
  /** 纵向内边距（text → 上下 border）；不填走 `padding` 兜底，再走默认 */
  innerYSep?: number;
  /** 外边距（border → path 附着点）；不影响 border 位置；不填走 `margin` 兜底 */
  outerSep?: number;
  /** 内边距对称别名——等价于同时设 `innerXSep` 和 `innerYSep`；轴特化字段优先 */
  padding?: number;
  /** 外边距对称别名——等价于 `outerSep`；轴特化字段优先 */
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
