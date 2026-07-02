import type { PathCommand } from '../../contract';
import type { ContourCommand, ContourSegment, FilletSolution } from '../../shared/geometry';

import { contourCommands, filletContour } from '../../shared/geometry';

/**
 * 折线几何圆角：把 path 内部「line step ↔ line step」接缝倒成切圆弧。
 *
 * 只动 line step 产出的 line 命令构成的连续 run；fold（一个 step 产两段直线但接缝须保持尖）/ curve / cubic /
 * arc / rectangle / generator 等接缝一律保持尖角——故需逐命令的 provenance（来自哪个 step kind）判定。
 * 几何复用 shared/geometry 的 fillet 解算（含 0.5 段长 clamp）：开放连续段走 closed=false 只倒内部缝；
 * 被 cycle close 闭回 run 起点且闭合接缝两侧均 line step 的 run 走 closed=true（含环绕缝，等价闭合 contour）。
 */

/** 单条 emit 命令的来源 step kind（用于判定接缝两侧是否均为 line step） */
export type CommandProvenance = string;

/**
 * ContourCommand → PathCommand（圆角后只可能是 move / line / arc / close 子集）
 * @description 坐标 / 半径走 Scene precision round（与 emitLine / emitArc 同口径），让超大半径 clamp
 *   与显式可行半径在 round 后稳定一致。
 */
const contourToPathCommand = (c: ContourCommand, round: (n: number) => number): PathCommand => {
  if (c.kind === 'move') return { kind: 'move', to: [round(c.to[0]), round(c.to[1])] };
  if (c.kind === 'line') return { kind: 'line', to: [round(c.to[0]), round(c.to[1])] };
  if (c.kind === 'close') return { kind: 'close' };
  const arc: PathCommand = {
    kind: 'arc',
    center: [round(c.center[0]), round(c.center[1])],
    radius: round(c.radius),
    startAngle: c.startAngle,
    endAngle: c.endAngle,
  };
  if (c.counterClockwise !== undefined) arc.counterClockwise = c.counterClockwise;
  return arc;
};

/** 取一条产生终点的命令的终点坐标（move / line 才有意义） */
const endpointOf = (c: PathCommand): [number, number] | undefined => {
  if (c.kind === 'move' || c.kind === 'line') return c.to;
  return undefined;
};

/** 两点近似相等（坐标已 round，容差取小常量） */
const samePoint = (a: [number, number], b: [number, number]): boolean =>
  Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

/**
 * 一段连续 line-step run 的描述
 * @description start = run 前一命令终点（move / 上一 line 的终点）；lineEnds = run 内每条 line 命令终点；
 *   cmdStart / cmdEnd = run 在 commands 中的下标区间 [cmdStart, cmdEnd)（仅含 line 命令本身，不含前置 move）。
 */
type LineRun = {
  start: [number, number];
  lineEnds: Array<[number, number]>;
  cmdStart: number;
  cmdEnd: number;
};

/** 把 LineRun 的折线顶点转成开放 contour 段序列 */
const runSegments = (run: LineRun): Array<ContourSegment> => {
  const segs: Array<ContourSegment> = [];
  let from = run.start;
  for (const to of run.lineEnds) {
    segs.push({ kind: 'line', from, to });
    from = to;
  }
  return segs;
};

/**
 * 对一条 path 的 commands 施加 line-line 接缝几何圆角
 * @description provenance 与 commands 一一对应、给出每条命令的来源 step kind。返回新 commands（≥2 段 line run 才倒，
 *   无合格 run 时原样返回）。radius ≤ 0 由调用方提前短路。
 */
