import { type Circle, circle as circleOps } from '../geometry/circle';
import { type Diamond, diamond as diamondOps } from '../geometry/diamond';
import { type Ellipse, ellipse as ellipseOps } from '../geometry/ellipse';
import type { Position } from '../geometry/point';
import type { Rect, RectAnchor } from '../geometry/rect';
import { rect as rectOps } from '../geometry/rect';
import type { AtDirection, IRLineSpec, IRNode, IRNodeLabel, NodeShape } from '../ir';
import type { ScenePrimitive, TextLine } from '../primitive';
import { resolvePosition } from './position';
import type { TextMeasurer } from './text-metrics';

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_PADDING = 8;
const DEFAULT_LINE_HEIGHT_FACTOR = 1.2;
const DEG_TO_RAD = Math.PI / 180;
/** Node label 与 node 边界默认距离（TikZ 默认 0pt 视觉太贴） */
const DEFAULT_LABEL_DISTANCE = 4;
const SQRT2 = Math.SQRT2;
/** dashed 预设：4 px 实线 + 2 px 间隙循环 */
const DASHED_PATTERN = '4 2';
/** dotted 预设：1 px 圆点 + 2 px 间隙 */
const DOTTED_PATTERN = '1 2';

/** dashed / dotted / dashArray 优先级：dashArray > dashed > dotted */
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

/** IR align → 文字对齐锚点（start / middle / end） */
const alignToTextAnchor = (
  a: 'left' | 'center' | 'right',
): 'start' | 'middle' | 'end' =>
  a === 'left' ? 'start' : a === 'right' ? 'end' : 'middle';

export type NodeLayout = {
  /** 节点 id（其他位置可引用） */
  id?: string;
  /** 节点形状，所有几何 / boundaryPoint 按 shape 多态 */
  shape: NodeShape;
  /**
   * 节点视觉边界框（所有 shape 共享语义）
   * @description rectangle: rect 本身；circle: width=height=2×radius；ellipse: 2×rx,2×ry；diamond: 2×halfA,2×halfB。x,y 是几何中心，rotate 弧度
   */
  rect: Rect;
  /** IR 原始旋转角（度数），供 emit 阶段写入 GroupPrim 的 rotate transform */
  rotateDeg: number;
  /** 外边距（≥ 0），path 附着到外扩 margin 的虚拟边界 */
  margin: number;
  /**
   * 节点文本行（undefined 表示无文本，否则非空数组）
   * @description 每行可带覆盖样式（fill/opacity/fontSize/fontFamily/fontWeight/fontStyle），未覆盖字段 emit 阶段不写出由下游走块级默认
   */
  lines?: Array<TextLine>;
  /** 文本块宽度 = max(per-line measureText.width) */
  textWidth: number;
  /** 文本块高度 ≈ lines × lineHeight */
  textHeight: number;
  /** 文本对齐（start / middle / end 三态） */
  align: 'start' | 'middle' | 'end';
  /** 行高（已应用默认值） */
  lineHeight: number;
  /** 文本字号（已应用默认值） */
  fontSize: number;
  /** 字体族（CSS font-family） */
  fontFamily?: string;
  /** 字重 */
  fontWeight?: string | number;
  /** 字形 */
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /** 节点背景色，emit 时 'transparent' 兜底 */
  fill?: string;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** 节点边框色，emit 时 'currentColor' 兜底 */
  stroke?: string;
  /** 描边透明度 0~1（TikZ `draw opacity`） */
  strokeOpacity?: number;
  /** 边框宽度，emit 时 1 兜底 */
  strokeWidth?: number;
  /** 描边 dash pattern，已把 dashed/dotted 预设解析为具体 pattern */
  dashPattern?: string;
  /** rectangle 圆角半径（非 rect shape 无效） */
  roundedCorners?: number;
  /** 文字颜色，emit 时 'currentColor' 兜底 */
  textColor?: string;
  /** 整节点透明度 0~1（同时挂 shape 与 text primitive） */
  opacity?: number;
  /**
   * 已解析的 label 列表
   * @description IR 层 `Node.label` 标准化：position 默认 'above'、distance 默认 DEFAULT_LABEL_DISTANCE、font 从 Node 继承
   */
  labels?: Array<NodeLabelLayout>;
};

/** 节点附属标签 layout（layoutNode 已合并默认值与样式继承） */
export type NodeLabelLayout = {
  text: string;
  /** 8 方向枚举或数字角度 */
  position: AtDirection | number;
  /** 已应用默认值 */
  distance: number;
  textColor?: string;
  opacity?: number;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
};

