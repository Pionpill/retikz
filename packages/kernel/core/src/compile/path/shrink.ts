import { arcEndPoint, ellipseArcPoint } from '@retikz/math';

import type {
  ArrowDefinition,
  ArrowEmitContext,
  MarkerFill,
  MarkerPrimitive,
  PathCommand,
  ResolvedArrowEndSpec,
} from '../../contract';
import type { IRArrowMark, IRPosition } from '../../schemas';

import { providerDefinitionOf } from '../../providers/registry';
import { ARROW_MARKER_DEFAULT_SIZE, ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH, DEFAULT_ARROW_SHAPE } from '../../schemas';
import { validateMarkerPrimitives } from '../resource';
import { shiftToward } from './anchor';

/** 已解析 arrow registry：内置 8 + 注入 */
export type ResolvedArrowRegistry = ReadonlyMap<string, ArrowDefinition>;

/** marker 局部基准边长。 */
const ARROW_GEOMETRY_BASE_SIZE = 10;

/** compile 内部使用的箭头视觉输入。 */
type ResolvedArrowVisual = {
  shape: string;
  /**
   * 箭头缩放倍率。
   * @default 1
   */
  scale?: number;
  /**
   * 箭头长度。
   * @default def.defaultLength ?? ARROW_MARKER_DEFAULT_SIZE (fallback 6)
   */
  length?: number;
  /**
   * 箭头宽度。
   * @default def.defaultWidth ?? ARROW_MARKER_DEFAULT_SIZE (fallback 6)
   */
  width?: number;
  /**
   * 箭头主色。
   * @default 继承 `contextStroke`
   */
  color?: string;
  /**
   * 实心箭头填充色。
   * @default color ?? contextStroke
   */
  fill?: string;
  /**
   * marker 元素不透明度。
   * @default 继承 `path.opacity`
   */
  opacity?: number;
  /**
   * 空心箭头局部描边宽度。
   * @default ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH (1.5)
   */
  lineWidth?: number;
};

/** 查 resolved registry 取 def；未注册名编译期 throw（消息含字母序可用名列表） */
const lookupArrowDef = (shape: string, registry: ResolvedArrowRegistry): ArrowDefinition =>
  providerDefinitionOf(registry, shape, { capability: 'arrow shape', optionName: 'arrows' });

/** 解析端点箭头的视觉输入。 */
const resolveArrowMarkVisual = (mark: IRArrowMark, registry: ResolvedArrowRegistry): ResolvedArrowVisual => {
  const baseShape = mark.shape ?? DEFAULT_ARROW_SHAPE;
  const out: ResolvedArrowVisual = { shape: baseShape };
  if (mark.scale !== undefined) out.scale = mark.scale;
  if (mark.length !== undefined) out.length = mark.length;
  if (mark.width !== undefined) out.width = mark.width;
  if (mark.color !== undefined) out.color = mark.color;
  if (mark.opacity !== undefined) out.opacity = mark.opacity;
  if (mark.lineWidth !== undefined) out.lineWidth = mark.lineWidth;
  const def = lookupArrowDef(baseShape, registry);
  if (!def.hollow && mark.fill !== undefined) out.fill = mark.fill;
  return out;
};

/** 校验 arrow definition 的几何字段有效。 */
const assertFiniteGeometry = (shape: string, def: ArrowDefinition): void => {
  if (!Number.isFinite(def.lineContactX)) {
    throw new Error(
      `Arrow '${shape}' has a non-finite lineContactX (${String(def.lineContactX)}); it must be a finite number.`,
    );
  }
  if (def.baseSize !== undefined && (!Number.isFinite(def.baseSize) || def.baseSize <= 0)) {
    throw new Error(
      `Arrow '${shape}' has an invalid baseSize (${String(def.baseSize)}); it must be a finite number greater than 0.`,
    );
  }
  if (def.tipX !== undefined && !Number.isFinite(def.tipX)) {
    throw new Error(`Arrow '${shape}' has a non-finite tipX (${String(def.tipX)}); it must be a finite number.`);
  }
  if (def.outerInset !== undefined && !Number.isFinite(def.outerInset)) {
    throw new Error(
      `Arrow '${shape}' has a non-finite outerInset (${String(def.outerInset)}); it must be a finite number.`,
    );
  }
};

/** 调用 arrow emit，并校验 marker 产物。 */
const emitArrowMarkerPrimitives = (shape: string, def: ArrowDefinition, ctx: ArrowEmitContext): Array<MarkerPrimitive> => {
  if (typeof def.emit !== 'function') {
    throw new Error(`Arrow '${shape}' is missing an emit function (ArrowDefinition.emit is required).`);
  }
  let marker: Array<MarkerPrimitive>;
  try {
    marker = [...def.emit(ctx)];
  } catch (e) {
    throw new Error(`Arrow '${shape}' emit failed: ${e instanceof Error ? e.message : String(e)}`, {
      cause: e,
    });
  }
  validateMarkerPrimitives(`Arrow '${shape}'`, marker);
  return marker;
};

