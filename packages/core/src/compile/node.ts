import { type Circle, circle as circleOps } from '../geometry/circle';
import { type Diamond, diamond as diamondOps } from '../geometry/diamond';
import { type Ellipse, ellipse as ellipseOps } from '../geometry/ellipse';
import type { Position } from '../geometry/point';
import type { Rect, RectAnchor } from '../geometry/rect';
import { rect as rectOps } from '../geometry/rect';
import type { IRLineSpec, IRNode, NodeShape } from '../ir';
import type { ScenePrimitive, TextLine } from '../primitive';
import { resolvePosition } from './position';
import type { TextMeasurer } from './text-metrics';

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_PADDING = 8;
const DEFAULT_LINE_HEIGHT_FACTOR = 1.2;
const DEG_TO_RAD = Math.PI / 180;
const SQRT2 = Math.SQRT2;
/** dashed 预设：SVG stroke-dasharray "4 2"——4 px 实线 + 2 px 间隙循环 */
const DASHED_PATTERN = '4 2';
/** dotted 预设：SVG stroke-dasharray "1 2"——1 px 圆点 + 2 px 间隙 */
const DOTTED_PATTERN = '1 2';

/** 解析 dashed / dotted / dashArray 优先级：dashArray > dashed > dotted */
const resolveDashArray = (
  dashArray: string | undefined,
  dashed: boolean | undefined,
  dotted: boolean | undefined,
): string | undefined => {
  if (dashArray !== undefined) return dashArray;
  if (dashed) return DASHED_PATTERN;
  if (dotted) return DOTTED_PATTERN;
  return undefined;
};

/** IR `align` ('left' | 'center' | 'right') → SVG textAnchor ('start' | 'middle' | 'end') */
const alignToTextAnchor = (
  a: 'left' | 'center' | 'right',
): 'start' | 'middle' | 'end' =>
  a === 'left' ? 'start' : a === 'right' ? 'end' : 'middle';

export type NodeLayout = {
  /** 节点 id（如 IR Node 提供）；其他位置可通过 id 引用本节点 */
  id?: string;
  /** 节点形状——所有几何 / boundaryPoint 计算按 shape 多态 */
  shape: NodeShape;
  /**
   * 节点视觉边界框（所有 shape 共享语义）：
   * - rectangle: rect 即矩形本身
   * - circle:    rect.width = rect.height = 2 × radius（外接正方形）
   * - ellipse:   rect.width = 2 × rx，rect.height = 2 × ry（外接矩形）
   * - diamond:   rect.width = 2 × halfA，rect.height = 2 × halfB（外接矩形）
   *
   * x, y 是几何中心；rotate 是弧度（与 packages/core/AGENTS.md 对齐）。
   */
  rect: Rect;
  /** IR 中原始的旋转角（度数），保留供 emit 阶段写 SVG transform */
  rotateDeg: number;
  /** 外边距（user units，≥ 0）；path 附着到形状外扩 margin 的虚拟边界上 */
  margin: number;
  /**
   * 节点文本行；undefined 表示无文本，否则非空数组。
   * 每行可带覆盖样式（fill / opacity / fontSize / fontFamily / fontWeight / fontStyle）；
   * 未覆盖的字段在 emit 阶段不写出，由下游走 TextPrim 块级默认。
   */
  lines?: Array<TextLine>;
  /** 文本块宽度（user units）= max(per-line measureText.width) */
  textWidth: number;
  /** 文本块高度（user units）≈ lines × lineHeight */
  textHeight: number;
  /** 文本对齐（已映射到 SVG textAnchor 三态）；emit 时透传给 TextPrim.align */
  align: 'start' | 'middle' | 'end';
  /** 行高（user units），已应用默认值；emit 时透传给 TextPrim.lineHeight */
  lineHeight: number;
  /** 文本字号（user units），已应用默认值 */
  fontSize: number;
  /** 字体族；CSS font-family；emit 时透传给 TextPrim */
  fontFamily?: string;
  /** 字重；emit 时透传给 TextPrim */
  fontWeight?: string | number;
  /** 字形：normal / italic / oblique；emit 时透传给 TextPrim */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /** 节点背景色，CSS 颜色字符串；emit 时用 'transparent' 兜底 */
  fill?: string;
  /** 节点填充透明度 0~1；透传 shape primitive */
  fillOpacity?: number;
  /** 节点边框色，CSS 颜色字符串；emit 时用 'currentColor' 兜底 */
  stroke?: string;
  /** 节点描边透明度 0~1；TikZ `draw opacity`，透传 shape primitive */
  strokeOpacity?: number;
  /** 节点边框宽度（user units）；emit 时用 1 兜底 */
  strokeWidth?: number;
  /** SVG stroke-dasharray 字符串；compile 已把 dashed / dotted 预设解析为具体 pattern */
  strokeDasharray?: string;
  /** rectangle shape 的圆角半径（user units）；非 rect shape 该字段无效 */
  roundedCorners?: number;
  /** 文字颜色；emit 时透传给 TextPrim.fill，兜底 'currentColor' */
  textColor?: string;
  /** 整节点透明度 0~1；emit 时同时挂 shape 与 text primitive */
  opacity?: number;
};

