import {
  ARROW_MARKER_DEFAULT_SIZE,
  ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH,
  HOLLOW_ARROW_SHAPES,
} from '../../ir';
import type { IRArrowDetail, IRArrowEndDetail, IRPosition } from '../../ir';
import type { ArrowEndSpec, PathCommand } from '../../primitive';
import { shiftToward } from './anchor';

/**
 * 端点级 spec：顶层默认 ⊕ end-side override（逐字段 merge）
 * @description 缺省字段继承顶层（不是"完全替换"）；空心 shape 上 fill 字段被丢（silent no-op）
 */
const resolveArrowEndSpec = (
  topLevel: IRArrowDetail,
  endSide: IRArrowEndDetail | undefined,
): ArrowEndSpec => {
  // ArrowDetail 的顶层字段含 start / end —— 提取 end-end 候选字段集（不含 start/end 自身）
  const baseShape = endSide?.shape ?? topLevel.shape ?? 'normal';
  const out: ArrowEndSpec = { shape: baseShape };
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
  // fill 仅实心 shape 保留；空心 shape silent no-op
  if (!HOLLOW_ARROW_SHAPES.has(baseShape)) {
    const fill = endSide?.fill ?? topLevel.fill;
    if (fill !== undefined) out.fill = fill;
  }
  return out;
};

/** IR path-level `arrow` + `arrowDetail` → PathPrim 起末视觉规格 */
export const arrowMarkers = (
  arrow: 'none' | '->' | '<-' | '<->' | undefined,
  detail: IRArrowDetail | undefined,
): { arrowStart?: ArrowEndSpec; arrowEnd?: ArrowEndSpec } => {
  if (!arrow || arrow === 'none') return {};
  const top: IRArrowDetail = detail ?? {};
  const startSpec = resolveArrowEndSpec(top, top.start);
  const endSpec = resolveArrowEndSpec(top, top.end);
  switch (arrow) {
    case '->':
      return { arrowEnd: endSpec };
    case '<-':
      return { arrowStart: startSpec };
    case '<->':
      return { arrowStart: startSpec, arrowEnd: endSpec };
  }
};

/**
 * 端点级 shrink（strokeWidth 倍）：line 末端朝起点缩这么多，让 marker apex 落回原 target
 * @description 不分实心/空心：所有 shape 都让 line 端点接在箭头尾部、apex 顶端仍贴原 target。低 opacity 下不会再透出 line。viewBox=10，shrink = (apex.x - refX) × length × scale / 10（strokeWidth 倍）。
 *
 * 几何对齐（必须与 react/render/arrowMarkers.tsx 中 renderInner 的 refX 一致）：
 * - `normal` / `diamond` / `circle`：apex 在 viewBox x=10、back 外缘 x=0 → refX=0，shrink = length × scale
 * - `stealth`：apex x=10、V tip x=3（line 嵌进 V 凹口）→ refX=3，shrink = 0.7 × length × scale
 * - `open` / `openDiamond`：apex x=9、back stroke 外缘 x = 1 - lineWidth/2 → refX = 1 - lineWidth/2，shrink = (8 + lineWidth/2) × length × scale / 10
 * - `openCircle`：apex 外缘右 x ≈ 10、back 外缘左 x = 0.75 - lineWidth/2 → refX = 0.75 - lineWidth/2，shrink ≈ length × scale
 */
export const computeShrink = (spec: ArrowEndSpec): number => {
  const length = (spec.length ?? ARROW_MARKER_DEFAULT_SIZE) * (spec.scale ?? 1);
  if (HOLLOW_ARROW_SHAPES.has(spec.shape)) {
    if (spec.shape === 'openCircle') return length;
    // open / openDiamond：apex 在 viewBox x=9（path d 留半 stroke 余量）
    const lineWidth = spec.lineWidth ?? ARROW_MARKER_HOLLOW_DEFAULT_LINE_WIDTH;
    return ((8 + lineWidth / 2) * length) / 10;
  }
  // 实心：apex 在 viewBox x=10
  if (spec.shape === 'stealth') return (7 * length) / 10;
  return length;
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