/** 解析 def + 视觉输入后的端点几何（shrink / wrapper 共用） */
type ResolvedArrowGeometry = {
  def: ArrowDefinition;
  baseSize: number;
  tipX: number;
  /** 实际线接触点（hollow 已减 lineWidth/2）；shrink + refX 共用 */
  contactX: number;
  /** 局部坐标描边粗细（hollow 用） */
  lineWidth: number;
  /** 已解析尖长 = (length ?? defaultLength) × scale */
  resolvedLength: number;
  /** 已解析尖宽 = (width ?? defaultWidth) × scale */
  resolvedWidth: number;
  /** 节点边界端点需要额外内缩的距离，单位为描边前的 user units。 */
  boundaryOuterInset: number;
};

/** 据 def + 视觉输入解析端点几何（baseSize / tipX / contactX / resolved length·width） */
const resolveGeometry = (visual: ResolvedArrowVisual, registry: ResolvedArrowRegistry): ResolvedArrowGeometry => {
  const def = lookupArrowDef(visual.shape, registry);
  assertFiniteGeometry(visual.shape, def);
  const baseSize = def.baseSize ?? ARROW_GEOMETRY_BASE_SIZE;
  const tipX = def.tipX ?? baseSize;
  const lineWidth = visual.lineWidth ?? ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH;
  const contactX = def.hollow ? def.lineContactX - lineWidth / 2 : def.lineContactX;
  const scale = visual.scale ?? 1;
  const resolvedLength = (visual.length ?? def.defaultLength ?? ARROW_MARKER_DEFAULT_SIZE) * scale;
  const resolvedWidth = (visual.width ?? def.defaultWidth ?? ARROW_MARKER_DEFAULT_SIZE) * scale;
  const rawOuterInset = def.outerInset ?? (def.hollow ? lineWidth / 2 : 0);
  const boundaryOuterInset = (rawOuterInset * resolvedLength) / baseSize;
  // length / width 与 scale 各自 finite，但乘积可能溢出成 Infinity（如 1e308 × 10）；非 finite 会污染 marker
  // 尺寸 + path shrink + layout，故在此抛清晰错（含 shape 名），不放任非 finite 流入 Scene
  if (!Number.isFinite(resolvedLength) || !Number.isFinite(resolvedWidth)) {
    throw new Error(
      `Arrow '${visual.shape}' resolved length/width is non-finite (length × scale overflowed); use smaller length / scale values.`,
    );
  }
  if (!Number.isFinite(boundaryOuterInset)) {
    throw new Error(
      `Arrow '${visual.shape}' resolved outerInset is non-finite; use smaller outerInset / length / scale values.`,
    );
  }
  return { def, baseSize, tipX, contactX, lineWidth, resolvedLength, resolvedWidth, boundaryOuterInset };
};

/** 计算端点箭头需要的 path 收缩量。 */
const computeShrink = (geometry: ResolvedArrowGeometry): number =>
  ((geometry.tipX - geometry.contactX) * geometry.resolvedLength) / geometry.baseSize;

/** 构造 ArrowDefinition.emit 的上下文。 */
const buildEmitContext = (
  visual: ResolvedArrowVisual,
  geometry: ResolvedArrowGeometry,
  round: (n: number) => number,
): ArrowEmitContext => {
  const contextStroke: MarkerFill = { kind: 'contextStroke' };
  const stroke: MarkerFill = visual.color ?? contextStroke;
  const fill: MarkerFill = geometry.def.hollow ? contextStroke : (visual.fill ?? visual.color ?? contextStroke);
  return { stroke, fill, lineWidth: geometry.lineWidth, round };
};

/** 把箭头视觉输入物化为 Scene 端点箭头描述。 */
const emitArrowEndSpec = (
  visual: ResolvedArrowVisual,
  geometry: ResolvedArrowGeometry,
  round: (n: number) => number,
): ResolvedArrowEndSpec => {
  const ctx = buildEmitContext(visual, geometry, round);
  const marker = emitArrowMarkerPrimitives(visual.shape, geometry.def, ctx);
  const out: ResolvedArrowEndSpec = {
    shape: visual.shape,
    baseSize: geometry.baseSize,
    refX: geometry.contactX,
    markerWidth: geometry.resolvedLength,
    markerHeight: geometry.resolvedWidth,
    marker,
  };
  if (visual.opacity !== undefined) out.opacity = visual.opacity;
  return out;
};