/** 由 layout 构造的 Rect（带 margin 扩张） */
const rectOf = (layout: NodeLayout, marginAdd: number): Rect => ({
  x: layout.rect.x,
  y: layout.rect.y,
  width: layout.rect.width + 2 * marginAdd,
  height: layout.rect.height + 2 * marginAdd,
  rotate: layout.rect.rotate,
});

/** 由 layout 构造的 Circle（圆心 + 半径，半径=外接框边长/2 + margin） */
const circleOf = (layout: NodeLayout, marginAdd: number): Circle => ({
  x: layout.rect.x,
  y: layout.rect.y,
  // circle 外接框宽=高，任取一个；再加 margin
  radius: layout.rect.width / 2 + marginAdd,
  rotate: layout.rect.rotate,
});

/** 由 layout 构造的 Ellipse（rx/ry 各加 margin） */
const ellipseOf = (layout: NodeLayout, marginAdd: number): Ellipse => ({
  x: layout.rect.x,
  y: layout.rect.y,
  rx: layout.rect.width / 2 + marginAdd,
  ry: layout.rect.height / 2 + marginAdd,
  rotate: layout.rect.rotate,
});

/** 由 layout 构造的 Diamond（halfA/halfB 各加 margin） */
const diamondOf = (layout: NodeLayout, marginAdd: number): Diamond => ({
  x: layout.rect.x,
  y: layout.rect.y,
  halfA: layout.rect.width / 2 + marginAdd,
  halfB: layout.rect.height / 2 + marginAdd,
  rotate: layout.rect.rotate,
});

/**
 * 取节点 shape 在 toward 方向上的"附着点"——path 端点贴边用。
 * 按 shape 多态：rect / circle / ellipse / diamond 各自的 boundaryPoint。
 * margin > 0 时形状先外扩，让 path 在 border 外停 margin 个 user units。
 */
export const boundaryPointOf = (layout: NodeLayout, toward: Position): Position => {
  const m = layout.margin;
  switch (layout.shape) {
    case 'rectangle':
      return rectOps.boundaryPoint(rectOf(layout, m), toward);
    case 'circle':
      return circleOps.boundaryPoint(circleOf(layout, m), toward);
    case 'ellipse':
      return ellipseOps.boundaryPoint(ellipseOf(layout, m), toward);
    case 'diamond':
      return diamondOps.boundaryPoint(diamondOf(layout, m), toward);
  }
};

/**
 * 取节点 shape 的命名 anchor（center / north / east / north-east 等 9 个）。
 * **不应用 margin**——TikZ 语义中 explicit anchor 取的是视觉边界点，不涉及 outer sep。
 * 用于 `'A.north'` 这种语法落点。
 */
export const anchorOf = (layout: NodeLayout, name: RectAnchor): Position => {
  switch (layout.shape) {
    case 'rectangle':
      return rectOps.anchor(rectOf(layout, 0), name);
    case 'circle':
      return circleOps.anchor(circleOf(layout, 0), name);
    case 'ellipse':
      return ellipseOps.anchor(ellipseOf(layout, 0), name);
    case 'diamond':
      return diamondOps.anchor(diamondOf(layout, 0), name);
  }
};

/**
 * 取节点 shape 在指定角度方向上的边界点。角度约定与 PolarPosition 一致（度数）：
 *   0° = +x（east），90° = +y（screen 下方）。
 * **不应用 margin**——同 anchorOf。用于 `'A.30'` 这种语法落点。
 */