/** 从 layout 构造 Rect（带 margin 扩张） */
const rectOf = (layout: NodeLayout, marginAdd: number): Rect => ({
  x: layout.rect.x,
  y: layout.rect.y,
  width: layout.rect.width + 2 * marginAdd,
  height: layout.rect.height + 2 * marginAdd,
  rotate: layout.rect.rotate,
});

/** 从 layout 构造 Circle（radius=外接框边长/2 + margin） */
const circleOf = (layout: NodeLayout, marginAdd: number): Circle => ({
  x: layout.rect.x,
  y: layout.rect.y,
  // circle 外接框宽=高
  radius: layout.rect.width / 2 + marginAdd,
  rotate: layout.rect.rotate,
});

/** 从 layout 构造 Ellipse（rx/ry 各加 margin） */
const ellipseOf = (layout: NodeLayout, marginAdd: number): Ellipse => ({
  x: layout.rect.x,
  y: layout.rect.y,
  rx: layout.rect.width / 2 + marginAdd,
  ry: layout.rect.height / 2 + marginAdd,
  rotate: layout.rect.rotate,
});

/** 从 layout 构造 Diamond（halfA/halfB 各加 margin） */
const diamondOf = (layout: NodeLayout, marginAdd: number): Diamond => ({
  x: layout.rect.x,
  y: layout.rect.y,
  halfA: layout.rect.width / 2 + marginAdd,
  halfB: layout.rect.height / 2 + marginAdd,
  rotate: layout.rect.rotate,
});

/**
 * 取节点 shape 在 toward 方向的附着点（path 端点贴边用）
 * @description 按 shape 多态调用各自 boundaryPoint；margin > 0 时形状先外扩，让 path 在 border 外停 margin
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
 * 取节点 shape 命名 anchor（center / north / east / north-east 等 9 个）
 * @description 不应用 margin——TikZ 语义中 explicit anchor 取视觉边界点不涉及 outer sep；用于 `'A.north'` 落点
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

/** 8 方向 label position → (anchorName, 单位向量)；above 视觉上方即 y 减小 */
const LABEL_DIRECTION_MAP: Record<
  AtDirection,
  { anchor: RectAnchor; vec: [number, number] }
> = {
  above: { anchor: 'north', vec: [0, -1] },
  below: { anchor: 'south', vec: [0, 1] },
  left: { anchor: 'west', vec: [-1, 0] },
  right: { anchor: 'east', vec: [1, 0] },
  'above-left': { anchor: 'north-west', vec: [-Math.SQRT1_2, -Math.SQRT1_2] },
  'above-right': { anchor: 'north-east', vec: [Math.SQRT1_2, -Math.SQRT1_2] },
  'below-left': { anchor: 'south-west', vec: [-Math.SQRT1_2, Math.SQRT1_2] },
  'below-right': { anchor: 'south-east', vec: [Math.SQRT1_2, Math.SQRT1_2] },
};

/**
 * 算 label 中心点
 * @description 8 方向：节点对应 anchor 出发按单位向量 × distance 外推；数字角度：先取 angleBoundary 边界点再沿 (cos,sin) × distance 外推
 */
const labelCenter = (layout: NodeLayout, label: NodeLabelLayout): Position => {
  if (typeof label.position === 'number') {
    const rad = (label.position * Math.PI) / 180;
    const [bx, by] = angleBoundaryOf(layout, label.position);
    return [bx + Math.cos(rad) * label.distance, by + Math.sin(rad) * label.distance];
  }
  const { anchor, vec } = LABEL_DIRECTION_MAP[label.position];
  const [bx, by] = anchorOf(layout, anchor);
  return [bx + vec[0] * label.distance, by + vec[1] * label.distance];
};

/**
 * 取节点 shape 在指定角度方向的边界点
 * @description 角度约定与 PolarPosition 一致（度数：0°=+x，90°=+y 即 screen 下方）；不应用 margin（同 anchorOf）；用于 `'A.30'` 落点
 */
