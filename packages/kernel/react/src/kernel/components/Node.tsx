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

/** 可定位、可连接的节点输入，组合文字、视觉形状和连接面 */
export type NodeProps = HydrationEventProps & {
  /** 可选编译驱动解释的运行时载荷，不进入 Core IR */
  authoring?: InputNode['authoring'];
  /** 实例视觉覆盖，逐字段覆盖继承默认值 */
  style?: InputNode['style'];
  /** 节点尺寸、间距与文本布局 */
  layout?: InputNode['layout'];
  /** 节点 id；其他 Path/Draw 通过这个 id 引用本节点 */
  id?: string;
  /** 指向同一节点几何的额外 id；要求主 id，别名非空白且不重复 */
  aliasIds?: IRNode['aliasIds'];
  /**
   * 视觉形状：无必填参数时可写名称，带参形状使用 `{ type, params }`；可选形状通过 Layout.extensions.shapes 注册
   * @default 'rectangle'
   */
  shape?: IRNode['shape'];
  /**
   * 连线接触的边界；省略时沿用视觉形状，也可选择已注册的连接面或形状，不改变节点外观
   * @default 'shape'
   */
  boundary?: IRBoundary;
  /** 用户自定义元数据；可在事件 / 水合上下文中读取，不参与布局。须为 JSON 可序列化对象 */
  meta?: IRNode['meta'];
  /** 元素级时间轴动画；每条 track 描述一个可动画属性，渲染端播放或降级为静态，不参与布局 */
  animations?: IRNode['animations'];
  /**
   * 节点中心位置
   * @description 六种形态：笛卡尔 `[x, y]` / 极坐标 `{ angle, radius, origin? }` / 相对定位 `{ direction, of, distance? }` / 偏移定位 `{ of, offset }` / 比例位置 `{ between: [A, B], fraction }` / 锚点对齐 `{ kind: 'anchor', target, selfAnchor? }`。锚点对齐会先完成当前 Node 的文本、shape、padding、margin、scale、rotate 布局，再整体平移；双方 anchor 缺省为 center
   */
  position:
    | IRPosition
    | PolarPosition
    | IRAtPosition
    | InputAtPosition
    | IROffsetPosition
    | IRBetweenPosition
    | IRAnchorPosition;
  /**
   * 绕节点中心旋转的角度，单位为度；正值顺时针
   * @default 0
   */
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
  /** 圆角半径（用户单位）；只对 `rectangle` shape 生效。建议用形状 params 形式 `shape={{ type: 'rectangle', params: { cornerRadius } }}` */
  cornerRadius?: number;
  /**
   * 均匀或分轴缩放；影响节点尺寸、字号、间距和路径附着点
   * @default 1
   */
  scale?: number | IRAxisScale;
  /**
   * 节点附加标签，支持单对象或数组
   * @description 标签可附着到命名方向、中心、角度或边界比例位置；支持内外侧摆放、旋转、切向对齐和外侧引线，不参与节点形状尺寸计算。缺省位置为 top，间距继承编译配置 labelDistance
   */
  label?: InputNodeLabel | Array<InputNodeLabel>;
  /**
   * 同层元素的栈序；大者在上，同值保持声明顺序
   * @default 0
   */
  zIndex?: IRNode['zIndex'];
};

/**
 * Node 声明一个可引用的节点
 * @description 声明一个带位置、文本、形状和样式的可引用节点；组件自身不渲染 DOM，最终由 `<Layout>` 输出到
 *   SVG 或 Canvas
 */
export const Node: FC<NodeProps> = () => null;
Node.displayName = TIKZ_NODE;
