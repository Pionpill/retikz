import { DEFAULT_ARROW_SHAPE, type IRArrowDetail, type IRArrowEndDetail, type IRPosition } from '../../ir';
import type { ArrowEndSpec, PathCommand } from '../../primitive';
import { shiftToward } from './anchor';
import { isHollowArrowShape, resolveArrowShapeGeometry } from './arrow-geometry';

/**
 * 端点级 spec：顶层默认 ⊕ end-side override（逐字段 merge）
 * @description 缺省字段继承顶层（不是"完全替换"）；空心 shape 上 fill 字段被丢（silent no-op）
 */
const resolveArrowEndSpec = (
  topLevel: IRArrowDetail,
  endSide: IRArrowEndDetail | undefined,
): ArrowEndSpec => {
  // ArrowDetail 的顶层字段含 start / end —— 提取 end-end 候选字段集（不含 start/end 自身）
  const baseShape = endSide?.shape ?? topLevel.shape ?? DEFAULT_ARROW_SHAPE;
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
  if (!isHollowArrowShape(baseShape)) {
    const fill = endSide?.fill ?? topLevel.fill;
    if (fill !== undefined) out.fill = fill;
  }
  return out;
};

/** IR path-level `arrow` + `arrowDetail` → PathPrim 起末端点箭头规格 */
export const endpointArrows = (
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
 * 端点级 shrink（strokeWidth 倍）：line 末端朝起点缩这么多，让箭头尖端落回原 target
 * @description 不分实心 / 空心：路径端点接在箭头尾部或凹口，箭头尖端仍贴原 target。低 opacity 下不会再透出 line。
 */
export const computeShrink = (spec: ArrowEndSpec): number => {
  const geometry = resolveArrowShapeGeometry(spec);
  const length = (spec.length ?? geometry.defaultLength) * (spec.scale ?? 1);
  return ((geometry.tipX - geometry.lineContactX) * length) / geometry.baseSize;
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
