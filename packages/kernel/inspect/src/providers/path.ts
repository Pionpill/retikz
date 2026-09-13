import type { IRChild, IRPosition, IRStep, PathCommand, StrokePathOwnerOutput } from '@retikz/core';

import { StrokePathOwnerOutputSchema } from '@retikz/core';

import { defineInspector } from '../contract';
import { PathInspectOptionsSchema } from '../schema';
import { arcAnglesOf, labelNode, markerNode, pathStyle, pointAtArcCommand, samePosition } from './geometry';

/** 内置 Core stroke Path Inspector key */
export const PATH_INSPECTOR_KEY = Object.freeze({ namespace: 'core', type: 'path' });

type ControlPoint = Readonly<{ position: IRPosition; label: string }>;
type ControlHandle = Readonly<{ from: IRPosition; to: IRPosition }>;
type PathVertex = Readonly<{ position: IRPosition; label: string }>;
type ArcGeometry = Readonly<{
  label: string;
  center: IRPosition;
  start: IRPosition;
  end: IRPosition;
  axisX?: Readonly<{ from: IRPosition; to: IRPosition }>;
  axisY?: Readonly<{ from: IRPosition; to: IRPosition }>;
}>;

/** 计算 arc 与 ellipseArc 命令的最终端点 */
const endpointOfArc = (command: Extract<PathCommand, { kind: 'arc' | 'ellipseArc' }>): IRPosition =>
  pointAtArcCommand(command, command.endAngle);

/** 从 settled Path commands 收集贝塞尔控制柄与控制点 */
const collectControls = (commands: ReadonlyArray<PathCommand>) => {
  const handles: Array<ControlHandle> = [];
  const points: Array<ControlPoint> = [];
  let current: IRPosition | undefined;
  let subpathStart: IRPosition | undefined;
  for (const [index, command] of commands.entries()) {
    if (command.kind === 'move') {
      current = command.to;
      subpathStart = command.to;
    }
    if (command.kind === 'line') current = command.to;
    if (command.kind === 'quad') {
      if (current !== undefined) handles.push({ from: current, to: command.control });
      handles.push({ from: command.control, to: command.to });
      points.push({ position: command.control, label: `Q${index}` });
      current = command.to;
    }
    if (command.kind === 'cubic') {
      if (current !== undefined) handles.push({ from: current, to: command.control1 });
      handles.push({ from: command.control2, to: command.to });
      points.push(
        { position: command.control1, label: `C${index}.1` },
        { position: command.control2, label: `C${index}.2` },
      );
      current = command.to;
    }
    if (command.kind === 'arc' || command.kind === 'ellipseArc') current = endpointOfArc(command);
    if (command.kind === 'close') current = subpathStart;
  }
  return { handles, points };
};

/** 收集最终 Path 的有效端点，按坐标去重后连续编号 */
const collectVertices = (
  commands: ReadonlyArray<PathCommand>,
  isPositionEqual: (left: IRPosition, right: IRPosition) => boolean,
): Array<PathVertex> => {
  const vertices: Array<PathVertex> = [];
  let subpathStart: IRPosition | undefined;

  const add = (position: IRPosition): void => {
    if (vertices.some(vertex => isPositionEqual(vertex.position, position))) return;
    vertices.push({ position, label: `V${vertices.length}` });
  };

  for (const command of commands) {
    switch (command.kind) {
      case 'move':
        subpathStart = command.to;
        add(command.to);
        break;
      case 'line':
      case 'quad':
      case 'cubic':
        add(command.to);
        break;
      case 'arc':
      case 'ellipseArc': {
        const angles = arcAnglesOf(command);
        add(pointAtArcCommand(command, angles.start));
        add(pointAtArcCommand(command, angles.end));
        break;
      }
      case 'close':
        if (subpathStart !== undefined) add(subpathStart);
        break;
    }
  }
  return vertices;
};

/** 收集圆弧中心、端点半径和椭圆旋转主轴 */
const collectArcGeometry = (commands: ReadonlyArray<PathCommand>): Array<ArcGeometry> => {
  const geometry: Array<ArcGeometry> = [];
  for (const [index, command] of commands.entries()) {
    if (command.kind !== 'arc' && command.kind !== 'ellipseArc') continue;
    const angles = arcAnglesOf(command);
    const start = pointAtArcCommand(command, angles.start);
    const end = pointAtArcCommand(command, angles.end);
    if (command.kind === 'arc') {
      geometry.push({ label: `A${index}`, center: command.center, start, end });
      continue;
    }
    const rotation = (command.rotation ?? 0) * (Math.PI / 180);
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const axisX: Readonly<{ from: IRPosition; to: IRPosition }> = {
      from: [command.center[0] - command.radiusX * cos, command.center[1] - command.radiusX * sin],
      to: [command.center[0] + command.radiusX * cos, command.center[1] + command.radiusX * sin],
    };
    const axisY: Readonly<{ from: IRPosition; to: IRPosition }> = {
      from: [command.center[0] + command.radiusY * sin, command.center[1] - command.radiusY * cos],
      to: [command.center[0] - command.radiusY * sin, command.center[1] + command.radiusY * cos],
    };
    geometry.push({ label: `A${index}`, center: command.center, start, end, axisX, axisY });
  }
  return geometry;
};

