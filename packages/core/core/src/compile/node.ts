import type { Position } from '../geometry/point';
import { arcEndPoint } from '@retikz/math';
import { normalizeCompassAnchor } from '../geometry/anchor';
import type { Rect } from '../geometry/rect';
import type { AtDirectionValue, IRAnimationTrack, IRBoundary, IRJsonObject, IRLabelDefault, IRLineSpec, IRNode, IRNodeLabel, IRPaintSpec, IRShapeRef, JsonValue } from '../ir';
import { JsonObjectSchema } from '../ir';
import type { PaintResolver } from './paint';
import type { GroupPrim, ScenePrimitive, TextLine, Transform } from '../primitive';
import { BUILTIN_SHAPES } from '../shapes';
import type { ShapeDefinition, ShapeStyle } from '../shapes';
import type { NameStack } from './name-stack';
import { DirectionVectorByAtDirection, LabelAnchorByAtDirection } from './direction';
import { type ResolveBetweenGlobal, resolvePosition } from './position';
import { toAlphabeticBaselineY } from './text-baseline';
import type { FontSpec, TextMeasurer } from './text-metrics';
import { resolveBoundary } from './boundary';

const DEFAULT_FONT_SIZE = 14;
const DEFAULT_PADDING = 8;
/** 无参 / 合成 layout 的 shape params 兜底（避免每次调用重建空对象） */
const EMPTY_SHAPE_PARAMS: IRJsonObject = {};

/**
 * 规范化 `Node.shape` 为 `{ type, params }`
 * @description 裸 string → `{ type, params: {} }`；`{ type, params? }` → params 缺省补 `{}`；
 *   缺省（undefined）→ `{ type: 'rectangle', params: {} }`。`'circle'`（裸 string）消解为
 *   `{ type: 'ellipse', params: { circumscribe: 'equal' } }`——circle 无独立几何，是 ellipse 等轴 preset 别名。
 *   `'diamond'`（裸 string）消解为 `{ type: 'polygon', params: { sides: 4, rotate: 0 } }`——diamond 无独立几何，
 *   是 polygon 4 边形 preset 别名。仅做形态归一，不查表 / 不校验。
 */
const normalizeShape = (shape: IRNode['shape']): { type: string; params: IRJsonObject } => {
  if (shape === undefined) return { type: 'rectangle', params: {} };
  if (shape === 'circle') return { type: 'ellipse', params: { circumscribe: 'equal' } };
  if (shape === 'diamond') return { type: 'polygon', params: { sides: 4, rotate: 0 } };
  if (typeof shape === 'string') return { type: shape, params: {} };
  const ref: IRShapeRef = shape;
  return { type: ref.type, params: ref.params ?? {} };
};

/**
 * 递归把 JSON 值里所有数值叶子乘以 factor（数组 / 对象深入，string / boolean / null 原样）
 * @description 用于 shape params 随 node scale 协同缩放；输入已是 JSON-safe（双护栏过），输出仍 JSON-safe。
 */
const scaleJsonNumbers = <T extends JsonValue>(value: T, factor: number): T => {
  if (typeof value === 'number') return (value * factor) as T;
  if (Array.isArray(value)) return value.map(v => scaleJsonNumbers(v, factor)) as T;
  if (value !== null && typeof value === 'object') {
    const out: Record<string, JsonValue> = {};
    for (const [k, v] of Object.entries(value)) out[k] = scaleJsonNumbers(v, factor);
    return out as T;
  }
  return value;
};
const DEFAULT_LINE_HEIGHT_FACTOR = 1.2;
const DEG_TO_RAD = Math.PI / 180;

/** CJK / fullwidth ranges: break per-character (no whitespace needed) */
const isCjk = (ch: string): boolean => {
  const c = ch.codePointAt(0) ?? 0;
  return (
    (c >= 0x3000 && c <= 0x303f) ||
    (c >= 0x3040 && c <= 0x30ff) ||
    (c >= 0x3400 && c <= 0x4dbf) ||
    (c >= 0x4e00 && c <= 0x9fff) ||
    (c >= 0xf900 && c <= 0xfaff) ||
    (c >= 0xff00 && c <= 0xffef)
  );
};
/**
 * 按 maxWidth 贪心折行：西文按词（空白分割）、CJK 按字；长不可断 token 溢出不硬断
 * @description 用注入的 measureText 度量；连续空白归一为单空格分隔。空文本返回 [''].
 */
