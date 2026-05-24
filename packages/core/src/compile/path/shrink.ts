import {
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  DEFAULT_ARROW_SHAPE,
  type IRArrowDetail,
  type IRArrowEndDetail,
  type IRPosition,
} from '../../ir';
import type { ArrowDefinition, ArrowEmitContext } from '../../arrows';
import type { ArrowEndSpec, MarkerPrimitive, PaintValue, PathCommand } from '../../primitive';
import { shiftToward } from './anchor';

/** 有效 arrow 表：内置 7 + 注入（同名注入覆盖内置） */
export type EffectiveArrows = Record<string, ArrowDefinition>;

/** 默认 baseSize（marker 局部基准边长，viewBox `0 0 baseSize baseSize`） */
const ARROW_GEOMETRY_BASE_SIZE = 10;

/**
 * compile 内部中间体：把顶层默认 ⊕ end-side override merge 后的"视觉输入"集合
 * @description 仅 compile 解析阶段用——shrink 几何 + 调 def.emit 都读它；这些视觉输入字段（scale /
 *   length / width / color / fill / lineWidth）解析完即消费，**不**进最终 `ArrowEndSpec`（已解析 marker 描述）。
 *   这是 compile-internal 类型，不导出公开 API。
 */
type ResolvedArrowVisual = {
  shape: string;
  scale?: number;
  length?: number;
  width?: number;
  color?: string;
  fill?: string;
  opacity?: number;
  lineWidth?: number;
};

/** 查 effective 表取 def；未注册名编译期 throw（消息含字母序可用名列表） */
const lookupArrowDef = (
  shape: string,
  effective: EffectiveArrows,
): ArrowDefinition => {
  if (Object.prototype.hasOwnProperty.call(effective, shape)) return effective[shape];
  const available = Object.keys(effective).sort().join(', ');
  throw new Error(`Unknown arrow shape '${shape}'; available: ${available}`);
};

/**
 * 端点级视觉输入：顶层默认 ⊕ end-side override（逐字段 merge）
 * @description 缺省字段继承顶层（不是"完全替换"）；空心 def 上 fill 字段被丢（silent no-op）。
 *   产 compile-internal 中间体，供 shrink + emit 消费。
 */
const resolveArrowVisual = (
  topLevel: IRArrowDetail,
  endSide: IRArrowEndDetail | undefined,
  effective: EffectiveArrows,
): ResolvedArrowVisual => {
  const baseShape = endSide?.shape ?? topLevel.shape ?? DEFAULT_ARROW_SHAPE;
  const out: ResolvedArrowVisual = { shape: baseShape };
  const scale = endSide?.scale ?? topLevel.scale;
  if (scale !== undefined) out.scale = scale;
  const length = endSide?.length ?? topLevel.length;
  if (length !== undefined) out.length = length;
  const width = endSide?.width ?? topLevel.width;
  if (width !== undefined) out.width = width;
  const color = endSide?.color ?? topLevel.color;
  if (color !== undefined) out.color = color;
  const opacity = endSide?.opacity ?? topLevel.opacity;
  if (opacity !== undefined) out.opacity = opacity;
  const lineWidth = endSide?.lineWidth ?? topLevel.lineWidth;
  if (lineWidth !== undefined) out.lineWidth = lineWidth;
  const def = lookupArrowDef(baseShape, effective);
  if (!def.hollow) {
    const fill = endSide?.fill ?? topLevel.fill;
    if (fill !== undefined) out.fill = fill;
  }
  return out;
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
};

