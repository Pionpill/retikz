import type {
  IRAnchorPosition,
  IRAtPosition,
  IRAxisScale,
  IRBetweenPosition,
  IRBoundary,
  IRBoxSize,
  IRBoxSpacing,
  IRFont,
  IRLine,
  IRNode,
  IROffsetPosition,
  IRPosition,
  NodeTextAlignValue,
  PolarPosition,
} from '@retikz/core';
import type { InputAtPosition, InputNodeLabel } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import type { HydrationEventProps } from '../protocol';

import { TIKZ_NODE } from '../protocol';

export type NodeProps = HydrationEventProps & {
  /** 节点 id；其他 Path/Draw 通过这个 id 引用本节点 */
  id?: string;
  /** 节点形状：rectangle（默认）/ circle / ellipse / diamond */
  shape?: IRNode['shape'];
  /** 连接面：边与本节点相交时使用的边界形状（TikZ `connect as`）；默认 'shape'（沿用视觉形状）；'circle' = 真圆；其它已注册 shape 名或 `{ type, params }` = 借用该 shape 边界 */
  boundary?: IRBoundary;
  /** 用户自定义元数据；可在事件 / 水合上下文中读取，不参与布局。须为 JSON 可序列化对象 */
  meta?: IRNode['meta'];
  /** 元素级时间轴动画；每条 track 描述一个可动画属性，渲染端播放或降级为静态，不参与布局 */
  animations?: IRNode['animations'];
  /**
   * 节点中心位置
   * @description 六种形态：笛卡尔 `[x, y]` / 极坐标 `{ angle, radius, origin? }` / 相对定位 `{ direction, of, distance? }` / 偏移定位 `{ of, offset }` / 比例 partway `{ between: [A, B], fraction }` / 锚点对齐 `{ kind: 'anchor', target, selfAnchor? }`。锚点对齐会先完成当前 Node 的文本、shape、padding、margin、scale、rotate 布局，再整体平移；双方 anchor 缺省为 center
   */
  position:
    | IRPosition
    | PolarPosition
    | IRAtPosition
    | InputAtPosition
    | IROffsetPosition
    | IRBetweenPosition
    | IRAnchorPosition;
  /** 旋转角度（度数，与 TikZ 一致），绕节点中心；正值顺时针 */
  rotate?: number;
  /**
   * children 内容：文本
   * @description 与 `text` 二选一、`text` 优先；支持字符串内嵌 `\n` / 模板字面量 / 字符串数组 / 混 `<Text>` 带样式行。
   *   字符串里可写行内公式 `$...$`（inline）/ `$$...$$`（display），编译期在注入 `<Layout lowerTex>` 时解析；未注入则字面渲染
   */
  children?: ReactNode;
  /**
   * 显式 text，优先级高于 children
   * @description `string` 单行（可含 `$...$` 公式）/ `Array<string | IRLine>` 多行可对单行覆盖 fill / opacity / font，
   *   或行内混排 `{ runs: [{ text }, { tex }] }`（每 run 可单独着色）
   */
  text?: string | Array<IRLine>;
  /** 多行文本对齐：left / center（默认）/ right；只影响多行块内各行的水平对齐 */
  align?: NodeTextAlignValue;
  /** 行高（user units）；不填走 `font.size × 1.2` 默认 */
  lineHeight?: number;
  /** 折行阈值（user units）：超过才折行、短文本盒收缩（非固定段落宽）；西文按词、CJK 按字。不填 = 不自动折行 */
  maxTextWidth?: number;
  /** 字体规格：family / size / weight / style 全部可选；不填走渲染端默认值 */
  font?: IRFont;
  /** 内边距；数字作用于四边，对象按 left/right/top/bottom > x/y > default 解析 */
  padding?: number | IRBoxSpacing;
  /** 外边距；数字作用于四边，对象按 left/right/top/bottom > x/y > default 解析 */
  margin?: number | IRBoxSpacing;
  /** 主色（TikZ `color=`）；stroke / fill / textColor 未单设则随它，并级联到内部文字与边 label */
  color?: IRNode['color'];
  /** 背景色 */
  fill?: IRNode['fill'];
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** 描边色 */
  stroke?: IRNode['stroke'];
  /** 描边透明度 0~1（TikZ `stroke opacity`） */
  strokeOpacity?: number;
  /** 描边宽度 */
  strokeWidth?: number;
  /** 描边虚线预设：等价于 dashPattern={[4, 2]}；与 `dotted` / `dashPattern` 优先级：dashPattern > dashed > dotted */
  dashed?: boolean;
  /** 描边点线预设：等价于 dashPattern={[1, 2]} */
  dotted?: boolean;
  /** 显式 dash pattern（如 [4, 2]）；优先级最高 */
  dashPattern?: IRNode['dashPattern'];
  /** 描边 dash offset */
  dashOffset?: IRNode['dashOffset'];
  /** 圆角半径（user units）；只对 `rectangle` shape 生效。建议用形状 params 形式 `shape={{ type: 'rectangle', params: { cornerRadius } }}` */
  cornerRadius?: number;
  /** 最小 border 宽度（user units）；不足时撑开 bbox */
  /** 最小 border 尺寸；数字作用于宽高，对象按 width/height > default 解析 */
  minimumSize?: number | IRBoxSize;
  /** 均匀缩放因子；同时影响 bbox / 字号 / padding / margin / 路径附着点（与 TikZ scale 一致） */
  scale?: number | IRAxisScale;
  /** 横向缩放，优先于 `scale` */
  /** 纵向缩放，优先于 `scale` */
  /** 文字颜色（块级默认；行级 IRLine.fill 可覆盖）；`NodeTextColor.Contrast` 按静态不透明 fill 选黑 / 白，不填走 `currentColor` */
  textColor?: string;
  /** 整节点透明度 0~1（同时作用于 shape 与 text） */
  opacity?: number;
  /** 主形状投影（仅作用于 shape 几何，不含 text / label / pin）；预设字符串（`sm`/`md`/`lg`/`xl`/`2xl`/`none`）或对象 `{ preset?, offsetX?, offsetY?, blur?, color?, opacity? }`（显式字段覆盖 preset） */
  shadow?: IRNode['shadow'];
  /** 主形状混合模式（与下方已绘内容混合，W3C 分离模式）；不含 text / label / pin。省略 / `normal` = 普通 source-over */
  blendMode?: IRNode['blendMode'];
  /**
   * 节点附属标签——TikZ `[label=top:foo]` 同义
   * @description 单对象或数组；每条 label 接 `text` / `position?` / `distance?` / 样式继承；`position` 接 8 方向枚举或数字角度（`label=30:foo` 等价 `position: 30`），缺省 'top'，distance 缺省 12
   */
  label?: InputNodeLabel | Array<InputNodeLabel>;
  /** 显式栈序：大者在上；缺省 0 = 声明顺序；同值稳定保序；只在同层（同 scope / 顶层）子节点间生效 */
  zIndex?: IRNode['zIndex'];
};

/**
 * Node 声明一个可引用的节点
 * @description 声明一个带位置、文本、形状和样式的可引用节点；组件自身不渲染 DOM，最终由 `<Layout>` 输出到
 *   SVG 或 Canvas
 */
export const Node: FC<NodeProps> = () => null;
Node.displayName = TIKZ_NODE;