const wrapText = (
  text: string,
  font: FontSpec,
  maxWidth: number,
  measure: TextMeasurer,
): Array<string> => {
  // 拆 unit：空白段 → 单空格分隔符；非空白段把 CJK 拆单字、非 CJK 连续 run 保整
  const units: Array<string> = [];
  for (const seg of text.split(/(\s+)/)) {
    if (seg === '') continue;
    if (/^\s+$/.test(seg)) {
      units.push(' ');
      continue;
    }
    let run = '';
    for (const ch of seg) {
      if (isCjk(ch)) {
        if (run) {
          units.push(run);
          run = '';
        }
        units.push(ch);
      } else {
        run += ch;
      }
    }
    if (run) units.push(run);
  }

  const lines: Array<string> = [];
  let cur = '';
  for (const u of units) {
    if (u === ' ') {
      if (cur !== '') cur += ' ';
      continue;
    }
    const candidate = cur === '' ? u : cur + u;
    // cur 为空时即使溢出也接受（单 token 宽于阈值 → 溢出不硬断）
    if (cur !== '' && measure(candidate, font).width > maxWidth) {
      lines.push(cur.trimEnd());
      cur = u;
    } else {
      cur = candidate;
    }
  }
  if (cur.trimEnd() !== '') lines.push(cur.trimEnd());
  return lines.length > 0 ? lines : [''];
};
/** Node label 与 node 边界默认距离（TikZ 默认 0pt 视觉太贴） */
const DEFAULT_LABEL_DISTANCE = 12;
/** dashed 预设：4 px 实线 + 2 px 间隙循环 */
const DASHED_PATTERN: Array<number> = [4, 2];
/** dotted 预设：1 px 圆点 + 2 px 间隙 */
const DOTTED_PATTERN: Array<number> = [1, 2];

/** dashed / dotted / dashPattern 优先级：dashPattern > dashed > dotted */
const resolveDashPattern = (
  dashPattern: Array<number> | undefined,
  dashed: boolean | undefined,
  dotted: boolean | undefined,
): Array<number> | undefined => {
  if (dashPattern !== undefined) return dashPattern;
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
  /** 节点形状名（诊断 / 错误信息用；几何走 shapeDef） */
  shapeName: string;
  /** 已解析的 shape 定义；circumscribe / boundaryPoint / anchor / emit 多点复用，取代旧 switch */
  shapeDef: ShapeDefinition;
  /**
   * 已校验的 per-instance shape 参数（经 `paramsSchema.parse` + `JsonObjectSchema.parse` 双护栏）
   * @description 透传给 `shapeDef` 的 circumscribe / boundaryPoint / anchor / edgePoint / emit；
   *   无参形状（内置 4 个）解析为 `{}`。省略时各调用点以空对象兜底（合成 layout 如 coordinate / scope.id）。
   */
  shapeParams?: IRJsonObject;
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
  /** 节点背景填充（纯色 / PaintSpec gradient），emit 时经 resolveFill → PaintValue、'transparent' 兜底 */
  fill?: string | IRPaintSpec;
  /** 填充透明度 0~1 */
  fillOpacity?: number;
  /** 节点边框色，emit 时 'currentColor' 兜底 */
  stroke?: string;
  /** 描边透明度 0~1（TikZ `draw opacity`） */
  strokeOpacity?: number;
  /** 边框宽度，emit 时 1 兜底 */
  strokeWidth?: number;
  /** 描边 dash pattern，已把 dashed/dotted 预设解析为具体 pattern */
  dashPattern?: Array<number>;
  /** rectangle 圆角半径（非 rect shape 无效） */
  cornerRadius?: number;
  /** 文字颜色，emit 时 'currentColor' 兜底 */
  textColor?: string;
  /** 整节点透明度 0~1（同时挂 shape 与 text primitive） */
  opacity?: number;
  /**
   * 已解析的 label 列表
   * @description IR 层 `Node.label` 标准化：position 默认 'above'、distance 默认 DEFAULT_LABEL_DISTANCE、font 从 Node 继承
   */
  labels?: Array<NodeLabelLayout>;
  /** 节点默认连接面（来自 IR `node.boundary`；undefined = 'shape'）；path 端点 boundary 可覆盖 */
  boundary?: IRBoundary;
  /** provenance 元数据（来自 IR `node.meta`）；emit 时原样 stamp 到 node 的 top-level 图元，renderer 忽略 */
  meta?: IRJsonObject;
  /** 时间轴动画 tracks（来自 IR `node.animations`）；emit 时原样 stamp 到 node 的 top-level 图元，renderer 播放 / 降级 */
  animations?: Array<IRAnimationTrack>;
  /** 构建本 layout 的 shape 注册表引用——借用连接面（borrowed boundary）查表用 */
  shapes: Record<string, ShapeDefinition>;
};

/** 节点附属标签 layout（layoutNode 已合并默认值与样式继承） */
export type NodeLabelLayout = {
  text: string;
  /** 8 方向枚举或数字角度 */
  position: AtDirectionValue | number;
  /** 已应用默认值 */
  distance: number;
  textColor?: string;
  opacity?: number;
  fontSize: number;
  fontFamily?: string;
  fontWeight?: string | number;
  fontStyle?: 'normal' | 'italic' | 'oblique';
  /** label 文本自旋模式（none / radial / tangent / 数字角度）；缺省 = 不旋转 */
  rotate?: 'none' | 'radial' | 'tangent' | number;
  /** 自旋后若文字倒置则翻 180°；缺省 false */
  keepUpright?: boolean;
  /** label 文本测量宽度（pin leader 算 label 框近边用） */
  measuredWidth: number;
  /** pin：true = 默认引线；对象 = 带样式引线（stroke / strokeWidth / dashPattern）；缺省 / false = 无引线 */
  pin?: boolean | { stroke?: string; strokeWidth?: number; dashPattern?: Array<number> };
};