/** 据 def + 视觉输入解析端点几何（baseSize / tipX / contactX / resolved length·width） */
const resolveGeometry = (
  visual: ResolvedArrowVisual,
  effective: EffectiveArrows,
): ResolvedArrowGeometry => {
  const def = lookupArrowDef(visual.shape, effective);
  const baseSize = def.baseSize ?? ARROW_GEOMETRY_BASE_SIZE;
  const tipX = def.tipX ?? baseSize;
  const lineWidth = visual.lineWidth ?? ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH;
  const contactX = def.hollow ? def.lineContactX - lineWidth / 2 : def.lineContactX;
  const scale = visual.scale ?? 1;
  const resolvedLength = (visual.length ?? def.defaultLength ?? ARROW_MARKER_DEFAULT_SIZE) * scale;
  const resolvedWidth = (visual.width ?? def.defaultWidth ?? ARROW_MARKER_DEFAULT_SIZE) * scale;
  return { def, baseSize, tipX, contactX, lineWidth, resolvedLength, resolvedWidth };
};

/**
 * 端点级 shrink（strokeWidth 倍）：line 末端朝起点缩这么多，让箭头尖端落回原 target
 * @description 不分实心 / 空心：路径端点接在箭头尾部或凹口，箭头尖端仍贴原 target。低 opacity 下不会再透出 line。
 */
const computeShrink = (geometry: ResolvedArrowGeometry): number =>
  ((geometry.tipX - geometry.contactX) * geometry.resolvedLength) / geometry.baseSize;

/**
 * 据 def + 解析后视觉输入构 `ArrowEmitContext`
 * @description hollow def：fill 丢（neutral）、stroke = color override ?? contextStroke、lineWidth 启用；
 *   solid def：fill = fill ?? color ?? contextStroke、stroke = color ?? contextStroke。
 */
const buildEmitContext = (
  visual: ResolvedArrowVisual,
  geometry: ResolvedArrowGeometry,
  round: (n: number) => number,
): ArrowEmitContext => {
  const contextStroke: PaintValue = { kind: 'contextStroke' };
  const stroke: PaintValue = visual.color ?? contextStroke;
  const fill: PaintValue = geometry.def.hollow
    ? contextStroke
    : (visual.fill ?? visual.color ?? contextStroke);
  return { stroke, fill, lineWidth: geometry.lineWidth, round };
};

/**
 * 把视觉中间体物化成最终 `ArrowEndSpec`（已解析 marker 描述）
 * @description 构 `ArrowEmitContext` → 调 `def.emit` 收集 `MarkerPrimitive[]`，并算 baseSize /
 *   refX（hollow 减 lineWidth/2）/ markerWidth = 解析 length / markerHeight = 解析 width / opacity 透传。
 */
