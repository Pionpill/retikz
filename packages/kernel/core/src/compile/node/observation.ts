import type { JsonObject } from '@retikz/foundation';
import { NonBlankStringSchema } from '@retikz/foundation';
import type { Position } from '@retikz/math';

import type { GeometryKeyPoint, NodeOwnerOutput, PathCommand } from '../../contract';
import { createCompositeContractError } from '../../resolve/diagnostics';
import { PathCommandSchema } from '../../schemas';
import type { Rect } from '../../shared/geometry';
import { DEG_TO_RAD } from '../../shared/geometry';
import {
  assertProviderOutputKeys,
  providerOutputArray,
  providerOutputRecord,
  snapshotProviderOutputJson,
  snapshotProviderPosition,
  withProviderOutputValidationBoundary,
} from '../scene-primitive';
import { resolveBoundary } from './boundary';
import { nodeBaselineYsOf } from './emit';
import type { NodeLayout } from './types';

/** 空 provider 参数对象 */
const EMPTY_PARAMS: JsonObject = {};

type Round = (value: number) => number;

/** 将局部坐标点按 Node emit 使用的自身旋转投影到 occurrence-local 坐标 */
const rotateNodePoint = (layout: NodeLayout, point: Position, round: Round): Position => {
  const rect = layout.rect;
  const rotation = round(layout.rotateDeg) * DEG_TO_RAD;
  const cos = Math.cos(rotation);
  const sin = Math.sin(rotation);
  const centerX = round(rect.x);
  const centerY = round(rect.y);
  const pointX = round(point[0]);
  const pointY = round(point[1]);
  const dx = pointX - centerX;
  const dy = pointY - centerY;
  return [round(centerX + dx * cos - dy * sin), round(centerY + dx * sin + dy * cos)];
};

/** 取 Node rect 的最终圆整快照 */
const snapshotNodeRect = (layout: NodeLayout, round: Round): Rect => ({
  ...layout.rect,
  x: round(layout.rect.x),
  y: round(layout.rect.y),
  width: round(layout.rect.width),
  height: round(layout.rect.height),
  ...(layout.rect.rotate === undefined ? {} : { rotate: round(layout.rotateDeg) * DEG_TO_RAD }),
});

/** 构造与 Node emit 同源的观测几何矩形；保留原始位置与尺寸，仅采用最终输出的圆整旋转角 */
const observationRectOf = (layout: NodeLayout, round: Round): Rect => ({
  x: layout.rect.x,
  y: layout.rect.y,
  width: layout.rect.width,
  height: layout.rect.height,
  ...(layout.rect.rotate === undefined ? {} : { rotate: round(layout.rotateDeg) * DEG_TO_RAD }),
});

/** 圆整一个已解析 PathCommand，不改变命令种类与可选字段语义 */
const roundPathCommand = (command: PathCommand, round: Round): PathCommand => {
  switch (command.kind) {
    case 'move':
      return { kind: 'move', to: [round(command.to[0]), round(command.to[1])] };
    case 'line':
      return { kind: 'line', to: [round(command.to[0]), round(command.to[1])] };
    case 'quad':
      return {
        kind: 'quad',
        control: [round(command.control[0]), round(command.control[1])],
        to: [round(command.to[0]), round(command.to[1])],
      };
    case 'cubic':
      return {
        kind: 'cubic',
        control1: [round(command.control1[0]), round(command.control1[1])],
        control2: [round(command.control2[0]), round(command.control2[1])],
        to: [round(command.to[0]), round(command.to[1])],
      };
    case 'arc':
      return {
        kind: 'arc',
        center: [round(command.center[0]), round(command.center[1])],
        radius: round(command.radius),
        startAngle: command.startAngle,
        endAngle: command.endAngle,
        ...(command.counterClockwise === undefined ? {} : { counterClockwise: command.counterClockwise }),
      };
    case 'ellipseArc':
      return {
        kind: 'ellipseArc',
        center: [round(command.center[0]), round(command.center[1])],
        radiusX: round(command.radiusX),
        radiusY: round(command.radiusY),
        startAngle: command.startAngle,
        endAngle: command.endAngle,
        ...(command.rotation === undefined ? {} : { rotation: command.rotation }),
        ...(command.counterClockwise === undefined ? {} : { counterClockwise: command.counterClockwise }),
      };
    case 'close':
      return { kind: 'close' };
  }
};

/** 断言 Shape / Boundary outline 的每个子路径都显式 close */
const assertClosedOutline = (owner: string, commands: ReadonlyArray<PathCommand>): void => {
  let open = false;
  for (const [index, command] of commands.entries()) {
    if (command.kind === 'move') {
      if (open) {
        throw createCompositeContractError(`${owner} outline contains an unclosed subpath before command ${index}.`);
      }
      open = true;
      continue;
    }
    if (command.kind === 'close') {
      if (!open) throw createCompositeContractError(`${owner} outline closes without a matching move command.`);
      open = false;
      continue;
    }
    if (!open) throw createCompositeContractError(`${owner} outline command ${index} is outside a subpath.`);
  }
  if (open) throw createCompositeContractError(`${owner} outline must explicitly close every subpath.`);
};