export const angleBoundaryOf = (layout: NodeLayout, angleDeg: number): Position => {
  const rad = (angleDeg * Math.PI) / 180;
  // toward 任意距离都行——boundary 只用方向
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
 * IR Node → 内部 NodeLayout
 * @description 文本度量 + padding 推内框半轴；按 shape 算外接边界（circle 取半对角线、ellipse ×√2、diamond ×2）；解析 position 为几何中心；rotate 度数转弧度
 */
export const layoutNode = (
  node: IRNode,
  measureText: TextMeasurer,
  nodeIndex: Map<string, NodeLayout>,
  nodeDistance?: number,
): NodeLayout => {
  // 缩放：xScale/yScale 优先于 scale 别名，默认 1；乘进所有尺寸让 path 贴缩放后边界。
  // 字号取 min(sx,sy) 保 glyph 形状，避免非均匀缩放下文字被拉变形。
  const sx = node.xScale ?? node.scale ?? 1;
  const sy = node.yScale ?? node.scale ?? 1;
  const fontScale = Math.min(sx, sy);

  const baseFontSize = node.font?.size ?? DEFAULT_FONT_SIZE;
  const fontSize = baseFontSize * fontScale;
  const fontFamily = node.font?.family;
  const fontWeight = node.font?.weight;
  const fontStyle = node.font?.style;
  // 内/外边距优先级：axis-specific (innerXSep/innerYSep/outerSep) → symmetric alias (padding/margin) → 默认；sep 受 scale 影响
  const xSep = (node.innerXSep ?? node.padding ?? DEFAULT_PADDING) * sx;
  const ySep = (node.innerYSep ?? node.padding ?? DEFAULT_PADDING) * sy;
  const outerSep = (node.outerSep ?? node.margin ?? 0) * Math.max(sx, sy);
  const lineHeight =
    (node.lineHeight ?? baseFontSize * DEFAULT_LINE_HEIGHT_FACTOR) * sy;
  const align = alignToTextAnchor(node.align ?? 'center');

  // 标准化为 Array<IRLineSpec>：单字符串 → 单元素（空数组 schema 已拒）
  const rawLines: Array<IRLineSpec> | undefined =
    node.text === undefined
      ? undefined
      : typeof node.text === 'string'
        ? [node.text]
        : node.text;

  // 每行解析覆盖样式 + 度量；仅写真正被覆盖的字段，未填字段由下游走块级默认
  let textWidth = 0;
  let textHeight = 0;
  let lines: Array<TextLine> | undefined;
  if (rawLines) {
    lines = rawLines.map(spec => {
      const isObj = typeof spec !== 'string';
      const text = isObj ? spec.text : spec;
      // 行级 font 与块级合并：行级优先，没有走块级（透传 undefined）
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
      // 行级与块级不同时才写出（精简 emit JSON，明确下游 fallback）
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

  // 内框半轴：text 半宽 + sep（保证至少 sep 大小，空文本节点也有最小尺寸）
  // minimumWidth/Height (axis-specific) 覆盖 minimumSize (对称别名)
  const minW = node.minimumWidth ?? node.minimumSize ?? 0;
  const minH = node.minimumHeight ?? node.minimumSize ?? 0;
  const innerHalfW = Math.max(textWidth / 2 + xSep, xSep, minW / 2);
  const innerHalfH = Math.max(textHeight / 2 + ySep, ySep, minH / 2);
  const shape = node.shape ?? 'rectangle';

  // 外接边界（bounding rect）半轴，按 shape 计算
  let boundsHalfW: number;
  let boundsHalfH: number;
  switch (shape) {
    case 'rectangle':
      boundsHalfW = innerHalfW;
      boundsHalfH = innerHalfH;
      break;
    case 'circle': {
      // 外接圆半径 = 内框对角线/2
      const r = Math.sqrt(innerHalfW * innerHalfW + innerHalfH * innerHalfH);
      boundsHalfW = r;
      boundsHalfH = r;
      break;
    }
    case 'ellipse':
      // 外接椭圆半轴 = 内框半轴 × √2（内框 4 顶点落在椭圆周上）
      boundsHalfW = innerHalfW * SQRT2;
      boundsHalfH = innerHalfH * SQRT2;
      break;
    case 'diamond':
      // 外接菱形半轴 = 内框半轴 × 2（内框 4 顶点落在菱形 4 边上）
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
  // 标准化 label：单对象 → 单元素数组；继承 Node 的 font/textColor
  const rawLabels: Array<IRNodeLabel> | undefined =
    node.label === undefined
      ? undefined
      : Array.isArray(node.label)
        ? node.label
        : [node.label];
  const labels: Array<NodeLabelLayout> | undefined = rawLabels?.map(lab => {
    const labFont = lab.font;
    return {
      text: lab.text,
      position: lab.position ?? 'above',
      distance: lab.distance ?? DEFAULT_LABEL_DISTANCE,
      textColor: lab.textColor ?? node.textColor,
      opacity: lab.opacity,
      fontSize: (labFont?.size ?? baseFontSize) * fontScale,
      fontFamily: labFont?.family ?? fontFamily,
      fontWeight: labFont?.weight ?? fontWeight,
      fontStyle: labFont?.style ?? fontStyle,
    };
  });

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
    dashPattern: resolveDashArray(node.dashArray, node.dashed, node.dotted),
    roundedCorners: node.roundedCorners,
    textColor: node.textColor,
    opacity: node.opacity,
    labels,
  };
};

/** rectangle → RectPrim */
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
    dashPattern: layout.dashPattern,
    cornerRadius: layout.roundedCorners,
    opacity: layout.opacity,
  };
};

/** circle/ellipse → EllipsePrim（圆形 rx=ry） */
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
  dashPattern: layout.dashPattern,
  opacity: layout.opacity,
});