const materializeArrowEndSpec = (
  visual: ResolvedArrowVisual,
  geometry: ResolvedArrowGeometry,
  round: (n: number) => number,
): ArrowEndSpec => {
  const ctx = buildEmitContext(visual, geometry, round);
  const marker: Array<MarkerPrimitive> = [...geometry.def.emit(ctx)];
  const out: ArrowEndSpec = {
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

/**
 * IR path-level `arrow` + `arrowDetail` → PathPrim 起末端点已解析 marker 描述
 * @description merge 视觉输入 → 查 effective 表 + 解析几何 → 算 shrink → 调 def.emit 物化最终 `ArrowEndSpec`。
 *   返回同时带 compile-internal 的 shrink 量（端点收缩在 compile 落，与 emit 落点无关）。
 *   未注册 shape 名在此 throw（lookupArrowDef）。
 */
export const endpointArrows = (
  arrow: 'none' | '->' | '<-' | '<->' | undefined,
  detail: IRArrowDetail | undefined,
  effective: EffectiveArrows,
  round: (n: number) => number,
): {
  arrowStart?: ArrowEndSpec;
  arrowEnd?: ArrowEndSpec;
  shrinkStart: number;
  shrinkEnd: number;
} => {
  if (!arrow || arrow === 'none') return { shrinkStart: 0, shrinkEnd: 0 };
  const top: IRArrowDetail = detail ?? {};
  const wantStart = arrow === '<-' || arrow === '<->';
  const wantEnd = arrow === '->' || arrow === '<->';
  const result: {
    arrowStart?: ArrowEndSpec;
    arrowEnd?: ArrowEndSpec;
    shrinkStart: number;
    shrinkEnd: number;
  } = { shrinkStart: 0, shrinkEnd: 0 };
  if (wantStart) {
    const visual = resolveArrowVisual(top, top.start, effective);
    const geometry = resolveGeometry(visual, effective);
    result.arrowStart = materializeArrowEndSpec(visual, geometry, round);
    result.shrinkStart = computeShrink(geometry);
  }
  if (wantEnd) {
    const visual = resolveArrowVisual(top, top.end, effective);
    const geometry = resolveGeometry(visual, effective);
    result.arrowEnd = materializeArrowEndSpec(visual, geometry, round);
    result.shrinkEnd = computeShrink(geometry);
  }
  return result;
};

/** 取一个 PathCommand 末端 endpoint（move/line/quad/cubic → to；arc/ellipseArc → polar(end)；close 无端点） */
const endpointOf = (cmd: PathCommand): IRPosition | null => {
  switch (cmd.kind) {
    case 'move':
    case 'line':
    case 'quad':
    case 'cubic':
      return [cmd.to[0], cmd.to[1]];
    case 'arc': {
      const rad = (cmd.endAngle * Math.PI) / 180;
      return [
        cmd.center[0] + Math.cos(rad) * cmd.radius,
        cmd.center[1] + Math.sin(rad) * cmd.radius,
      ];
    }
    case 'ellipseArc': {
      const rad = (cmd.endAngle * Math.PI) / 180;
      return [
        cmd.center[0] + Math.cos(rad) * cmd.radiusX,
        cmd.center[1] + Math.sin(rad) * cmd.radiusY,
      ];
    }
    case 'close':
      return null;
  }
};

/** 改写一个 PathCommand 的 endpoint（用于 shrink） */
const setEndpoint = (
  commands: Array<PathCommand>,
  idx: number,
  newPt: IRPosition,
  round: (n: number) => number,
): void => {
  const cmd = commands[idx];
  if (cmd.kind === 'close') return;
  const rp: [number, number] = [round(newPt[0]), round(newPt[1])];
  if (cmd.kind === 'move' || cmd.kind === 'line') {
    commands[idx] = { ...cmd, to: rp };
  } else if (cmd.kind === 'quad') {
    commands[idx] = { ...cmd, to: rp };
  } else if (cmd.kind === 'cubic') {
    commands[idx] = { ...cmd, to: rp };
  }
  // arc / ellipseArc 不参与 shrink——首末段都是 line/cubic（path-arrow 的 path 形态）
};

/**
 * 按 shape + spec（length / scale / lineWidth）把首/末段端点向内缩短
 * @description 让 line 端点接在 hollow arrow 尾部外缘、不贯穿 back outline；shrink=0 的实心 shape 跳过。in-place 改写 commands 数组
 */
export const applyArrowShrinks = (
  commands: Array<PathCommand>,
  shrinkStart: number,
  shrinkEnd: number,
  strokeWidth: number,
  round: (n: number) => number,
): void => {
  if (shrinkStart !== 0) {
    // 找首个 move 与其后第一个有 endpoint 的命令
    const firstIdx = commands.findIndex(o => o.kind === 'move');
    if (firstIdx >= 0) {
      const cur = commands[firstIdx];
      const nextIdx = commands.findIndex(
        (o, idx) => idx > firstIdx && o.kind !== 'close',
      );
      if (cur.kind === 'move' && nextIdx >= 0) {
        const nextPt = endpointOf(commands[nextIdx]);
        if (nextPt) {
          const shifted = shiftToward(
            [cur.to[0], cur.to[1]],
            nextPt,
            shrinkStart * strokeWidth,
          );
          setEndpoint(commands, firstIdx, shifted, round);
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
          setEndpoint(commands, lastIdx, shifted, round);
        }
      }
    }
  }
};