/** 将控制柄、顶点和圆弧结构转为辅助普通 IR */
const inspectionChildrenOf = (
  subject: StrokePathOwnerOutput,
  options: { controlPoints: boolean; vertices: boolean; arcGeometry: boolean; ellipseAxes: boolean; labels: boolean },
  color: string,
  round: (value: number) => number,
): Array<IRChild> => {
  // 比较输出精度下的坐标，不扩大几何 epsilon，避免吞掉仍可区分的相邻顶点
  const isPositionEqual = (left: IRPosition, right: IRPosition): boolean =>
    round(left[0]) === round(right[0]) && round(left[1]) === round(right[1]);
  const { handles, points } =
    options.controlPoints || options.labels ? collectControls(subject.commands) : { handles: [], points: [] };
  const vertices = options.vertices ? collectVertices(subject.commands, isPositionEqual) : [];
  const arcs = options.arcGeometry || options.ellipseAxes ? collectArcGeometry(subject.commands) : [];
  const output: Array<IRChild> = [];
  const markedPositions: Array<IRPosition> = [];
  const addMarker = (position: IRPosition, size = 6): void => {
    if (markedPositions.some(marked => isPositionEqual(marked, position))) return;
    markedPositions.push(position);
    output.push(markerNode(position, color, size));
  };

  if (options.controlPoints && handles.length > 0) {
    output.push({
      type: 'path',
      children: handles.flatMap(handle => [
        { type: 'step' as const, kind: 'move' as const, to: handle.from },
        { type: 'step' as const, kind: 'line' as const, to: handle.to },
      ]),
      style: pathStyle(color, { strokeOpacity: 0.75, dashPattern: [4, 3] }),
    });
    points.forEach(point => addMarker(point.position));
  }

  if (options.vertices && vertices.length > 0) {
    vertices.forEach(vertex => addMarker(vertex.position, 5));
  }

  if (options.arcGeometry && arcs.length > 0) {
    const radiusChildren = arcs.flatMap(arc => {
      const lines: Array<IRStep> = [
        { type: 'step' as const, kind: 'move' as const, to: arc.center },
        { type: 'step' as const, kind: 'line' as const, to: arc.start },
      ];
      if (!samePosition(arc.start, arc.end)) {
        lines.push(
          { type: 'step' as const, kind: 'move' as const, to: arc.center },
          { type: 'step' as const, kind: 'line' as const, to: arc.end },
        );
      }
      return lines;
    });
    output.push({
      type: 'path',
      children: radiusChildren,
      style: pathStyle(color, { strokeOpacity: 0.75, dashPattern: [4, 3] }),
    });
    arcs.forEach(arc => {
      addMarker(arc.center, 5);
      addMarker(arc.start, 4);
      addMarker(arc.end, 4);
    });
  }

  if (options.ellipseAxes) {
    const children: Array<IRStep> = arcs.flatMap(arc => {
      const lines: Array<IRStep> = [];
      if (arc.axisX !== undefined && arc.axisY !== undefined) {
        lines.push(
          { type: 'step' as const, kind: 'move' as const, to: arc.axisX.from },
          { type: 'step' as const, kind: 'line' as const, to: arc.axisX.to },
          { type: 'step' as const, kind: 'move' as const, to: arc.axisY.from },
          { type: 'step' as const, kind: 'line' as const, to: arc.axisY.to },
        );
      }
      return lines;
    });
    if (children.length > 0)
      output.push({
        type: 'path',
        children,
        style: { ...pathStyle(color, { strokeOpacity: 0.75, dashPattern: [1, 4] }), lineCap: 'round' },
      });
  }

  if (options.labels) {
    output.push(
      ...points.map(point => labelNode([point.position[0] + 6, point.position[1] - 12], point.label, color)),
      ...(options.vertices
        ? vertices.map(vertex => labelNode([vertex.position[0] + 6, vertex.position[1] + 12], vertex.label, color))
        : []),
      ...(options.arcGeometry
        ? arcs.map(arc => labelNode([arc.center[0] + 6, arc.center[1] - 12], arc.label, color))
        : []),
    );
  }
  return output;
};

/** 内置 stroke Path 控制点 Inspector */
export const PATH_INSPECTOR = defineInspector({
  ...PATH_INSPECTOR_KEY,
  owner: { kind: 'path', name: 'stroke' },
  subjectSchema: StrokePathOwnerOutputSchema,
  optionsSchema: PathInspectOptionsSchema,
  mergeOptionsInput: (inherited, local) => {
    const merged = { ...inherited };
    if (local.controlPoints !== undefined) merged.controlPoints = local.controlPoints;
    if (local.vertices !== undefined) merged.vertices = local.vertices;
    if (local.arcGeometry !== undefined) merged.arcGeometry = local.arcGeometry;
    if (local.ellipseAxes !== undefined) merged.ellipseAxes = local.ellipseAxes;
    if (local.labels !== undefined) merged.labels = local.labels;
    return merged;
  },
  inspect: (subject: StrokePathOwnerOutput, context) => {
    const output = inspectionChildrenOf(subject, context.options, context.appearance.scopeColor, context.round);
    return output.map(child => ({
      type: 'scope' as const,
      transforms: subject.transforms,
      defaults: { reset: true },
      children: [child],
    }));
  },
});