export const applyRoundedCorners = (
  commands: Array<PathCommand>,
  provenance: Array<CommandProvenance>,
  radius: number,
  round: (n: number) => number,
): Array<PathCommand> => {
  // 收集合格 run：连续 line-step 的 line 命令。move / 非 line step 命令打断 run。
  const out: Array<PathCommand> = [];
  let i = 0;
  while (i < commands.length) {
    const cmd = commands[i];
    const isLineStep = cmd.kind === 'line' && provenance[i] === 'line';
    if (!isLineStep) {
      out.push(cmd);
      i++;
      continue;
    }
    // run 起点 = 上一条命令的终点（line 不会是首命令，故 out 非空；防御性兜底无前置 / 无终点的命令）
    const prev = out[out.length - 1];
    const start = endpointOf(prev);
    if (!start) {
      out.push(cmd);
      i++;
      continue;
    }
    // 收集连续 line-step 命令
    const lineEnds: Array<[number, number]> = [];
    const cmdStart = i;
    while (i < commands.length && commands[i].kind === 'line' && provenance[i] === 'line') {
      const c = commands[i] as { kind: 'line'; to: [number, number] };
      lineEnds.push(c.to);
      i++;
    }
    const cmdEnd = i;
    const run: LineRun = { start, lineEnds, cmdStart, cmdEnd };

    // run 后是否紧跟 cycle 的 close、且 run 起点由前一条 move 给出（close 闭回该 move 起点 == run.start）→ 闭合 contour
    const closeIdx = i;
    const closedByCycle =
      closeIdx < commands.length &&
      commands[closeIdx].kind === 'close' &&
      provenance[closeIdx] === 'cycle' &&
      lineEnds.length >= 2 &&
      prev.kind === 'move';

    if (closedByCycle) {
      // 闭合 contour 段序列：用户已显式 line 回起点（lastEnd == start）则末段本身即环绕缝，不再追加零长度段；
      // 否则补一条 lastEnd → start 的环绕缝。两种写法（隐式 cycle / 显式 line 回起点 + cycle）都倒首尾接缝。
      const lastEnd = lineEnds[lineEnds.length - 1];
      const segs = runSegments(run);
      if (!samePoint(lastEnd, start)) segs.push({ kind: 'line', from: lastEnd, to: start });
      // 需 ≥3 段才是可倒角的闭合多边形；退化（如 A→B→A）落开放分支处理
      if (segs.length >= 3) {
        const fillets = filletContour(segs, radius, true);
        const rounded = contourCommands(segs, radius, fillets, true);
        // contourCommands 闭合版自带 move + close；替换 run 的 move（out 末尾）+ line 命令 + 这条 close
        out.pop(); // 去掉原 move（contourCommands 会重发 move）
        for (const rc of rounded) out.push(contourToPathCommand(rc, round));
        i = closeIdx + 1; // 跳过被吸收的 close
        continue;
      }
    }

    if (run.lineEnds.length >= 2) {
      // 开放 run：只倒内部接缝，不环绕、无 close。run 起点已有 move（out 末尾），故 contourCommands 的 move 丢弃。
      const segs = runSegments(run);
      const fillets = filletContour(segs, radius, false);
      const rounded = contourCommands(segs, radius, fillets, false);
      for (const rc of rounded) {
        if (rc.kind === 'move') continue; // run 起点 move 已在 out 末尾
        out.push(contourToPathCommand(rc, round));
      }
      continue;
    }

    // 单段 line（无内拐角）：原样
    for (let k = cmdStart; k < cmdEnd; k++) out.push(commands[k]);
  }
  return out;
};

/** 暴露 fillet 解（供 marks 弧长重算等沿倒角后几何采样） */
export type { FilletSolution };

const DEG_TO_RAD = Math.PI / 180;

/** 倒角后命令采样结果：pos∈[0,1] 处的点 + 归一化切线（与 SegmentSample 同形态） */
export type CommandSample = {
  /** 点坐标 */
  point: [number, number];
  /** 归一化切线 */
  tangent: [number, number];
};

/** 命令几何片段：直线 or 圆弧，带累积弧长（弧长重算 marks 用） */
type Piece =
  | { kind: 'line'; from: [number, number]; to: [number, number]; len: number }
  | {
      kind: 'arc';
      center: [number, number];
      radius: number;
      startAngle: number;
      endAngle: number;
      ccw: boolean;
      len: number;
    };

const dist = (a: [number, number], b: [number, number]): number => Math.hypot(b[0] - a[0], b[1] - a[1]);