/** 把 Rect 各方向外扩 m（margin generic：所有 shape 都 w+2m, h+2m，由 boundaryPointOf 调用前膨胀） */
const inflateRect = (r: Rect, m: number): Rect =>
  m === 0
    ? r
    : { x: r.x, y: r.y, width: r.width + 2 * m, height: r.height + 2 * m, rotate: r.rotate };

/**
 * 视觉 rect 外扩 outerSep（margin）得到外边界 AABB
 * @description = `inflateRect(layout.rect, layout.margin)`，中心不变、四向各 +margin。border 类
 *   anchor（compass / 数字角度）解析与 bbox / viewBox / 布局占位都基于这层；视觉 emit / 裁剪 /
 *   形状专属 anchor / edgePoint / label 附着点仍读 `layout.rect`（不外扩）。单一派生量，不另存字段。
 *   （对齐 TikZ outer sep 语义。）
 */
export const outerRectOf = (layout: NodeLayout): Rect => inflateRect(layout.rect, layout.margin);

/**
 * 取节点 shape 在 toward 方向的附着点（path 端点贴边用）
 * @description 走连接面（boundary）对应的 def.boundaryPoint；margin > 0 时先膨胀外接 Rect，让 path 在 border 外停 margin。
 *   boundary 缺省 = 'shape'（视觉形状自身），与改前行为一致。
 */
export const boundaryPointOf = (
  layout: NodeLayout,
  toward: Position,
  boundary: IRBoundary | undefined = 'shape',
): Position => {
  const { def, rect, params } = resolveBoundary(
    boundary,
    layout.shapeDef,
    layout.rect,
    layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
    layout.shapes,
  );
  return def.boundaryPoint(inflateRect(rect, layout.margin), toward, params);
};

/**
 * 取节点 shape 命名 anchor（center / north / east / north-east 等）
 * @description 纯几何：在传入的 `layout.rect` 上求点，本体**不施加 outerSep（margin）**。outerSep 的
 *   「border 外推」由调用方决定——`anchor-cache.ts` 的 compass 解析先把 rect 外扩 margin（`outerRectOf`）
 *   再调本函数；`labelBorderPoint` 喂视觉 rect（label 附着点不含 margin）。这样 outer sep 只作用于
 *   path / position 的 anchor 引用，不波及 label。
 *   compass（9 个 rect 方位名）：默认连接面先走视觉 shape 自身 compass（ellipse/circle 落真实周长、polygon/rect 落 AABB，与 TikZ 一致），shape 未实现则回退 AABB 矩形；显式 boundary 按其解析。
 *   形状专属命名 anchor（tip-N / apex 等非 compass 名）恒走视觉形状自身，boundary 不影响。
 *   boundary 缺省 = 'shape'。
 */
export const anchorOf = (
  layout: NodeLayout,
  name: string,
  boundary: IRBoundary | undefined = 'shape',
): Position => {
  const compassAnchor = normalizeCompassAnchor(name);
  if (compassAnchor !== undefined) {
    // compass 方位名：默认连接面（'shape'）先走视觉 shape 自身 compass——ellipse/circle 落真实周长、
    // rectangle/polygon 落 AABB（与 TikZ 一致）；shape 未实现 compass（star/sector/arc 返回 undefined）
    // 回退外接 AABB 矩形。显式 boundary 指定时按该连接面解析。
    if (boundary === 'shape') {
      const own = layout.shapeDef.anchor(
        layout.rect,
        compassAnchor,
        layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
      );
      if (own !== undefined) return own;
      const fallback = resolveBoundary(
        'rectangle',
        layout.shapeDef,
        layout.rect,
        layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
        layout.shapes,
      );
      const p = fallback.def.anchor(fallback.rect, compassAnchor, fallback.params);
      if (p === undefined) throw new Error(`Unknown anchor '${name}' for shape '${layout.shapeName}'`);
      return p;
    }
    const { def, rect, params } = resolveBoundary(
      boundary,
      layout.shapeDef,
      layout.rect,
      layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
      layout.shapes,
    );
    const p = def.anchor(rect, compassAnchor, params);
    if (p === undefined) throw new Error(`Unknown anchor '${name}' for shape '${layout.shapeName}'`);
    return p;
  }
  // 形状专属命名 anchor（tip-N / outer-arc-mid / apex 等）：恒走视觉形状，boundary 不影响
  const p = layout.shapeDef.anchor(layout.rect, name, layout.shapeParams ?? EMPTY_SHAPE_PARAMS);
  if (p === undefined) {
    throw new Error(`Unknown anchor '${name}' for shape '${layout.shapeName}'`);
  }
  return p;
};