/** diamond → PathPrim（4 顶点 + close 闭合） */
const emitDiamondShape = (
  layout: NodeLayout,
  round: (n: number) => number,
): ScenePrimitive => {
  // 4 顶点：diamond 几何工具直接拿 anchor，已带旋转处理
  const diam = diamondOf(layout, 0);
  const e = diamondOps.anchor(diam, 'east');
  const n = diamondOps.anchor(diam, 'north');
  const w = diamondOps.anchor(diam, 'west');
  const s = diamondOps.anchor(diam, 'south');
  return {
    type: 'path',
    commands: [
      { kind: 'move', to: [round(e[0]), round(e[1])] },
      { kind: 'line', to: [round(n[0]), round(n[1])] },
      { kind: 'line', to: [round(w[0]), round(w[1])] },
      { kind: 'line', to: [round(s[0]), round(s[1])] },
      { kind: 'close' },
    ],
    fill: layout.fill ?? 'transparent',
    fillOpacity: layout.fillOpacity,
    stroke: layout.stroke ?? 'currentColor',
    strokeOpacity: layout.strokeOpacity,
    strokeWidth: layout.strokeWidth ?? 1,
    dashPattern: layout.dashPattern,
    opacity: layout.opacity,
  };
};

/**
 * NodeLayout → Scene primitives
 * @description shape 主体按 shape 分发（rect/ellipse/path）；text 始终走 TextPrim；有旋转时外层 GroupPrim 用 `rotate(deg cx cy)` 统一包裹（text 必须靠 group 旋转）
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
      // diamond 4 顶点已按 layout.rect.rotate 旋转过，外层 group 会再旋转 text
      // 不能让 diamond 被二次旋转——这里 emit 的 d 用"未旋转"版让外层 group 统一旋转
      shapePrim = emitDiamondShape(unrotated(layout), round);
      break;
  }

  const inner: Array<ScenePrimitive> = [shapePrim];
  if (layout.lines) {
    // align=start: x=中心-块半宽; align=end: x=中心+块半宽; align=middle: x=中心
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
  // 每个 label 一个 TextPrim，放在 inner 同组 → 跟 node 旋转一致
  if (layout.labels) {
    for (const lab of layout.labels) {
      const [lx, ly] = labelCenter(layout, lab);
      inner.push({
        type: 'text',
        x: round(lx),
        y: round(ly),
        lines: [{ text: lab.text }],
        fontSize: lab.fontSize,
        fontFamily: lab.fontFamily,
        fontWeight: lab.fontWeight,
        fontStyle: lab.fontStyle,
        align: 'middle',
        baseline: 'middle',
        lineHeight: round(lab.fontSize * DEFAULT_LINE_HEIGHT_FACTOR),
        fill: lab.textColor ?? 'currentColor',
        opacity: lab.opacity ?? layout.opacity,
        measuredWidth: 0,
        measuredHeight: round(lab.fontSize),
      });
    }
  }
  if (layout.rotateDeg === 0) return inner;
  return [
    {
      type: 'group',
      transforms: [
        {
          kind: 'rotate',
          degrees: round(layout.rotateDeg),
          cx: round(layout.rect.x),
          cy: round(layout.rect.y),
        },
      ],
      children: inner,
    },
  ];
};

/** layout 的"未旋转"副本，让 diamond 顶点先按未旋转算，外层 group 统一旋转 */
const unrotated = (layout: NodeLayout): NodeLayout => ({
  ...layout,
  rect: { ...layout.rect, rotate: 0 },
});
