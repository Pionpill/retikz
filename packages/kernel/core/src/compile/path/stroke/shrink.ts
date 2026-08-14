import { arcEndPoint, ellipseArcPoint, point } from '@retikz/math';

import type {
  ArrowEmitContext,
  MarkerFill,
  MarkerPrimitive,
  PathCommand,
  ResolvedArrowEndSpec,
} from '../../../contract';
import type { ArrowMarkResolution } from '../../../resolve/path';
import type { IRPosition } from '../../../schemas';

import { CompositeContractError, LayoutProbeRecoverableError, safeThrownDetail } from '../../../resolve/diagnostics';
import { validateMarkerPrimitives } from '../../resource';
import { arcCommandPointAt, trimArcEnd, trimArcStart } from './arc-shrink';

/** 调用 arrow emit，并校验 marker 产物 */
const emitArrowMarkerPrimitives = (
  shape: string,
  def: ArrowMarkResolution['definition'],
  ctx: ArrowEmitContext,
): Array<MarkerPrimitive> => {
  if (typeof def.emit !== 'function') {
    throw new CompositeContractError(
      `Arrow '${shape}' is missing an emit function (ArrowDefinition.emit is required).`,
    );
  }
  let emitted: unknown;
  try {
    emitted = def.emit(ctx);
  } catch (e) {
    throw new LayoutProbeRecoverableError(`Arrow '${shape}' emit failed: ${safeThrownDetail(e)}`, {
      cause: e,
      providerKey: `arrow:${shape}`,
    });
  }
  return validateMarkerPrimitives(`Arrow '${shape}'`, emitted);
};

/** 构造 ArrowDefinition.emit 的上下文 */
const buildEmitContext = (resolution: ArrowMarkResolution, round: (n: number) => number): ArrowEmitContext => {
  const { visual, definition } = resolution;
  const contextStroke: MarkerFill = { kind: 'contextStroke' };
  const stroke: MarkerFill = visual.color ?? contextStroke;
  const fill: MarkerFill = definition.hollow ? contextStroke : (visual.fill ?? visual.color ?? contextStroke);
  return { stroke, fill, lineWidth: visual.lineWidth, round };
};

/** 把箭头视觉输入物化为 Scene 端点箭头描述 */
const emitArrowEndSpec = (resolution: ArrowMarkResolution, round: (n: number) => number): ResolvedArrowEndSpec => {
  const { visual, geometry, definition } = resolution;
  const ctx = buildEmitContext(resolution, round);
  const marker = emitArrowMarkerPrimitives(visual.shape, definition, ctx);
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

/** 已解析的端点箭头及对应 path 收缩量 */
export type EndpointArrowMarkEmission = {
  /** 已物化的 Scene 端点箭头描述 */
  spec: ResolvedArrowEndSpec;
  /** path 本体需要向内收缩的距离（未乘 strokeWidth） */
  shrink: number;
  /** auto boundary 端点为了避开空心箭头外缘需要额外内缩的距离 */
  boundaryOuterInset: number;
};

export const emitEndpointArrowMark = (
  resolution: ArrowMarkResolution,
  round: (n: number) => number,
): EndpointArrowMarkEmission => {
  return {
    spec: emitArrowEndSpec(resolution, round),
    shrink: resolution.geometry.shrink,
    boundaryOuterInset: resolution.geometry.boundaryOuterInset,
  };
};

/** 解析中段 arrow mark 为 marker 描述 */
export const emitMarkArrowSpec = (
  resolution: ArrowMarkResolution,
  round: (n: number) => number,
): ResolvedArrowEndSpec => {
  return emitArrowEndSpec(resolution, round);
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
      return ellipseArcPoint({
        center: cmd.center,
        radiusX: cmd.radiusX,
        radiusY: cmd.radiusY,
        angleDeg: cmd.endAngle,
      });
    case 'close':
      return null;
  }
};

type SetEndpointInput = {
  commands: Array<PathCommand>;
  index: number;
  endpoint: IRPosition;
  round: (n: number) => number;
};

/** 改写一个 PathCommand 的 endpoint（用于 shrink） */
const setEndpoint = ({ commands, index, endpoint, round }: SetEndpointInput): void => {
  const cmd = commands[index];
  if (cmd.kind === 'close') return;
  const rp: [number, number] = [round(endpoint[0]), round(endpoint[1])];
  if (cmd.kind === 'move' || cmd.kind === 'line') {
    commands[index] = { ...cmd, to: rp };
  } else if (cmd.kind === 'quad') {
    commands[index] = { ...cmd, to: rp };
  } else if (cmd.kind === 'cubic') {
    commands[index] = { ...cmd, to: rp };
  }
};

const isDrawableCommand = (command: PathCommand): boolean => command.kind !== 'move' && command.kind !== 'close';

const precedingMoveIndex = (commands: ReadonlyArray<PathCommand>, commandIndex: number): number => {
  for (let index = commandIndex - 1; index >= 0; index -= 1) {
    if (commands[index].kind === 'move') return index;
    if (isDrawableCommand(commands[index])) break;
  }
  return -1;
};

/** 箭头收缩改写所需上下文 */
export type ApplyArrowShrinksContext = {
  shrinkStart: number;
  shrinkEnd: number;
  strokeWidth: number;
  round: (n: number) => number;
};

/** 按箭头收缩量改写 path 首尾端点 */
export const applyArrowShrinks = (commands: Array<PathCommand>, context: ApplyArrowShrinksContext): void => {
  const { shrinkStart, shrinkEnd, strokeWidth, round } = context;
  if (shrinkStart !== 0) {
    const firstDrawableIndex = commands.findIndex(isDrawableCommand);
    const moveIndex = precedingMoveIndex(commands, firstDrawableIndex);
    if (firstDrawableIndex >= 0 && moveIndex >= 0) {
      const command = commands[firstDrawableIndex];
      if (command.kind === 'arc' || command.kind === 'ellipseArc') {
        const trimmed = trimArcStart(command, shrinkStart * strokeWidth);
        commands[firstDrawableIndex] = trimmed;
        setEndpoint({
          commands,
          index: moveIndex,
          endpoint: arcCommandPointAt(trimmed, trimmed.startAngle),
          round,
        });
      } else {
        const move = commands[moveIndex];
        const nextPoint = endpointOf(command);
        if (move.kind === 'move' && nextPoint) {
          const shifted = point.shiftToward([move.to[0], move.to[1]], nextPoint, shrinkStart * strokeWidth);
          setEndpoint({ commands, index: moveIndex, endpoint: shifted, round });
        }
      }
    }
  }
  if (shrinkEnd !== 0) {
    let lastDrawableIndex = -1;
    for (let i = commands.length - 1; i >= 0; i--) {
      if (isDrawableCommand(commands[i])) {
        lastDrawableIndex = i;
        break;
      }
    }
    if (lastDrawableIndex >= 0) {
      const command = commands[lastDrawableIndex];
      if (command.kind === 'arc' || command.kind === 'ellipseArc') {
        commands[lastDrawableIndex] = trimArcEnd(command, shrinkEnd * strokeWidth);
        return;
      }
      let prevIdx = lastDrawableIndex - 1;
      while (prevIdx >= 0 && commands[prevIdx].kind === 'close') prevIdx--;
      if (prevIdx >= 0) {
        const curPt = endpointOf(command);
        const prevPt = endpointOf(commands[prevIdx]);
        if (curPt && prevPt) {
          const shifted = point.shiftToward(curPt, prevPt, shrinkEnd * strokeWidth);
          setEndpoint({ commands, index: lastDrawableIndex, endpoint: shifted, round });
        }
      }
    }
  }
};