/**
 * 算 label 中心点（节点局部坐标系，未旋转）
 * @description 8 方向：节点对应 anchor 出发按单位向量 × distance 外推；数字角度：先取 angleBoundary 边界点再沿 (cos,sin) × distance 外推。
 *   两个分支都在 **axis-aligned rect（rotate=0）** 上算——node 自身 rotate 由外层 GroupPrim 统一施加；
 *   若用带 rotate 的 rect，label 位置会被 anchorOf / angleBoundaryOf 旋转一次、再被外层 group 旋转一次（双重旋转）。
 *   anchorOf / angleBoundaryOf 本身不改（path anchor `'A.north'` / `'A.30'` 仍需带 rotate 的 rect）。
 */
/** label 在 node 边界上的附着点（未旋转局部系；pin 引线起点 = 此点） */
const labelBorderPoint = (layout: NodeLayout, label: NodeLabelLayout): Position => {
  const aaLayout: NodeLayout = { ...layout, rect: { ...layout.rect, rotate: 0 } };
  if (typeof label.position === 'number') {
    return angleBoundaryOf(aaLayout, label.position);
  }
  return anchorOf(aaLayout, LabelAnchorByAtDirection[label.position]);
};

const labelCenter = (layout: NodeLayout, label: NodeLabelLayout): Position => {
  const [bx, by] = labelBorderPoint(layout, label);
  if (typeof label.position === 'number') {
    return arcEndPoint([bx, by], label.distance, label.position);
  }
  const vec = DirectionVectorByAtDirection[label.position];
  return [bx + vec[0] * label.distance, by + vec[1] * label.distance];
};

/** 从 label 中心朝 border 方向，求 label 框（halfW×halfH）边界交点（pin 引线终点 = label 框近 node 边） */
const labelBoxEdgeToward = (
  center: Position,
  border: Position,
  halfW: number,
  halfH: number,
): Position => {
  const dx = border[0] - center[0];
  const dy = border[1] - center[1];
  const len = Math.hypot(dx, dy);
  if (len < 1e-9) return center;
  const ux = dx / len;
  const uy = dy / len;
  const sx = Math.abs(ux) > 1e-9 ? halfW / Math.abs(ux) : Number.POSITIVE_INFINITY;
  const sy = Math.abs(uy) > 1e-9 ? halfH / Math.abs(uy) : Number.POSITIVE_INFINITY;
  const s = Math.min(sx, sy, len); // 不越过 border 本身
  return [center[0] + ux * s, center[1] + uy * s];
};

/** 角度换算常量（弧度 → 度） */
const RAD_TO_DEG = 180 / Math.PI;

/**
 * 算 label 文本自旋角度（度，屏幕 y-down，节点局部系）
 * @description radial = atan2(label中心 − node中心)；tangent = radial + 90；number = 原值；none / 缺省 = 0。
 *   keepUpright 时把"偏离正立 > 90°"的角度翻 180° 保阅读方向。方向向量在局部坐标算，node 自身 rotate 由外层 group 叠加。
 */
const resolveLabelRotateDeg = (
  label: NodeLabelLayout,
  lx: number,
  ly: number,
  cx: number,
  cy: number,
): number => {
  const mode = label.rotate;
  if (mode === undefined || mode === 'none') return 0;
  let deg: number;
  if (typeof mode === 'number') {
    deg = mode;
  } else {
    const radial = Math.atan2(ly - cy, lx - cx) * RAD_TO_DEG;
    deg = mode === 'tangent' ? radial + 90 : radial;
  }
  if (label.keepUpright) {
    const norm = ((deg % 360) + 360) % 360;
    if (norm > 90 && norm < 270) deg += 180;
  }
  return deg;
};

/**
 * 取节点 shape 在指定角度方向的边界点
 * @description 角度是节点**局部坐标系**下的极角（度数：0°=局部 +x，90°=局部 +y）。layout.rect.rotate 把局部基绕中心旋转，得到世界系下的视觉方向；shape boundaryPoint 内部用 rotate-aware 投影，所以这里把局部 (cos, sin) 经 rect.rotate 旋转后加到中心当作世界系 toward 传入。本体**不施加 margin（同 anchorOf）**——outerSep 外推由 `anchor-cache.ts` 调用方喂 `outerRectOf` 实现；用于 `'A.30'` 落点。
 *   boundary 缺省 = 'shape'（视觉形状自身）。
 */
export const angleBoundaryOf = (
  layout: NodeLayout,
  angleDeg: number,
  boundary: IRBoundary | undefined = 'shape',
): Position => {
  const rad = (angleDeg * Math.PI) / 180;
  const lx = Math.cos(rad);
  const ly = Math.sin(rad);
  const rot = layout.rect.rotate ?? 0;
  const cosR = Math.cos(rot);
  const sinR = Math.sin(rot);
  // 局部 (lx, ly) → 世界方向 (lx*cos - ly*sin, lx*sin + ly*cos)；toward 距离任意，boundaryPoint 只用方向
  const toward: Position = [
    layout.rect.x + lx * cosR - ly * sinR,
    layout.rect.y + lx * sinR + ly * cosR,
  ];
  const { def, rect, params } = resolveBoundary(
    boundary,
    layout.shapeDef,
    layout.rect,
    layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
    layout.shapes,
  );
  return def.boundaryPoint(rect, toward, params);
};