/** 已解析的端点箭头及对应 path 收缩量。 */
export type ResolvedEndpointArrowMark = {
  /** 已物化的 Scene 端点箭头描述。 */
  spec: ResolvedArrowEndSpec;
  /** path 本体需要向内收缩的距离（未乘 strokeWidth）。 */
  shrink: number;
  /** auto boundary 端点为了避开空心箭头外缘需要额外内缩的距离。 */
  boundaryOuterInset: number;
};

export const emitEndpointArrowMark = (
  mark: IRArrowMark,
  registry: ResolvedArrowRegistry,
  round: (n: number) => number,
): ResolvedEndpointArrowMark => {
  const visual = resolveArrowMarkVisual(mark, registry);
  const geometry = resolveGeometry(visual, registry);
  return {
    spec: emitArrowEndSpec(visual, geometry, round),
    shrink: computeShrink(geometry),
    boundaryOuterInset: geometry.boundaryOuterInset,
  };
};

/** 解析中段 arrow mark 为 marker 描述。 */
export const emitMarkArrowSpec = (
  mark: IRArrowMark,
  registry: ResolvedArrowRegistry,
  round: (n: number) => number,
): ResolvedArrowEndSpec => {
  const visual = resolveArrowMarkVisual(mark, registry);
  const geometry = resolveGeometry(visual, registry);
  return emitArrowEndSpec(visual, geometry, round);
};

/** 取一个 PathCommand 末端 endpoint（move/line/quad/cubic → to；arc/ellipseArc → polar(end)；close 无端点） */
const endpointOf = (cmd: PathCommand): IRPosition | null => {
  switch (cmd.kind) {
    case 'move':
    case 'line':
    case 'quad':
    case 'cubic':
      return [cmd.to[0], cmd.to[1]];
    case 'arc':
      return arcEndPoint(cmd.center, cmd.radius, cmd.endAngle);
    case 'ellipseArc':
      return ellipseArcPoint(cmd.center, cmd.radiusX, cmd.radiusY, cmd.endAngle);
    case 'close':
      return null;
  }
};

type SetEndpointInput = {
  commands: Array<PathCommand>;
  index: number;
  point: IRPosition;
  round: (n: number) => number;
};

/** 改写一个 PathCommand 的 endpoint（用于 shrink） */
const setEndpoint = ({ commands, index, point, round }: SetEndpointInput): void => {
  const cmd = commands[index];
  if (cmd.kind === 'close') return;
  const rp: [number, number] = [round(point[0]), round(point[1])];
  if (cmd.kind === 'move' || cmd.kind === 'line') {
    commands[index] = { ...cmd, to: rp };
  } else if (cmd.kind === 'quad') {
    commands[index] = { ...cmd, to: rp };
  } else if (cmd.kind === 'cubic') {
    commands[index] = { ...cmd, to: rp };
  }
  // arc / ellipseArc 不参与 shrink——首末段都是 line/cubic（path-arrow 的 path 形态）
};

/** 箭头收缩改写所需上下文。 */
export type ApplyArrowShrinksContext = {
  shrinkStart: number;
  shrinkEnd: number;
  strokeWidth: number;
  round: (n: number) => number;
};

/** 按箭头收缩量改写 path 首尾端点。 */
export const applyArrowShrinks = (
  commands: Array<PathCommand>,
  context: ApplyArrowShrinksContext,
): void => {
  const { shrinkStart, shrinkEnd, strokeWidth, round } = context;
  if (shrinkStart !== 0) {
    // 找首个 move 与其后第一个有 endpoint 的命令
    const firstIdx = commands.findIndex(o => o.kind === 'move');
    if (firstIdx >= 0) {
      const cur = commands[firstIdx];
      const nextIdx = commands.findIndex((o, idx) => idx > firstIdx && o.kind !== 'close');
      if (cur.kind === 'move' && nextIdx >= 0) {
        const nextPt = endpointOf(commands[nextIdx]);
        if (nextPt) {
          const shifted = shiftToward([cur.to[0], cur.to[1]], nextPt, shrinkStart * strokeWidth);
          setEndpoint({ commands, index: firstIdx, point: shifted, round });
        }
      }
    }
  }
  if (shrinkEnd !== 0) {
    // 末尾最后一个有 endpoint 的命令与其前最近的一个
    let lastIdx = -1;
    for (let i = commands.length - 1; i >= 0; i--) {
      if (commands[i].kind !== 'close') {
        lastIdx = i;
        break;
      }
    }
    if (lastIdx > 0) {
      let prevIdx = lastIdx - 1;
      while (prevIdx >= 0 && commands[prevIdx].kind === 'close') prevIdx--;
      if (prevIdx >= 0) {
        const curPt = endpointOf(commands[lastIdx]);
        const prevPt = endpointOf(commands[prevIdx]);
        if (curPt && prevPt) {
          const shifted = shiftToward(curPt, prevPt, shrinkEnd * strokeWidth);
          setEndpoint({ commands, index: lastIdx, point: shifted, round });
        }
      }
    }
  }
};
