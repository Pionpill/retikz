import type { Rect } from '../geometry/rect';
import type { IRNode } from '../ir';
import type { ScenePrimitive } from '../primitive';
import { resolvePosition } from './position';
import type { TextMeasurer } from './text-metrics';

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_PADDING = 8;
const DEG_TO_RAD = Math.PI / 180;

export type NodeLayout = {
  /** 节点 id（如 IR Node 提供）；其他位置可通过 id 引用本节点 */
  id?: string;
  /** 节点几何盒（x, y 是几何中心，rotate 是弧度，见 packages/core/AGENTS.md） */
  rect: Rect;
  /** IR 中原始的旋转角（度数），保留供 emit 阶段写 SVG transform */
  rotateDeg: number;
  /** 外边距（user units，≥ 0）；path 附着到 rect 外扩 margin 的虚拟 attachRect 上 */
  margin: number;
  /** 节点文本内容；空字符串视为无文本（undefined） */
  text?: string;
  /** 文本宽度（user units），由 TextMeasurer 算出 */
  textWidth: number;
  /** 文本高度（user units），由 TextMeasurer 算出 */
  textHeight: number;
  /** 文本字号（user units） */
  fontSize: number;
  /** 节点矩形背景色，CSS 颜色字符串；emit 时用 'transparent' 兜底 */
  fill?: string;
  /** 节点矩形边框色，CSS 颜色字符串；emit 时用 'currentColor' 兜底 */
  stroke?: string;
  /** 节点矩形边框宽度（user units）；emit 时用 1 兜底 */
  strokeWidth?: number;
};

/**
 * 取节点的"附着 rect"——用于 path 端点贴边的几何盒。
 * 在视觉 rect 基础上每边外扩 margin，保持中心与旋转不变。
 * margin = 0 时直接返回视觉 rect 自身（避免无意义复制）。
 */
export const attachRectOf = (layout: NodeLayout): Rect => {
  if (layout.margin === 0) return layout.rect;
  return {
    x: layout.rect.x,
    y: layout.rect.y,
    width: layout.rect.width + 2 * layout.margin,
    height: layout.rect.height + 2 * layout.margin,
    rotate: layout.rect.rotate,
  };
};

/**
 * 把 IR Node 解析为内部 NodeLayout：
 * - 算出文本度量与 padding 推导出的视觉 rect 尺寸
 * - 解析 position（笛卡尔或极坐标）为几何中心
 * - IR 的 rotate（度数）转弧度存进 Rect.rotate
 * - 透传 margin / 样式属性
 */
export const layoutNode = (
  node: IRNode,
  measureText: TextMeasurer,
  nodeIndex: Map<string, NodeLayout>,
): NodeLayout => {
  const fontSize = node.fontSize ?? DEFAULT_FONT_SIZE;
  const padding = node.padding ?? DEFAULT_PADDING;
  const metrics = node.text
    ? measureText(node.text, { size: fontSize })
    : { width: 0, height: 0 };
  const width = Math.max(metrics.width + padding * 2, padding * 2);
  const height = Math.max(metrics.height + padding * 2, padding * 2);
  const rotateDeg = node.rotate ?? 0;
  // node.position 可能是 Position 或 PolarPosition；解析为笛卡尔
  const center = resolvePosition(node.position, nodeIndex);
  if (!center) {
    throw new Error(
      `Cannot resolve position for node ${node.id ?? '(unnamed)'}; polar.origin may reference an undefined node`,
    );
  }
  return {
    id: node.id,
    rect: {
      // x, y 是几何中心
      x: center[0],
      y: center[1],
      width,
      height,
      // IR 用度数（TikZ 习惯），geometry 用弧度（数学习惯），此处转一次
      rotate: rotateDeg * DEG_TO_RAD,
    },
    rotateDeg,
    margin: node.margin ?? 0,
    text: node.text,
    textWidth: metrics.width,
    textHeight: metrics.height,
    fontSize,
    fill: node.fill,
    stroke: node.stroke,
    strokeWidth: node.strokeWidth,
  };
};

/**
 * 把 NodeLayout 翻译为 Scene primitives：
 * - rect（背景边框；x/y 转为 SVG 风格的左上角）
 * - text（如有内容）
 * - 若有旋转，外面套一层 GroupPrim 用 SVG `rotate(deg cx cy)` 实现，
 *   内层 RectPrim/TextPrim 自身保持轴对齐
 */
export const emitNodePrimitives = (
  layout: NodeLayout,
  round: (n: number) => number,
): Array<ScenePrimitive> => {
  const halfW = layout.rect.width / 2;
  const halfH = layout.rect.height / 2;
  const inner: Array<ScenePrimitive> = [
    {
      type: 'rect',
      // RectPrim 走 SVG 风格：x, y 是左上角，故由几何中心转换
      x: round(layout.rect.x - halfW),
      y: round(layout.rect.y - halfH),
      width: round(layout.rect.width),
      height: round(layout.rect.height),
      fill: layout.fill ?? 'transparent',
      stroke: layout.stroke ?? 'currentColor',
      strokeWidth: layout.strokeWidth ?? 1,
    },
  ];
  if (layout.text) {
    inner.push({
      type: 'text',
      x: round(layout.rect.x),
      y: round(layout.rect.y),
      content: layout.text,
      fontSize: layout.fontSize,
      align: 'middle',
      baseline: 'middle',
      fill: 'currentColor',
      measuredWidth: round(layout.textWidth),
      measuredHeight: round(layout.textHeight),
    });
  }
  if (layout.rotateDeg === 0) return inner;
  // SVG `rotate(angle cx cy)` 角度用度数；绕节点几何中心旋转
  return [
    {
      type: 'group',
      transform: `rotate(${round(layout.rotateDeg)} ${round(layout.rect.x)} ${round(layout.rect.y)})`,
      children: inner,
    },
  ];
};