export const angleBoundaryOf = (layout: NodeLayout, angleDeg: number): Position => {
  const rad = (angleDeg * Math.PI) / 180;
  // toward 方向上任意距离都行——boundary 算法只用方向不用距离
  const toward: Position = [layout.rect.x + Math.cos(rad), layout.rect.y + Math.sin(rad)];
  switch (layout.shape) {
    case 'rectangle':
      return rectOps.boundaryPoint(rectOf(layout, 0), toward);
    case 'circle':
      return circleOps.boundaryPoint(circleOf(layout, 0), toward);
    case 'ellipse':
      return ellipseOps.boundaryPoint(ellipseOf(layout, 0), toward);
    case 'diamond':
      return diamondOps.boundaryPoint(diamondOf(layout, 0), toward);
  }
};

/**
 * 把 IR Node 解析为内部 NodeLayout：
 * - 算出文本度量与 padding 推导出"内框"半轴 (innerHalfW/H)
 * - 按 shape 决定外接边界尺寸（circle 取半对角线、ellipse 各 ×√2、diamond 各 ×2）
 * - 解析 position（笛卡尔或极坐标）为几何中心
 * - IR 的 rotate（度数）转弧度存进 Rect.rotate
 * - 透传 margin / 样式属性
 */
export const layoutNode = (
  node: IRNode,
  measureText: TextMeasurer,
  nodeIndex: Map<string, NodeLayout>,
  nodeDistance?: number,
): NodeLayout => {
  // 缩放：xScale / yScale 优先于 scale 别名；默认 1。layout-level 乘进所有尺寸，
  // 让 path 端点贴在缩放后的边界上（与 TikZ scale 行为一致）。
  // 字号取 min(sx, sy) 以保住 glyph 形状（避免非均匀缩放下文字被横纵拉变形）。
  const sx = node.xScale ?? node.scale ?? 1;
  const sy = node.yScale ?? node.scale ?? 1;
  const fontScale = Math.min(sx, sy);

  const baseFontSize = node.font?.size ?? DEFAULT_FONT_SIZE;
  const fontSize = baseFontSize * fontScale;
  const fontFamily = node.font?.family;
  const fontWeight = node.font?.weight;
  const fontStyle = node.font?.style;
  // 内 / 外边距解析顺序：
  //   axis-specific (innerXSep / innerYSep / outerSep)
  // → symmetric alias (padding / margin)
  // → 默认值
  // sep 也受 scale 影响——大 node 的视觉 padding 自然要更大
  const xSep = (node.innerXSep ?? node.padding ?? DEFAULT_PADDING) * sx;
  const ySep = (node.innerYSep ?? node.padding ?? DEFAULT_PADDING) * sy;
  const outerSep = (node.outerSep ?? node.margin ?? 0) * Math.max(sx, sy);
  const lineHeight =
    (node.lineHeight ?? baseFontSize * DEFAULT_LINE_HEIGHT_FACTOR) * sy;
  const align = alignToTextAnchor(node.align ?? 'center');

  // 标准化为 Array<IRLineSpec>：单字符串 → 单元素；空数组在 schema 阶段已被拒
  const rawLines: Array<IRLineSpec> | undefined =
    node.text === undefined
      ? undefined
      : typeof node.text === 'string'
        ? [node.text]
        : node.text;

  // 每行解析覆盖样式 + 度量。仅写入真正被覆盖的字段，未填字段由下游走块级默认。
  let textWidth = 0;
  let textHeight = 0;
  let lines: Array<TextLine> | undefined;
  if (rawLines) {
    lines = rawLines.map(spec => {
      const isObj = typeof spec !== 'string';
      const text = isObj ? spec.text : spec;
      // 行级 font 与块级 font 合并：行级有就用行级，没有走块级（透传 undefined）
      const lineFont = isObj ? spec.font : undefined;
      const lineSize = lineFont?.size ?? fontSize;
      const lineFamily = lineFont?.family ?? fontFamily;
      const lineWeight = lineFont?.weight ?? fontWeight;
      const lineStyle = lineFont?.style ?? fontStyle;
      const m = measureText(text, {
        size: lineSize,
        family: lineFamily,
        weight: lineWeight,
        style: lineStyle,
      });
      if (m.width > textWidth) textWidth = m.width;
      const out: TextLine = { text };
      // 只在行级与块级不同时写出（让 emit 的 JSON 更精简，下游 fallback 更明确）
      if (isObj) {
        if (spec.fill !== undefined) out.fill = spec.fill;
        if (spec.opacity !== undefined) out.opacity = spec.opacity;
        if (lineFont?.size !== undefined) out.fontSize = lineFont.size;
        if (lineFont?.family !== undefined) out.fontFamily = lineFont.family;
        if (lineFont?.weight !== undefined) out.fontWeight = lineFont.weight;
        if (lineFont?.style !== undefined) out.fontStyle = lineFont.style;
      }
      return out;
    });
    textHeight = lines.length * lineHeight;
  }

  // 内框半轴：text 半宽 + xSep / ySep（保证至少 sep 大小，空文本节点也有最小尺寸）
  // minimumWidth / minimumHeight（axis-specific）覆盖 minimumSize（对称别名）
  const minW = node.minimumWidth ?? node.minimumSize ?? 0;
  const minH = node.minimumHeight ?? node.minimumSize ?? 0;
  const innerHalfW = Math.max(textWidth / 2 + xSep, xSep, minW / 2);
  const innerHalfH = Math.max(textHeight / 2 + ySep, ySep, minH / 2);
  const shape = node.shape ?? 'rectangle';

  // 外接边界（bounding rect）的半轴——按 shape 计算
  let boundsHalfW: number;
  let boundsHalfH: number;
  switch (shape) {
    case 'rectangle':
      boundsHalfW = innerHalfW;
      boundsHalfH = innerHalfH;
      break;
    case 'circle': {
      // 外接圆半径 = 内框对角线/2，圆心居中
      const r = Math.sqrt(innerHalfW * innerHalfW + innerHalfH * innerHalfH);
      boundsHalfW = r;
      boundsHalfH = r;
      break;
    }
    case 'ellipse':
      // 外接椭圆：半轴 = 内框半轴 × √2（让内框 4 顶点落在椭圆周上）
      boundsHalfW = innerHalfW * SQRT2;
      boundsHalfH = innerHalfH * SQRT2;
      break;
    case 'diamond':
      // 外接菱形：半轴 = 内框半轴 × 2（让内框 4 顶点落在菱形 4 边上）
      boundsHalfW = innerHalfW * 2;
      boundsHalfH = innerHalfH * 2;
      break;
  }

  const rotateDeg = node.rotate ?? 0;
  const center = resolvePosition(node.position, nodeIndex, nodeDistance);
  if (!center) {
    throw new Error(
      `Cannot resolve position for node ${node.id ?? '(unnamed)'}; polar.origin or at.of may reference an undefined node`,
    );
  }
  return {
    id: node.id,
    shape,
    rect: {
      // x, y 是几何中心
      x: center[0],
      y: center[1],
      width: 2 * boundsHalfW,
      height: 2 * boundsHalfH,
      // IR 用度数，geometry 用弧度
      rotate: rotateDeg * DEG_TO_RAD,
    },
    rotateDeg,
    margin: outerSep,
    lines,
    textWidth,
    textHeight,
    align,
    lineHeight,
    fontSize,
    fontFamily,
    fontWeight,
    fontStyle,
    fill: node.fill,
    fillOpacity: node.fillOpacity,
    stroke: node.stroke,
    strokeOpacity: node.drawOpacity,
    strokeWidth: node.strokeWidth,
    strokeDasharray: resolveDashArray(node.dashArray, node.dashed, node.dotted),
    roundedCorners: node.roundedCorners,
    textColor: node.textColor,
    opacity: node.opacity,
  };
};

