import type { IRPosition, PathCommand } from '@retikz/core';
import type { Vector2 } from '@retikz/math';
import { curve, point } from '@retikz/math';

import { RetikzExtensionError, RetikzExtensionErrorCode } from '../../../errors';
import type { RibbonCapDefinition } from '../../cap-types';
import type { RibbonAlignment } from '../../constants';
import type { IRRibbonCap } from '../../types';
import type { RibbonEndpointGeometry } from '../caps';
import { resolveEndpointCap } from '../caps';
import { sampleAtDistance } from '../centerline';
import { commandBoundsPoints, reverseCommands } from '../commands';
import type { RibbonCrossSection, RibbonSegment } from '../types';
import { ribbonCrossSection } from './cross-section';

/** 采样边界构造输入 */
export type OutlineCommandsInput = {
  /** 按路径顺序连接的可采样中心线段 */
  segments: ReadonlyArray<RibbonSegment>;
  /** 全部中心线段的总弧长 */
  totalLength: number;
  /** 均匀弧长采样的目标点数，包含两个端点 */
  sampleCount: number;
  /** 按归一化弧长位置读取带宽 */
  widthAt: (offset: number) => number;
  /** 可选的起终点横截面轴向覆盖 */
  endpointAxes: {
    /** 起点横截面的显式轴向 */
    start?: Vector2;
    /** 终点横截面的显式轴向 */
    end?: Vector2;
  };
  /** 带状区域相对中心线的对齐方式 */
  align: RibbonAlignment;
  /** 起点采用的端帽定义名称与参数 */
  startEndpointCap: IRRibbonCap;
  /** 终点采用的端帽定义名称与参数 */
  endEndpointCap: IRRibbonCap;
  /** 当前编译可用的端帽定义注册表 */
  capRegistry: ReadonlyMap<string, RibbonCapDefinition>;
  /** 必须加入采样的归一化弧长特征位置 */
  featureOffsets: ReadonlyArray<number>;
  /** 宽度发生跳变时必须切断平滑的归一化弧长位置 */
  jumpOffsets: ReadonlyArray<number>;
  /** 用于输出路径坐标的精度取整函数 */
  round: (n: number) => number;
};

/** 独立侧边过点曲线，不跨越显式分段平滑 */
const sideCommands = (chunks: ReadonlyArray<ReadonlyArray<IRPosition>>): Array<PathCommand> => {
  const commands: Array<PathCommand> = [];

  for (const chunk of chunks) {
    const knots = chunk.filter((position, index) => index === 0 || point.distance(position, chunk[index - 1]) > 1e-10);
    if (knots.length === 0) continue;

    commands.push({ kind: commands.length === 0 ? 'move' : 'line', to: knots[0] });
    if (knots.length === 2) commands.push({ kind: 'line', to: knots[1] });
    else for (const segment of curve.catmullRomToCubic(knots, 1)) commands.push({ kind: 'cubic', ...segment });
  }

  return commands;
};

/** 统一弧长采样、特征点分段和端帽闭合 */
export const outlineCommands = (
  input: OutlineCommandsInput,
): {
  commands: Array<PathCommand>;
  points: Array<IRPosition>;
  start: RibbonEndpointGeometry;
  end: RibbonEndpointGeometry;
} => {
  const { segments, totalLength, sampleCount, widthAt, endpointAxes, align, round } = input;
  const offsets = new Set<number>([0, 1, ...input.featureOffsets]);

  for (let index = 0; index < sampleCount; index++) offsets.add(index / (sampleCount - 1));
  const breaks = new Set<number>([0, 1, ...input.jumpOffsets]);
  let lengthBefore = 0;

  for (let index = 0; index < segments.length - 1; index++) {
    lengthBefore += segments[index].length;
    const offset = lengthBefore / totalLength;
    offsets.add(offset);
    const incoming = segments[index].sampleAt(1).tangent;
    const outgoing = segments[index + 1].sampleAt(0).tangent;
    const dot = incoming[0] * outgoing[0] + incoming[1] * outgoing[1];
    if (dot < -1 + 1e-8)
      throw new RetikzExtensionError({
        code: RetikzExtensionErrorCode.GeometryInvalid,
        message: 'Ribbon centerline reverses at a section.',
        details: { offset },
      });

    if (dot < 1 - 1e-8) breaks.add(offset);
  }

  const boundaries = [...breaks].sort((a, b) => a - b);
  const chunks: Array<Array<RibbonCrossSection>> = [];

  for (let index = 1; index < boundaries.length; index++) {
    const from = boundaries[index - 1];
    const to = boundaries[index];
    const local = [...offsets, from, to].filter(offset => offset >= from && offset <= to);
    const sorted = [...new Set(local)].sort((a, b) => a - b);
    chunks.push(
      sorted.map(offset => {
        const side = offset === from && from > 0 ? 1 : offset === to && to < 1 ? -1 : 0;
        const near = Math.max(0, Math.min(1, offset + side * 1e-9));
        const sample = sampleAtDistance(segments, totalLength, near * totalLength);
        sample.point = sampleAtDistance(segments, totalLength, offset * totalLength).point;

        return ribbonCrossSection({ sample, offset, widthAt: () => widthAt(near), endpointAxes, align, round });
      }),
    );
  }

  const first = chunks[0][0];
  const lastChunk = chunks[chunks.length - 1];
  const last = lastChunk[lastChunk.length - 1];
  const start = resolveEndpointCap({
    endpoint: 'start',
    section: first,
    cap: input.startEndpointCap,
    registry: input.capRegistry,
    round,
  });
  const end = resolveEndpointCap({
    endpoint: 'end',
    section: last,
    cap: input.endEndpointCap,
    registry: input.capRegistry,
    round,
  });

  first.left = start.left;
  first.right = start.right;
  last.left = end.left;
  last.right = end.right;

  const left = sideCommands(chunks.map(chunk => chunk.map(section => section.left)));
  const right = reverseCommands(sideCommands(chunks.map(chunk => chunk.map(section => section.right))));
  const commands: Array<PathCommand> = [
    ...left,
    ...end.commands.slice(1),
    ...right.slice(1),
    ...(start.commands.length === 2 && start.commands[1].kind === 'line' ? [] : start.commands.slice(1)),
    { kind: 'close' },
  ];

  const rounded = commands.map(command => {
    const position = (value: IRPosition): IRPosition => [round(value[0]), round(value[1])];
    if (command.kind === 'move' || command.kind === 'line') return { ...command, to: position(command.to) };
    if (command.kind === 'quad') return { ...command, to: position(command.to), control: position(command.control) };
    if (command.kind === 'cubic')
      return {
        ...command,
        to: position(command.to),
        control1: position(command.control1),
        control2: position(command.control2),
      };

    return command;
  });

  return { commands: rounded, points: commandBoundsPoints(rounded), start, end };
};
