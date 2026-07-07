import type { Vector2 } from '@retikz/math';

import type { PathCommand } from '../../../../contract';
import type { IRPosition, IRRibbonCap, RibbonAlignmentValue } from '../../../../schemas';
import type { NamespaceStack } from '../../../namespace';
import type { RibbonSegment } from '../types';

import { arcCapPoints, capExtension, isArcCap, midpoint, roundedArcPoints } from '../caps';
import { sampleAtDistance } from '../centerline';
import { ribbonCrossSection } from './cross-section';

export type OutlineCommandsInput = {
  segments: ReadonlyArray<RibbonSegment>;
  totalLength: number;
  sampleCount: number;
  widthAt: (offset: number) => number;
  endpointTangents: { start: Vector2; end: Vector2 };
  align: RibbonAlignmentValue;
  startEndpointCap: IRRibbonCap;
  endEndpointCap: IRRibbonCap;
  namespaceStack: NamespaceStack;
  round: (n: number) => number;
};

/**
 * 采样型 centerline ribbon 轮廓
 * @description 沿中心线取 sampleCount 个横截面，左侧顺序连线、右侧逆序连线，再按端帽配置闭合。
 */
export const outlineCommands = ({
  segments,
  totalLength,
  sampleCount,
  widthAt,
  endpointTangents,
  align,
  startEndpointCap,
  endEndpointCap,
  namespaceStack,
  round,
}: OutlineCommandsInput): { commands: Array<PathCommand>; points: Array<IRPosition> } => {
  const left: Array<IRPosition> = [];
  const right: Array<IRPosition> = [];
  const centers: Array<IRPosition> = [];
  const tangents: Array<Vector2> = [];
  const widths: Array<number> = [];
  for (let i = 0; i < sampleCount; i += 1) {
    const offset = sampleCount === 1 ? 0 : i / (sampleCount - 1);
    const sample = sampleAtDistance(segments, totalLength, offset * totalLength);
    const section = ribbonCrossSection({ sample, offset, widthAt, endpointTangents, align, round });
    left.push(section.left);
    right.push(section.right);
    centers.push(section.center);
    tangents.push(section.tangent);
    widths.push(section.width);
  }

  if (startEndpointCap === 'square') {
    const ext = capExtension(widths[0], align);
    left[0] = [round(left[0][0] - tangents[0][0] * ext), round(left[0][1] - tangents[0][1] * ext)];
    right[0] = [round(right[0][0] - tangents[0][0] * ext), round(right[0][1] - tangents[0][1] * ext)];
  }
  if (endEndpointCap === 'square') {
    const last = sampleCount - 1;
    const ext = capExtension(widths[last], align);
    left[last] = [round(left[last][0] + tangents[last][0] * ext), round(left[last][1] + tangents[last][1] * ext)];
    right[last] = [round(right[last][0] + tangents[last][0] * ext), round(right[last][1] + tangents[last][1] * ext)];
  }

  const commands: Array<PathCommand> = [{ kind: 'move', to: left[0] }];
  for (let i = 1; i < left.length; i += 1) commands.push({ kind: 'line', to: left[i] });
  if (isArcCap(endEndpointCap)) {
    const last = sampleCount - 1;
    for (const point of arcCapPoints({
      cap: endEndpointCap,
      from: left[last],
      to: right[last],
      endpoint: 'end',
      namespaceStack,
      round,
    })) {
      commands.push({ kind: 'line', to: point });
    }
  } else if (endEndpointCap === 'round') {
    const last = sampleCount - 1;
    for (const point of roundedArcPoints({
      center: midpoint(left[last], right[last], round),
      from: left[last],
      to: right[last],
      outwardDirection: tangents[last],
      round,
    })) {
      commands.push({ kind: 'line', to: point });
    }
  } else {
    commands.push({ kind: 'line', to: right[right.length - 1] });
  }
  for (let i = right.length - 2; i >= 0; i -= 1) commands.push({ kind: 'line', to: right[i] });
  if (isArcCap(startEndpointCap)) {
    for (const point of arcCapPoints({
      cap: startEndpointCap,
      from: right[0],
      to: left[0],
      endpoint: 'start',
      namespaceStack,
      round,
    })) {
      commands.push({ kind: 'line', to: point });
    }
  } else if (startEndpointCap === 'round') {
    for (const point of roundedArcPoints({
      center: midpoint(left[0], right[0], round),
      from: right[0],
      to: left[0],
      outwardDirection: [-tangents[0][0], -tangents[0][1]],
      round,
    })) {
      commands.push({ kind: 'line', to: point });
    }
  }
  commands.push({ kind: 'close' });
  return { commands, points: [...left, ...right] };
};
