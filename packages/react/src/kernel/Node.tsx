import type { FC, ReactNode } from 'react';
import type {
  IRAtPosition,
  IRFont,
  IRLineSpec,
  IRNode,
  IRNodeLabel,
  IROffsetPosition,
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
  /**
   * 节点中心位置
   * @description 四种形态：笛卡尔 `[x, y]` / 极坐标 `{ angle, radius, origin? }` / 相对定位 `{ direction, of, distance? }`（TikZ `[<direction>=<distance> of <id>]` 同义）/ 偏移定位 `{ of, offset }`（TikZ `calc` 同义，`of` 可为节点 id / 笛卡尔 / 极坐标）；非笛卡尔形态在编译时解析
   */
  position: IRPosition | PolarPosition | IRAtPosition | IROffsetPosition;
  /** 旋转角度（度数，与 TikZ 一致），绕节点中心；正值顺时针 */
  rotate?: number;
  /**
   * 文本内容（也可以用 children 写）；与 `text` 二选一，`text` 优先
   * @description 多行支持四种写法：字符串内嵌 `\n` / 模板字面量 / 字符串数组 / 混 `<Text>` 带样式行
   */
  children?: ReactNode;
  /**
   * 显式 text，优先级高于 children
   * @description `string` 单行 / `Array<string>` 多行无样式 / `Array<string | LineSpec>` 多行可对单行覆盖 fill / opacity / font
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
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** 描边色 */
  stroke?: IRNode['stroke'];
  /** 描边透明度 0~1（TikZ `draw opacity`） */
  drawOpacity?: number;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 描边虚线预设：等价于 dashArray="4 2"；与 `dotted` / `dashArray` 优先级：dashArray > dashed > dotted */
  dashed?: boolean;
  /** 描边点线预设：等价于 dashArray="1 2" */
  dotted?: boolean;
  /** 显式 SVG stroke-dasharray 值（如 "4 2"）；优先级最高 */
  dashArray?: string;
  /** 圆角半径（user units）；只对 `rectangle` shape 生效 */
  roundedCorners?: number;
  /** 最小 border 宽度（user units）；不足时撑开 bbox */
  minimumWidth?: number;
  /** 最小 border 高度（user units） */
  minimumHeight?: number;
  /** 对称最小尺寸别名——等价于同时设 `minimumWidth` 与 `minimumHeight`；轴特化字段优先 */
  minimumSize?: number;
  /** 均匀缩放因子；同时影响 bbox / 字号 / padding / margin / 路径附着点（与 TikZ scale 一致） */
  scale?: number;
  /** 横向缩放，优先于 `scale` */
  xScale?: number;
  /** 纵向缩放，优先于 `scale` */
  yScale?: number;
  /** 文字颜色（块级默认；行级 LineSpec.fill 可覆盖）；不填走 `currentColor` */
  textColor?: string;
  /** 整节点透明度 0~1（同时作用于 shape 与 text） */
  opacity?: number;
  /**
   * 节点附属标签——TikZ `[label=above:foo]` 同义
   * @description 单对象或数组；每条 label 接 `text` / `position?` / `distance?` / 样式继承；`position` 接 8 方向枚举或数字角度（`label=30:foo` 等价 `position: 30`），缺省 'above'，distance 缺省 4
   */
  label?: IRNodeLabel | Array<IRNodeLabel>;
};

/**
 * Node 是 DSL 标记组件——本身不渲染任何 React 元素
 * @description 由 <Tikz> 在 children 扫描阶段读出 props 构造 IR，再由 compileToScene + renderPrim 产出最终 SVG
 */
export const Node: FC<NodeProps> = () => null;
Node.displayName = TIKZ_NODE;