/**
 * IR Node → 内部 NodeLayout
 * @description 文本度量 + padding 推内框半轴；按 shape 算外接边界（circle 取半对角线、ellipse ×√2、diamond ×2）；解析 position 为几何中心；rotate 度数转弧度。
 *   `scopeChain` 非空时 `resolvePosition` 返回**当前 scope 局部坐标**（relative position 在当前
 *   scope 局部度量），调用方负责后续 `projectLayoutToGlobal` / `applyTransformChain` 投回全局；
 *   笛卡尔字面量 `Position` 已在 scope 局部度量，保持局部坐标语义。
 */
export const layoutNode = (
  node: IRNode,
  measureText: TextMeasurer,
  nameStack: NameStack,
  nodeDistance?: number,
  scopeChain: ReadonlyArray<Transform> = [],
  labelDefault?: IRLabelDefault,
  shapes: Record<string, ShapeDefinition> = BUILTIN_SHAPES,
  resolveBetweenGlobal?: ResolveBetweenGlobal,
): NodeLayout => {
  // shape 解析（入口 fail-fast）：裸 string → { type, params:{} }，对象原样；按 type 查表，未注册抛错列出可用名
  const { type: shapeName, params: rawShapeParams } = normalizeShape(node.shape);
  // own-property 校验：既得到 `ShapeDefinition | undefined` 类型（让未注册分支成立），又避开
  // `'toString'` 等原型链 key 被 Record 索引误命中（开放字符串 shape 名的边界安全）
  const shapeDef = Object.prototype.hasOwnProperty.call(shapes, shapeName)
    ? shapes[shapeName]
    : undefined;
  if (!shapeDef) {
    throw new Error(
      `Unknown shape '${shapeName}'; registered shapes: ${Object.keys(shapes).sort().join(', ')}`,
    );
  }
  // 双护栏（抄 path generator）：① paramsSchema.parse 校验形状字段；② JsonObjectSchema.parse 守 JSON-safe。
  // JSON-safe 这道跑在**原始 params** 上——宽松 schema（如 `z.object({}).passthrough()`）会在 parse 时
  // 静默剥掉 `undefined` 值的键，若只校验其输出就漏过非 JSON 输入；校验原始入参才能稳拦 function / undefined。
  // 字段形态仍以 paramsSchema 输出为准，透传给 circumscribe / boundaryPoint / anchor / emit。
  JsonObjectSchema.parse(rawShapeParams);
  const parsedShapeParams: IRJsonObject = shapeDef.paramsSchema.parse(rawShapeParams);

  // 顶层 Node.cornerRadius 是 rectangle-only 迁移语义：仅对默认 / rectangle 形状、且 params 未显式给
  // cornerRadius 时合进 params，使 emit 与 boundary（都读 params.cornerRadius）一致；params 显式给则优先。
  // 其余形状（polygon / star / sector）只认自身 params，不受顶层影响，避免 boundary 圆而 emit 不圆。
  const mergedShapeParams: IRJsonObject =
    shapeName === 'rectangle' &&
    node.cornerRadius !== undefined &&
    !('cornerRadius' in parsedShapeParams)
      ? { ...parsedShapeParams, cornerRadius: node.cornerRadius }
      : parsedShapeParams;

  // 缩放：xScale/yScale 优先于 scale 别名，默认 1；乘进所有尺寸让 path 贴缩放后边界。
  // 字号取 min(sx,sy) 保 glyph 形状，避免非均匀缩放下文字被拉变形。
  const sx = node.xScale ?? node.scale ?? 1;
  const sy = node.yScale ?? node.scale ?? 1;
  const fontScale = Math.min(sx, sy);
  // shape params 是形状内在长度（半径 / 内外径 等），随 node scale 协同缩放。
  // shapeDef.scaleParams 给定时由形状自定缩放语义（如 sector / arc 只缩半径、不缩角度）；
  // 缺省时沿用默认——用 uniform 因子（sx·sy 的几何均值；均匀缩放时即 scale）乘所有 JSON 数值叶子。
  const shapeScale = Math.sqrt(sx * sy);
  const noScale = sx === 1 && sy === 1;
  const shapeParams: IRJsonObject = noScale
    ? mergedShapeParams
    : shapeDef.scaleParams
      ? shapeDef.scaleParams(mergedShapeParams, sx, sy)
      : scaleJsonNumbers(mergedShapeParams, shapeScale);

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

  // 折行阈值（user units，受 x 缩放）；未给 = 不折行
  const maxTextWidth = node.maxTextWidth !== undefined ? node.maxTextWidth * sx : undefined;
  // 每行解析覆盖样式 + 度量；maxTextWidth 给定时按词 / 字贪心折行（折出物理行继承该逻辑行样式）
  let textWidth = 0;
  let textHeight = 0;
  let lines: Array<TextLine> | undefined;
  if (rawLines) {
    lines = [];
    for (const spec of rawLines) {
      const isObj = typeof spec !== 'string';
      const text = isObj ? spec.text : spec;
      // 行级 font 与块级合并：行级优先，没有走块级（透传 undefined）
      const lineFont = isObj ? spec.font : undefined;
      const font: FontSpec = {
        size: lineFont?.size !== undefined ? lineFont.size * fontScale : fontSize,
        family: lineFont?.family ?? fontFamily,
        weight: lineFont?.weight ?? fontWeight,
        style: lineFont?.style ?? fontStyle,
      };
      // '\n' 是硬换行：先把本逻辑行里的 '\n' 拆成多行（对齐 react children 拆行与直写 IR），
      // 硬拆出的物理行继承本逻辑行样式，再各自按 maxTextWidth 折行
      const hardLines = text.split('\n');
      const physical = hardLines.flatMap(hardLine =>
        maxTextWidth !== undefined ? wrapText(hardLine, font, maxTextWidth, measureText) : [hardLine],
      );
      for (const ptext of physical) {
        const m = measureText(ptext, font);
        if (m.width > textWidth) textWidth = m.width;
        const out: TextLine = { text: ptext };
        // 行级与块级不同时才写出（精简 emit JSON，明确下游 fallback）
        if (isObj) {
          if (spec.fill !== undefined) out.fill = spec.fill;
          if (spec.opacity !== undefined) out.opacity = spec.opacity;
          if (lineFont?.size !== undefined) out.fontSize = lineFont.size * fontScale;
          if (lineFont?.family !== undefined) out.fontFamily = lineFont.family;
          if (lineFont?.weight !== undefined) out.fontWeight = lineFont.weight;
          if (lineFont?.style !== undefined) out.fontStyle = lineFont.style;
        }
        lines.push(out);
      }
    }
    textHeight = lines.length * lineHeight;
  }

  // 内框半轴：text 半宽 + sep（保证至少 sep 大小，空文本节点也有最小尺寸）。minimum 不进内框——见下方对外接框 floor。
  const innerHalfW = Math.max(textWidth / 2 + xSep, xSep);
  const innerHalfH = Math.max(textHeight / 2 + ySep, ySep);

  // 外接边界（bounding rect）半轴：内框半轴经 shape.circumscribe 派生
  const circumscribed = shapeDef.circumscribe(innerHalfW, innerHalfH, shapeParams);

  // minimum 尺寸（TikZ 语义）：floor 外接框（bounding box）而非内框，且随 scale 缩（与 sep / text / fontSize 同口径，
  // minimumWidth→sx、minimumHeight→sy）。minimumWidth/Height 覆盖 minimumSize（对称别名）。inner-driven shape
  // （rectangle/ellipse/polygon）emit 按 floor 后的 rect 重建、恰好填满；params-radius-driven shape（sector/star/arc）
  // glyph 由半径定、minimum 仅预留 bbox 空间不缩放 glyph。
  const minHalfW = ((node.minimumWidth ?? node.minimumSize ?? 0) * sx) / 2;
  const minHalfH = ((node.minimumHeight ?? node.minimumSize ?? 0) * sy) / 2;
  const boundsHalfW = Math.max(circumscribed.halfWidth, minHalfW);
  const boundsHalfH = Math.max(circumscribed.halfHeight, minHalfH);

  const rotateDeg = node.rotate ?? 0;
  const center = resolvePosition(node.position, nameStack, nodeDistance, scopeChain, resolveBetweenGlobal);
  if (!center) {
    throw new Error(
      `Cannot resolve position for node ${node.id ?? '(unnamed)'}; polar.origin / at.of / between endpoint may reference an undefined node`,
    );
  }
  // shape 可声明 AABB 中心相对 position 的偏移（如 sector：position=圆心 apex，AABB 中心偏在一侧）；
  // rect 中心 = position + 偏移，使 bbox 罩住完整形状、anchor 以 AABB 中心 rect 计算时 apex 落回 position。
  const aabbOffset = shapeDef.circumscribeOffset?.(shapeParams);
  const rectCenterX = center[0] + (aabbOffset?.[0] ?? 0);
  const rectCenterY = center[1] + (aabbOffset?.[1] ?? 0);
  // 标准化 label：单对象 → 单元素数组；继承 Node 的 font/textColor
  const rawLabels: Array<IRNodeLabel> | undefined =
    node.label === undefined
      ? undefined
      : Array.isArray(node.label)
        ? node.label
        : [node.label];
  const labels: Array<NodeLabelLayout> | undefined = rawLabels?.map(lab => {
    const labFont = lab.font;
    const labFontSize = (labFont?.size ?? labelDefault?.font?.size ?? baseFontSize) * fontScale;
    const labFamily = labFont?.family ?? labelDefault?.font?.family ?? fontFamily;
    const labWeight = labFont?.weight ?? labelDefault?.font?.weight ?? fontWeight;
    const labStyle = labFont?.style ?? labelDefault?.font?.style ?? fontStyle;
    return {
      text: lab.text,
      position: lab.position ?? 'above',
      distance: lab.distance ?? DEFAULT_LABEL_DISTANCE,
      // 继承顺序：label 显式 > scope.labelDefault (textColor → color) > 宿主 node 主色（已解析进 node.textColor） > currentColor
      textColor: lab.textColor ?? labelDefault?.textColor ?? labelDefault?.color ?? node.textColor,
      opacity: lab.opacity ?? labelDefault?.opacity,
      fontSize: labFontSize,
      fontFamily: labFamily,
      fontWeight: labWeight,
      fontStyle: labStyle,
      rotate: lab.rotate,
      keepUpright: lab.keepUpright,
      measuredWidth: measureText(lab.text, {
        size: labFontSize,
        family: labFamily,
        weight: labWeight,
        style: labStyle,
      }).width,
      pin: lab.pin,
    };
  });

  return {
    id: node.id,
    shapeName,
    shapeDef,
    shapeParams,
    rect: {
      // x, y 是外接 AABB 几何中心（= position + shape circumscribeOffset）
      x: rectCenterX,
      y: rectCenterY,
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
    dashPattern: resolveDashPattern(node.dashPattern, node.dashed, node.dotted),
    cornerRadius: node.cornerRadius,
    textColor: node.textColor,
    opacity: node.opacity,
    labels,
    boundary: node.boundary,
    meta: node.meta,
    animations: node.animations,
    shapes,
  };
};

/** 从 NodeLayout 收敛 emit 所需的视觉样式子集（ShapeStyle，不含几何 / 文本）；fill 经 resolveFill 转 PaintValue */
const toShapeStyle = (layout: NodeLayout, resolveFill: PaintResolver): ShapeStyle => ({
  fill: resolveFill(layout.fill),
  fillOpacity: layout.fillOpacity,
  stroke: layout.stroke,
  strokeOpacity: layout.strokeOpacity,
  strokeWidth: layout.strokeWidth,
  dashPattern: layout.dashPattern,
  cornerRadius: layout.cornerRadius,
  opacity: layout.opacity,
});

/**
 * NodeLayout → Scene primitives
 * @description shape 主体走 `shapeDef.emit`（收轴对齐 rect、可出多 primitive）；text 始终走 TextPrim；
 *   有旋转时外层 GroupPrim 用 `rotate(deg cx cy)` 统一包裹 shape + text（diamond 顶点 / text 都靠 group 旋转）
 */
/**
 * 节点 label 的外接点（供顶层 bbox / viewBox 计算，让 label 不被裁——与 step.label 进 bbox 一致）
 * @description 每个 label 取其文本框四角；label 中心走 labelCenter（轴对齐系），node 自身 rotate 时绕 node 中心旋转
 *   （与 emit 的 group rotate 同步）。pin 引线起点在 node 边界内、已被 node 四角覆盖，无需额外。
 */
export const labelExtentPoints = (layout: NodeLayout): Array<Position> => {
  if (!layout.labels || layout.labels.length === 0) return [];
  const cx = layout.rect.x;
  const cy = layout.rect.y;
  const rad = (layout.rotateDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const pts: Array<Position> = [];
  for (const lab of layout.labels) {
    const [lx, ly] = labelCenter(layout, lab);
    const halfW = lab.measuredWidth / 2;
    const halfH = lab.fontSize / 2;
    const corners: Array<Position> = [
      [lx - halfW, ly - halfH],
      [lx + halfW, ly - halfH],
      [lx - halfW, ly + halfH],
      [lx + halfW, ly + halfH],
    ];
    for (const [px, py] of corners) {
      if (layout.rotateDeg === 0) {
        pts.push([px, py]);
      } else {
        const dx = px - cx;
        const dy = py - cy;
        pts.push([cx + dx * cos - dy * sin, cy + dx * sin + dy * cos]);
      }
    }
  }
  return pts;
};

const cloneScenePrimitive = <T extends ScenePrimitive>(primitive: T): T => ({ ...primitive });

export const emitNodePrimitives = (
  layout: NodeLayout,
  round: (n: number) => number,
  resolveFill: PaintResolver,
): Array<ScenePrimitive> => {
  // shape 主体：emit 收**轴对齐 rect（rotate=0）**，rotate 由末端外层 GroupPrim 统一施加
  const axisAlignedRect: Rect = { ...layout.rect, rotate: 0 };
  const shapePrims: Array<ScenePrimitive> = [
    ...layout.shapeDef.emit(
      axisAlignedRect,
      toShapeStyle(layout, resolveFill),
      round,
      layout.shapeParams ?? EMPTY_SHAPE_PARAMS,
    ),
  ].map(cloneScenePrimitive);
  const inner: Array<ScenePrimitive> = [...shapePrims];
  if (layout.lines) {
    // align=start: x=中心-块半宽; align=end: x=中心+块半宽; align=middle: x=中心
    const halfBlockW = layout.textWidth / 2;
    const xOffset =
      layout.align === 'start' ? -halfBlockW : layout.align === 'end' ? halfBlockW : 0;
    const lineHeight = round(layout.lineHeight);
    inner.push({
      type: 'text',
      x: round(layout.rect.x + xOffset),
      y: round(
        toAlphabeticBaselineY(layout.rect.y, 'middle', layout.lines.length, lineHeight, layout.fontSize),
      ),
      lines: layout.lines,
      fontSize: layout.fontSize,
      fontFamily: layout.fontFamily,
      fontWeight: layout.fontWeight,
      fontStyle: layout.fontStyle,
      align: layout.align,
      baseline: 'alphabetic',
      lineHeight,
      fill: layout.textColor ?? 'currentColor',
      opacity: layout.opacity,
      measuredWidth: round(layout.textWidth),
      measuredHeight: round(layout.textHeight),
    });
  }
  // 每个 label 一个 TextPrim，放在 inner 同组 → 跟 node 旋转一致；rotate 时再包一层绕 label 自身中心的 group
  if (layout.labels) {
    const cx = layout.rect.x;
    const cy = layout.rect.y;
    for (const lab of layout.labels) {
      const [lx, ly] = labelCenter(layout, lab);
      // pin：true 或样式对象都画引线；false / 缺省跳过。从 node 边界画到 label 框近 node 边（textPrim 前 push → 线在文字下层）
      if (lab.pin) {
        const style = typeof lab.pin === 'object' ? lab.pin : undefined;
        const [bx, by] = labelBorderPoint(layout, lab);
        const pad = 2;
        const [nx, ny] = labelBoxEdgeToward(
          [lx, ly],
          [bx, by],
          lab.measuredWidth / 2 + pad,
          lab.fontSize / 2 + pad,
        );
        inner.push({
          type: 'path',
          commands: [
            { kind: 'move', to: [round(bx), round(by)] },
            { kind: 'line', to: [round(nx), round(ny)] },
          ],
          stroke: style?.stroke ?? lab.textColor ?? 'currentColor',
          strokeWidth: style?.strokeWidth ?? 1,
          dashPattern: style?.dashPattern,
          opacity: lab.opacity ?? layout.opacity,
        });
      }
      const labLineHeight = round(lab.fontSize * DEFAULT_LINE_HEIGHT_FACTOR);
      const textPrim: ScenePrimitive = {
        type: 'text',
        x: round(lx),
        y: round(toAlphabeticBaselineY(ly, 'middle', 1, labLineHeight, lab.fontSize)),
        lines: [{ text: lab.text }],
        fontSize: lab.fontSize,
        fontFamily: lab.fontFamily,
        fontWeight: lab.fontWeight,
        fontStyle: lab.fontStyle,
        align: 'middle',
        baseline: 'alphabetic',
        lineHeight: labLineHeight,
        fill: lab.textColor ?? 'currentColor',
        opacity: lab.opacity ?? layout.opacity,
        measuredWidth: round(lab.measuredWidth),
        measuredHeight: round(lab.fontSize),
      };
      const deg = resolveLabelRotateDeg(lab, lx, ly, cx, cy);
      if (deg === 0) {
        inner.push(textPrim);
      } else {
        // 绕 label 自身中心自旋——位置仍由 position / distance 决定，rotate 只改朝向
        inner.push({
          type: 'group',
          transforms: [{ kind: 'rotate', degrees: round(deg), cx: round(lx), cy: round(ly) }],
          children: [textPrim],
        });
      }
    }
  }
  // 带文本（layout.lines 非空）或有旋转的 Node 包进单层 GroupPrim：给"语义化节点"一个稳定 DOM /
  // stacking 单位边界；纯几何装饰 Node 维持平铺、零额外 DOM 层。无旋转时 group 不带 transforms。
  const needsGroup = layout.rotateDeg !== 0 || layout.lines !== undefined;
  if (!needsGroup) {
    // 纯几何 Node（不包 group）：把 user id stamp 到每个平铺 shape 图元（多 shape emit 时共享同一 id）；
    // label / pin 等附属图元不 stamp。无 user id 时保持 undefined。
    if (layout.id !== undefined) {
      for (const prim of shapePrims) prim.id = layout.id;
    }
    // meta provenance 与 id 同款：原样复制到每个平铺 shape 图元（label / pin 不 stamp）
    if (layout.meta !== undefined) {
      for (const prim of shapePrims) prim.meta = layout.meta;
    }
    // animations 与 meta 同款：原样复制到每个平铺 shape 图元（transform/opacity 复制后视觉等价于动 group）
    if (layout.animations !== undefined) {
      for (const prim of shapePrims) prim.animations = layout.animations;
    }
    return inner;
  }
  // 带文本 / rotate Node：user id 落到单层 GroupPrim（top-level emit 图元），子图元不重复 stamp。
  const group: GroupPrim = { type: 'group', children: inner };
  if (layout.id !== undefined) group.id = layout.id;
  if (layout.meta !== undefined) group.meta = layout.meta;
  if (layout.animations !== undefined) group.animations = layout.animations;
  if (layout.rotateDeg !== 0) {
    group.transforms = [
      {
        kind: 'rotate',
        degrees: round(layout.rotateDeg),
        cx: round(layout.rect.x),
        cy: round(layout.rect.y),
      },
    ];
  }
  return [group];
};
