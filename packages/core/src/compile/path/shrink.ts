import {
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  DEFAULT_ARROW_SHAPE,
  type IRArrowDetail,
  type IRArrowEndDetail,
  type IRPosition,
} from '../../ir';
import type { ArrowEndSpec, PathCommand } from '../../primitive';
import { shiftToward } from './anchor';
import { isHollowArrowShape, resolveArrowShapeGeometry } from './arrow-geometry';

/**
 * compile 内部中间体：把顶层默认 ⊕ end-side override merge 后的"视觉输入"集合
 * @description 仅 compile 解析阶段用——shrink 几何 + 调 def.emit 都读它；这些视觉输入字段（scale /
 *   length / width / color / fill / lineWidth）解析完即消费，**不**进最终 `ArrowEndSpec`（已解析 marker 描述）。
 *   这是 compile-internal 类型，不导出公开 API。
 *
 *   注意：本文件目前是 stub——`endpointArrows` 产出的最终 `ArrowEndSpec`（含 def.emit 物化的 marker 几何 +
 *   解析后的 baseSize / refX / markerWidth / markerHeight）由实现 Agent 接 effective arrow 表 + compile 调
 *   `def.emit` 落地。stub 阶段 marker 为空数组、wrapper 参数走中性几何，让 tsc 过、端点 shrink 测试有结果。
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

/**
 * 端点级视觉输入：顶层默认 ⊕ end-side override（逐字段 merge）
 * @description 缺省字段继承顶层（不是"完全替换"）；空心 shape 上 fill 字段被丢（silent no-op）。
 *   产 compile-internal 中间体，供 shrink + emit 消费。
 */
const resolveArrowVisual = (
  topLevel: IRArrowDetail,
  endSide: IRArrowEndDetail | undefined,
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
  if (!isHollowArrowShape(baseShape)) {
    const fill = endSide?.fill ?? topLevel.fill;
    if (fill !== undefined) out.fill = fill;
  }
  return out;
};

/**
 * 端点级 shrink（strokeWidth 倍）：line 末端朝起点缩这么多，让箭头尖端落回原 target
 * @description 不分实心 / 空心：路径端点接在箭头尾部或凹口，箭头尖端仍贴原 target。低 opacity 下不会再透出 line。
 *   签名变更：接 compile-internal 视觉中间体（不再接最终 `ArrowEndSpec`——后者已无 length / scale / lineWidth）。
 */
const computeShrink = (visual: ResolvedArrowVisual): number => {
  const geometry = resolveArrowShapeGeometry(visual);
  const length = (visual.length ?? geometry.defaultLength) * (visual.scale ?? 1);
  return ((geometry.tipX - geometry.lineContactX) * length) / geometry.baseSize;
};

/**
 * 把视觉中间体物化成最终 `ArrowEndSpec`（已解析 marker 描述）
 * @description stub：实现 Agent 在此查 effective arrow 表（`{ ...BUILTIN_ARROWS, ...options.arrows }`）+ 构
 *   `ArrowEmitContext`（stroke 无 override = `{ kind:'contextStroke' }`、空心据 hollow 丢 fill / 启用 lineWidth）+
 *   调 `def.emit` 收集 `MarkerPrimitive[]`，并算 baseSize / refX（hollow 减 lineWidth/2）/ markerWidth = 解析
 *   length / markerHeight = 解析 width。stub 阶段产中性几何 + 空 marker，让 tsc 过、端点 shrink 测试有结果。
 */
const materializeArrowEndSpec = (visual: ResolvedArrowVisual): ArrowEndSpec => {
  const geometry = resolveArrowShapeGeometry(visual);
  const scale = visual.scale ?? 1;
  const out: ArrowEndSpec = {
    shape: visual.shape,
    baseSize: geometry.baseSize,
    refX: geometry.lineContactX,
    markerWidth: (visual.length ?? ARROW_MARKER_DEFAULT_SIZE) * scale,
    markerHeight: (visual.width ?? ARROW_MARKER_DEFAULT_SIZE) * scale,
    // stub：def.emit 物化的内部几何由实现 Agent 落；空数组让 render 路径测试明确 fail（不静默产几何）
    marker: [],
  };
  if (visual.opacity !== undefined) out.opacity = visual.opacity;
  void ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH;
  return out;
};

/**
 * IR path-level `arrow` + `arrowDetail` → PathPrim 起末端点已解析 marker 描述
 * @description merge 视觉输入 → 算 shrink → 物化最终 `ArrowEndSpec`。返回同时带 compile-internal 的 shrink
 *   量（端点收缩在 compile 落，与 emit 落点无关）。
 */
export const endpointArrows = (
  arrow: 'none' | '->' | '<-' | '<->' | undefined,
  detail: IRArrowDetail | undefined,
): {
  arrowStart?: ArrowEndSpec;
  arrowEnd?: ArrowEndSpec;
  shrinkStart: number;
  shrinkEnd: number;
} => {
  if (!arrow || arrow === 'none') return { shrinkStart: 0, shrinkEnd: 0 };
  const top: IRArrowDetail = detail ?? {};
  const startVisual = resolveArrowVisual(top, top.start);
  const endVisual = resolveArrowVisual(top, top.end);
  switch (arrow) {
    case '->':
      return {
        arrowEnd: materializeArrowEndSpec(endVisual),
        shrinkStart: 0,
        shrinkEnd: computeShrink(endVisual),
      };
    case '<-':
      return {
        arrowStart: materializeArrowEndSpec(startVisual),
        shrinkStart: computeShrink(startVisual),
        shrinkEnd: 0,
      };
    case '<->':
      return {
        arrowStart: materializeArrowEndSpec(startVisual),
        arrowEnd: materializeArrowEndSpec(endVisual),
        shrinkStart: computeShrink(startVisual),
        shrinkEnd: computeShrink(endVisual),
      };
  }
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
  if (shrinkStart > 0) {
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
  if (shrinkEnd > 0) {
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