/** rectangle shape 的 RectPrim */
const emitRectShape = (
  layout: NodeLayout,
  round: (n: number) => number,
): ScenePrimitive => {
  const halfW = layout.rect.width / 2;
  const halfH = layout.rect.height / 2;
  return {
    type: 'rect',
    x: round(layout.rect.x - halfW),
    y: round(layout.rect.y - halfH),
    width: round(layout.rect.width),
    height: round(layout.rect.height),
    fill: layout.fill ?? 'transparent',
    fillOpacity: layout.fillOpacity,
    stroke: layout.stroke ?? 'currentColor',
    strokeOpacity: layout.strokeOpacity,
    strokeWidth: layout.strokeWidth ?? 1,
    strokeDasharray: layout.strokeDasharray,
    cornerRadius: layout.roundedCorners,
    opacity: layout.opacity,
  };
};

/** circle / ellipse shape 的 EllipsePrim（圆形 rx=ry） */
const emitEllipseShape = (
  layout: NodeLayout,
  round: (n: number) => number,
): ScenePrimitive => ({
  type: 'ellipse',
  cx: round(layout.rect.x),
  cy: round(layout.rect.y),
  rx: round(layout.rect.width / 2),
  ry: round(layout.rect.height / 2),
  fill: layout.fill ?? 'transparent',
  fillOpacity: layout.fillOpacity,
  stroke: layout.stroke ?? 'currentColor',
  strokeOpacity: layout.strokeOpacity,
  strokeWidth: layout.strokeWidth ?? 1,
  strokeDasharray: layout.strokeDasharray,
  opacity: layout.opacity,
});

