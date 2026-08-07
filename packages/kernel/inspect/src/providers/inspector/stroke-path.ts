import type { IRChild, IRPosition, PathCommand, StrokePathOwnerOutput } from '@retikz/core';

import { StrokePathOwnerOutputSchema } from '@retikz/core';
import { z } from 'zod';

import { defineInspector } from '../../contract';

/** 内置 stroke Path Inspector key */
export const STROKE_PATH_INSPECTOR_KEY = Object.freeze({ namespace: 'retikz', name: 'stroke-path' });

/** 内置 stroke Path Inspector sparse options schema */
export const StrokePathInspectOptionsInputSchema = z
  .strictObject({
    controlPoints: z.boolean().optional().describe('Whether control handles and points are visible.'),
    labels: z.boolean().optional().describe('Whether control point labels are visible.'),
  })
  .describe('Sparse stroke Path Inspector options.');

/** 内置 stroke Path Inspector canonical options schema */
export const StrokePathInspectOptionsSchema = StrokePathInspectOptionsInputSchema.transform(value => ({
  controlPoints: value.controlPoints ?? true,
  labels: value.labels ?? false,
})).describe('Canonical stroke Path Inspector options.');

type ControlPoint = Readonly<{ position: IRPosition; label: string }>;
type ControlHandle = Readonly<{ from: IRPosition; to: IRPosition }>;

/** 计算 arc 与 ellipseArc 命令的最终端点 */
const endpointOfArc = (command: Extract<PathCommand, { kind: 'arc' | 'ellipseArc' }>): IRPosition => {
  const angle = (command.endAngle * Math.PI) / 180;
  if (command.kind === 'arc') {
    return [command.center[0] + command.radius * Math.cos(angle), command.center[1] + command.radius * Math.sin(angle)];
  }
  const x = command.radiusX * Math.cos(angle);
  const y = command.radiusY * Math.sin(angle);
  const rotation = ((command.rotation ?? 0) * Math.PI) / 180;
  return [
    command.center[0] + x * Math.cos(rotation) - y * Math.sin(rotation),
    command.center[1] + x * Math.sin(rotation) + y * Math.cos(rotation),
  ];
};

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
  return Object.freeze({ handles: Object.freeze(handles), points: Object.freeze(points) });
};

/** 内置 stroke Path 控制点 Inspector */
export const STROKE_PATH_INSPECTOR = defineInspector({
  ...STROKE_PATH_INSPECTOR_KEY,
  owner: { kind: 'pathKind', name: 'stroke' },
  subjectSchema: StrokePathOwnerOutputSchema,
  optionsInputSchema: StrokePathInspectOptionsInputSchema,
  optionsSchema: StrokePathInspectOptionsSchema,
  inspect: (subject: StrokePathOwnerOutput, context) => {
    const { handles, points } = collectControls(subject.commands);
    const output: Array<IRChild> = [];
    if (context.options.controlPoints && handles.length > 0) {
      output.push({
        type: 'path',
        stroke: context.appearance.scopeColor,
        strokeWidth: 1,
        strokeOpacity: 0.75,
        dashPattern: [4, 3],
        children: handles.flatMap(handle => [
          { type: 'step' as const, kind: 'move' as const, to: handle.from },
          { type: 'step' as const, kind: 'line' as const, to: handle.to },
        ]),
      });
      output.push(
        ...points.map(point => ({
          type: 'node' as const,
          position: point.position,
          shape: 'circle',
          minimumSize: 6,
          padding: 0,
          fill: context.appearance.scopeColor,
          stroke: context.appearance.scopeColor,
          strokeWidth: 1,
        })),
      );
    }
    if (context.options.labels) {
      output.push(
        ...points.map(point => ({
          type: 'node' as const,
          position: [point.position[0] + 6, point.position[1] - 6] as IRPosition,
          text: point.label,
          textColor: context.appearance.scopeColor,
          fill: '#ffffff',
          strokeWidth: 0,
          padding: 2,
          font: { size: 10 },
        })),
      );
    }
    if (subject.transforms.length === 0) return output;
    return output.map(child => ({ type: 'scope' as const, transforms: subject.transforms, children: [child] }));
  },
});
