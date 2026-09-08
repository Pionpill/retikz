import type {
  IRAnchorPosition,
  IRAtPosition,
  IRAxisScale,
  IRBetweenPosition,
  IRBoundary,
  IRLine,
  IRNode,
  IROffsetPosition,
  IRPosition,
  PolarPosition,
} from '@retikz/core';
import type { InputNode } from '@retikz/vanilla';
import type { InputAtPosition, InputNodeLabel } from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import type { HydrationEventProps } from '../protocol';

import { TIKZ_NODE } from '../protocol';

export type NodeProps = HydrationEventProps & {
  /** 实例视觉覆盖，逐字段覆盖继承默认值 */
  style?: InputNode['style'];
  /** 节点尺寸、间距与文本布局 */
  layout?: InputNode['layout'];
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
  /** 圆角半径（user units）；只对 `rectangle` shape 生效。建议用形状 params 形式 `shape={{ type: 'rectangle', params: { cornerRadius } }}` */
  cornerRadius?: number;
  /** 均匀缩放因子；同时影响 bbox / 字号 / padding / margin / 路径附着点（与 TikZ scale 一致） */
  scale?: number | IRAxisScale;
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