/** diamond shape 的 PathPrim（4 顶点 + Z 闭合） */
const emitDiamondShape = (
  layout: NodeLayout,
  round: (n: number) => number,
): ScenePrimitive => {
  // 4 顶点：用 diamond 几何工具直接拿 anchor，已带旋转处理
  const diam = diamondOf(layout, 0);
  const e = diamondOps.anchor(diam, 'east');
  const n = diamondOps.anchor(diam, 'north');
  const w = diamondOps.anchor(diam, 'west');
  const s = diamondOps.anchor(diam, 'south');
  const d = `M ${round(e[0])} ${round(e[1])} L ${round(n[0])} ${round(n[1])} L ${round(w[0])} ${round(w[1])} L ${round(s[0])} ${round(s[1])} Z`;
  return {
    type: 'path',
    d,
    fill: layout.fill ?? 'transparent',
    fillOpacity: layout.fillOpacity,
    stroke: layout.stroke ?? 'currentColor',
    strokeOpacity: layout.strokeOpacity,
    strokeWidth: layout.strokeWidth ?? 1,
    strokeDasharray: layout.strokeDasharray,
    opacity: layout.opacity,
  };
};

/**
 * 把 NodeLayout 翻译为 Scene primitives：
 * - shape 主体：按 shape 分发（rect / ellipse / path）
 * - text（如有内容）：始终走 TextPrim
 * - 若有旋转：外面套一层 GroupPrim 用 SVG `rotate(deg cx cy)` 实现
 *   （PathPrim 的 diamond 顶点已自带旋转坐标，但 text 需要 group 旋转，
 *    所以仍统一用 group 包裹）
 */
export const emitNodePrimitives = (
  layout: NodeLayout,
  round: (n: number) => number,
): Array<ScenePrimitive> => {
  let shapePrim: ScenePrimitive;
  switch (layout.shape) {
    case 'rectangle':
      shapePrim = emitRectShape(layout, round);
      break;
    case 'circle':
    case 'ellipse':
      shapePrim = emitEllipseShape(layout, round);
      break;
    case 'diamond':
      // diamond 的 4 顶点已经按 layout.rect.rotate 旋转过，所以下面 group
      // wrap 时只能给 text 旋转、不能再给 diamond 二次旋转。简化办法：
      // 这里 emit 的 d 用"未旋转"的 diamond，让外层 group 统一旋转。
      shapePrim = emitDiamondShape(unrotated(layout), round);
      break;
  }

  const inner: Array<ScenePrimitive> = [shapePrim];
  if (layout.lines) {
    // align=left: 块左边对齐——TextPrim.x = 中心 - 块半宽，textAnchor=start
    // align=right: 块右边对齐——TextPrim.x = 中心 + 块半宽，textAnchor=end
    // align=middle: 居中——TextPrim.x = 中心
    const halfBlockW = layout.textWidth / 2;
    const xOffset =
      layout.align === 'start' ? -halfBlockW : layout.align === 'end' ? halfBlockW : 0;
    inner.push({
      type: 'text',
      x: round(layout.rect.x + xOffset),
      y: round(layout.rect.y),
      lines: layout.lines,
      fontSize: layout.fontSize,
      fontFamily: layout.fontFamily,
      fontWeight: layout.fontWeight,
      fontStyle: layout.fontStyle,
      align: layout.align,
      baseline: 'middle',
      lineHeight: round(layout.lineHeight),
      fill: layout.textColor ?? 'currentColor',
      opacity: layout.opacity,
      measuredWidth: round(layout.textWidth),
      measuredHeight: round(layout.textHeight),
    });
  }
  if (layout.rotateDeg === 0) return inner;
  return [
    {
      type: 'group',
      transform: `rotate(${round(layout.rotateDeg)} ${round(layout.rect.x)} ${round(layout.rect.y)})`,
      children: inner,
    },
  ];
};

/** 返回 layout 的"未旋转"副本——用于先把 diamond 顶点按未旋转算，再由外层 group 统一旋转 */
const unrotated = (layout: NodeLayout): NodeLayout => ({
  ...layout,
  rect: { ...layout.rect, rotate: 0 },
});