/** 调用并校验 provider 的闭合 outline；空数组是合法空几何 */
const readClosedOutline = (
  owner: string,
  outline: (rect: Rect, params: JsonObject) => ReadonlyArray<PathCommand>,
  rect: Rect,
  params: JsonObject,
): Array<PathCommand> =>
  withProviderOutputValidationBoundary(owner, () => {
    const raw = outline(rect, params);
    const snapshot = snapshotProviderOutputJson(owner, raw, 'outline');
    const parsed = PathCommandSchema.array().parse(snapshot);
    assertClosedOutline(owner, parsed);
    return parsed;
  });

/** 调用并校验 Shape provider 的命名结构关键点 */
const readKeyPoints = (
  owner: string,
  keyPoints: (rect: Rect, params: JsonObject) => ReadonlyArray<GeometryKeyPoint>,
  rect: Rect,
  params: JsonObject,
): Array<GeometryKeyPoint> =>
  withProviderOutputValidationBoundary(owner, () => {
    const raw = keyPoints(rect, params);
    const snapshot = snapshotProviderOutputJson(owner, raw, 'keyPoints');
    const entries = providerOutputArray(owner, snapshot, 'keyPoints');
    const names = new Set<string>();
    return entries.map((entry, index) => {
      const point = providerOutputRecord(owner, entry, `keyPoints[${index}]`);
      assertProviderOutputKeys(owner, point, ['name', 'position'], `keyPoints[${index}]`);
      const parsedName = NonBlankStringSchema.safeParse(point.name);
      if (!parsedName.success) {
        throw createCompositeContractError(`${owner} keyPoints[${index}].name must be a non-blank string.`);
      }
      if (names.has(parsedName.data)) {
        throw createCompositeContractError(`${owner} keyPoints contains duplicate name '${parsedName.data}'.`);
      }
      names.add(parsedName.data);
      return { name: parsedName.data, position: snapshotProviderPosition(owner, point.position) };
    });
  });

/** 从 settled Node layout 投影 occurrence-local 正文内容盒与物理基线 */
const contentOutputOf = (layout: NodeLayout, round: Round): NodeOwnerOutput['content'] => {
  const hasContent = layout.lines !== undefined || layout.inlineBlock !== undefined;
  if (!hasContent) return null;
  const halfWidth = layout.textWidth / 2;
  const top = layout.contentCenter[1] - layout.textHeight / 2;
  const localCorners: NonNullable<NodeOwnerOutput['content']>['corners'] = [
    [layout.contentCenter[0] - halfWidth, top],
    [layout.contentCenter[0] + halfWidth, top],
    [layout.contentCenter[0] + halfWidth, top + layout.textHeight],
    [layout.contentCenter[0] - halfWidth, top + layout.textHeight],
  ];
  const corners = localCorners.map(point => {
    const [x, y] = rotateNodePoint(layout, point, round);
    return [round(x), round(y)] as [number, number];
  }) as NonNullable<NodeOwnerOutput['content']>['corners'];
  const halfBaselineWidth = layout.textWidth / 2;
  const baselineYs = nodeBaselineYsOf(layout, round).observed;
  const baselines = baselineYs.map(baselineY => {
    const from = rotateNodePoint(layout, [layout.contentCenter[0] - halfBaselineWidth, baselineY], round);
    const to = rotateNodePoint(layout, [layout.contentCenter[0] + halfBaselineWidth, baselineY], round);
    return {
      from,
      to,
    };
  });
  return { corners, baselines };
};

/** 从同次 settled NodeLayout 发布 Node owner output */
export const projectNodeOwnerOutput = (layout: NodeLayout, round: Round): NodeOwnerOutput => {
  const shapeParams = layout.shapeParams ?? EMPTY_PARAMS;
  const observationRect = observationRectOf(layout, round);
  const shapeOutline =
    layout.shapeDef.outline === undefined
      ? null
      : readClosedOutline(`Shape '${layout.shapeName}'`, layout.shapeDef.outline, observationRect, shapeParams).map(
          command => roundPathCommand(command, round),
        );
  const shapeKeyPoints =
    layout.shapeDef.keyPoints === undefined
      ? null
      : readKeyPoints(`Shape '${layout.shapeName}'`, layout.shapeDef.keyPoints, observationRect, shapeParams).map(
          point => ({
            name: point.name,
            position: [round(point.position[0]), round(point.position[1])] as [number, number],
          }),
        );

  const boundaryGeometry = resolveBoundary(layout.boundaryResolution, {
    visualDef: layout.shapeDef,
    visualRect: observationRect,
    visualParams: shapeParams,
    irPath: layout.irPath,
    connectionEnvelopeCache:
      layout.connectionEnvelopeCache === undefined ? undefined : new Map(layout.connectionEnvelopeCache),
    connectionEnvelopeWarnings:
      layout.connectionEnvelopeWarnings === undefined ? undefined : new Set(layout.connectionEnvelopeWarnings),
  });
  const boundaryOutline =
    boundaryGeometry.def.outline === undefined
      ? null
      : readClosedOutline(
          `Boundary '${boundaryGeometry.def.name}'`,
          boundaryGeometry.def.outline,
          boundaryGeometry.rect,
          boundaryGeometry.params,
        ).map(command => roundPathCommand(command, round));

  return {
    rect: snapshotNodeRect(layout, round),
    shape: { name: layout.shapeName, outline: shapeOutline, keyPoints: shapeKeyPoints },
    boundary: { name: layout.boundaryResolution.name, outline: boundaryOutline },
    content: contentOutputOf(layout, round),
  };
};