/**
 * 把（倒角后）commands 拆成可按弧长行走的片段序列
 * @description 只识别 move / line / arc / close（倒角输出子集）；其余命令片段被跳过（圆角路径不含）。
 *   close 视作回到当前 subpath 起点的直线段。
 */
const piecesFromCommands = (commands: ReadonlyArray<PathCommand>): Array<Piece> => {
  const pieces: Array<Piece> = [];
  let cursor: [number, number] | undefined;
  let subStart: [number, number] | undefined;
  for (const c of commands) {
    if (c.kind === 'move') {
      cursor = c.to;
      subStart = c.to;
    } else if (c.kind === 'line' && cursor) {
      pieces.push({ kind: 'line', from: cursor, to: c.to, len: dist(cursor, c.to) });
      cursor = c.to;
    } else if (c.kind === 'arc' && cursor) {
      const span = Math.abs(c.endAngle - c.startAngle) * DEG_TO_RAD;
      const end: [number, number] = [
        c.center[0] + c.radius * Math.cos(c.endAngle * DEG_TO_RAD),
        c.center[1] + c.radius * Math.sin(c.endAngle * DEG_TO_RAD),
      ];
      pieces.push({
        kind: 'arc',
        center: c.center,
        radius: c.radius,
        startAngle: c.startAngle,
        endAngle: c.endAngle,
        ccw: c.counterClockwise ?? false,
        len: c.radius * span,
      });
      cursor = end;
    } else if (c.kind === 'close' && cursor && subStart) {
      pieces.push({ kind: 'line', from: cursor, to: subStart, len: dist(cursor, subStart) });
      cursor = subStart;
    }
  }
  return pieces;
};

/** 在片段上取归一化弧长 u∈[0,1] 处的点 + 切线 */
const samplePiece = (piece: Piece, u: number): CommandSample => {
  if (piece.kind === 'line') {
    const point: [number, number] = [
      piece.from[0] + (piece.to[0] - piece.from[0]) * u,
      piece.from[1] + (piece.to[1] - piece.from[1]) * u,
    ];
    const dx = piece.to[0] - piece.from[0];
    const dy = piece.to[1] - piece.from[1];
    const l = Math.hypot(dx, dy) || 1;
    return { point, tangent: [dx / l, dy / l] };
  }
  const angle = piece.startAngle + (piece.endAngle - piece.startAngle) * u;
  const rad = angle * DEG_TO_RAD;
  const point: [number, number] = [
    piece.center[0] + piece.radius * Math.cos(rad),
    piece.center[1] + piece.radius * Math.sin(rad),
  ];
  const sweepSign = piece.endAngle >= piece.startAngle ? 1 : -1;
  const tx = -Math.sin(rad) * sweepSign;
  const ty = Math.cos(rad) * sweepSign;
  const l = Math.hypot(tx, ty) || 1;
  return { point, tangent: [tx / l, ty / l] };
};

/**
 * 沿（倒角后）commands 按总弧长在 pos∈[0,1] 处采样点 + 切线（mark / label 弧长重定位用）
 * @description 倒角缩短了路径总弧长并改变接缝几何 → 同一 pos 落点 / 切线与尖角不同。
 *   无可行片段（退化）时回退 { [0,0], [1,0] }。
 */
export const sampleRoundedCommands = (commands: ReadonlyArray<PathCommand>, pos: number): CommandSample => {
  const pieces = piecesFromCommands(commands);
  const total = pieces.reduce((s, p) => s + p.len, 0);
  if (total <= 0 || pieces.length === 0) return { point: [0, 0], tangent: [1, 0] };
  const target = Math.max(0, Math.min(1, pos)) * total;
  let acc = 0;
  for (const piece of pieces) {
    if (acc + piece.len >= target || piece === pieces[pieces.length - 1]) {
      const local = piece.len > 0 ? (target - acc) / piece.len : 0;
      return samplePiece(piece, Math.max(0, Math.min(1, local)));
    }
    acc += piece.len;
  }
  return samplePiece(pieces[pieces.length - 1], 1);
};
