import type { ContourCommand, ContourSegment } from '@retikz/math';

import type { PathCommand } from '../../../../contract';
import { contourCommands, filletContour } from '../../../../shared/geometry';

/** 单条 emit 命令的来源 step kind（用于判定接缝两侧是否均为 line step） */
type CommandProvenance = string;

/**
 * ContourCommand → PathCommand（圆角后只可能是 move / line / arc / close 子集）
 * @description 坐标 / 半径走 Scene precision round（与 emitLine / emitArc 同口径），让超大半径 clamp
 *   与显式可行半径在 round 后稳定一致
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
const isSamePoint = (a: [number, number], b: [number, number]): boolean =>
  Math.abs(a[0] - b[0]) < 1e-6 && Math.abs(a[1] - b[1]) < 1e-6;

/**
 * 一段连续 line-step run 的描述
 * @description start = run 前一命令终点（move / 上一 line 的终点）；lineEnds = run 内每条 line 命令终点；
 *   cmdStart / cmdEnd = run 在 commands 中的下标区间 [cmdStart, cmdEnd)（仅含 line 命令本身，不含前置 move）
 */
type LineRun = {
  start: [number, number];
  lineEnds: Array<[number, number]>;
  cmdStart: number;
  cmdEnd: number;
};

/** line-step 圆角改写输入 */
type InputRoundedCorners = {
  /** 需要应用圆角的路径命令序列 */
  commands: Array<PathCommand>;
  /** 与命令对应的生成来源，用于识别可圆角连接 */
  provenance: Array<CommandProvenance>;
  /** 每条命令对应的原始步骤索引 */
  sourceStepIndexes: Array<number>;
  /** 连接处的圆角半径 */
  radius: number;
  /** 统一新增几何数值精度的函数 */
  round: (n: number) => number;
};

/** 圆角改写后的 command 与其 source step 映射 */
type RoundedCommandsResult = {
  /** 应用圆角后的路径命令序列 */
  commands: Array<PathCommand>;
  /** 与输出命令逐项对应的原始步骤索引 */
  sourceStepIndexes: Array<number>;
};

const appendRoundedCommands = (
  output: Array<PathCommand>,
  outputStepIndexes: Array<number>,
  rounded: ReadonlyArray<PathCommand>,
  lineStepIndexes: ReadonlyArray<number>,
  moveStepIndex?: number,
): void => {
  let lineIndex = 0;

  for (const command of rounded) {
    if (command.kind === 'move') {
      output.push(command);
      outputStepIndexes.push(moveStepIndex ?? lineStepIndexes[0]);
      continue;
    }

    const sourceIndex = lineStepIndexes[Math.min(lineIndex, lineStepIndexes.length - 1)];
    output.push(command);
    outputStepIndexes.push(sourceIndex);
    if (command.kind === 'line' && lineIndex < lineStepIndexes.length - 1) lineIndex += 1;
  }
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
 *   无合格 run 时原样返回）。radius ≤ 0 由调用方提前短路
 */
export const applyRoundedCorners = ({
  commands,
  provenance,
  sourceStepIndexes,
  radius,
  round,
}: InputRoundedCorners): RoundedCommandsResult => {
  // 收集合格 run：连续 line-step 的 line 命令。move / 非 line step 命令打断 run。
  const out: Array<PathCommand> = [];
  const outStepIndexes: Array<number> = [];
  let i = 0;

  while (i < commands.length) {
    const cmd = commands[i];
    const isLineStep = cmd.kind === 'line' && (provenance[i] === 'line' || provenance[i] === 'axis-line');
    if (!isLineStep) {
      out.push(cmd);
      outStepIndexes.push(sourceStepIndexes[i] ?? -1);
      i++;
      continue;
    }

    // run 起点取上一条命令的终点。
    const prev = out[out.length - 1];
    const start = endpointOf(prev);
    if (!start) {
      out.push(cmd);
      outStepIndexes.push(sourceStepIndexes[i] ?? -1);
      i++;
      continue;
    }

    // 收集连续 line-step 命令
    const lineEnds: Array<[number, number]> = [];
    const cmdStart = i;

    while (
      i < commands.length &&
      commands[i].kind === 'line' &&
      (provenance[i] === 'line' || provenance[i] === 'axis-line')
    ) {
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
      if (!isSamePoint(lastEnd, start)) segs.push({ kind: 'line', from: lastEnd, to: start });

      // 需 ≥3 段才是可倒角的闭合多边形；退化（如 A→B→A）落开放分支处理
      if (segs.length >= 3) {
        const fillets = filletContour(segs, radius, true);
        const rounded = contourCommands(segs, radius, fillets, true);

        // contourCommands 闭合版自带 move + close；替换 run 的 move（out 末尾）+ line 命令 + 这条 close
        out.pop(); // 去掉原 move（contourCommands 会重发 move）
        const moveStepIndex = outStepIndexes.pop();
        appendRoundedCommands(
          out,
          outStepIndexes,
          rounded.map(command => contourToPathCommand(command, round)),
          sourceStepIndexes.slice(cmdStart, cmdEnd),
          moveStepIndex,
        );
        i = closeIdx + 1; // 跳过被吸收的 close
        continue;
      }
    }

    if (run.lineEnds.length >= 2) {
      // 开放 run：只倒内部接缝，不环绕、无 close。run 起点已有 move（out 末尾），故 contourCommands 的 move 丢弃。
      const segs = runSegments(run);
      const fillets = filletContour(segs, radius, false);
      const rounded = contourCommands(segs, radius, fillets, false);
      appendRoundedCommands(
        out,
        outStepIndexes,
        rounded.filter(command => command.kind !== 'move').map(command => contourToPathCommand(command, round)),
        sourceStepIndexes.slice(cmdStart, cmdEnd),
      );
      continue;
    }

    // 单段 line（无内拐角）：原样
    for (let k = cmdStart; k < cmdEnd; k++) {
      out.push(commands[k]);
      outStepIndexes.push(sourceStepIndexes[k] ?? -1);
    }
  }

  return { commands: out, sourceStepIndexes: outStepIndexes };
};
