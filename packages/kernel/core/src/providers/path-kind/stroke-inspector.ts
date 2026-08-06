import { z } from 'zod';

import type { PathCommand, StrokePathInspectionSubject } from '../../contract';
import type { IRChild, IRPosition } from '../../schemas';

import { defineInspector } from '../../contract';

/** 内置 stroke Inspector 的 sparse runtime options */
const StrokePathInspectOptionsInputSchema = z.strictObject({
  controlPoints: z.boolean().optional(),
  labels: z.boolean().optional(),
});

/** 内置 stroke Inspector 的完整 canonical options */
const StrokePathInspectOptionsSchema = StrokePathInspectOptionsInputSchema.transform(value => ({
  controlPoints: value.controlPoints ?? true,
  labels: value.labels ?? false,
}));

type ControlPoint = Readonly<{
  position: IRPosition;
  label: string;
}>;

type ControlHandle = Readonly<{
  from: IRPosition;
  to: IRPosition;
}>;

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

const collectControls = (
  commands: ReadonlyArray<PathCommand>,
): Readonly<{ handles: Array<ControlHandle>; points: Array<ControlPoint> }> => {
  const handles: Array<ControlHandle> = [];
  const points: Array<ControlPoint> = [];
  let current: IRPosition | undefined;
  let subpathStart: IRPosition | undefined;
  commands.forEach((command, commandIndex) => {
    switch (command.kind) {
      case 'move':
        current = command.to;
        subpathStart = command.to;
        break;
      case 'line':
        current = command.to;
        break;
      case 'quad':
        if (current !== undefined) {
          handles.push({ from: current, to: command.control }, { from: command.control, to: command.to });
        }
        points.push({ position: command.control, label: `Q${commandIndex}` });
        current = command.to;
        break;
      case 'cubic':
        if (current !== undefined) handles.push({ from: current, to: command.control1 });
        handles.push({ from: command.control2, to: command.to });
        points.push(
          { position: command.control1, label: `C${commandIndex}.1` },
          { position: command.control2, label: `C${commandIndex}.2` },
        );
        current = command.to;
        break;
      case 'arc':
      case 'ellipseArc':
        current = endpointOfArc(command);
        break;
      case 'close':
        current = subpathStart;
        break;
    }
  });
  return { handles, points };
};

/** 内置 stroke Path 的控制点 Inspector */
export const strokePathInspector = defineInspector({
  kind: 'path',
  optionsInputSchema: StrokePathInspectOptionsInputSchema,
  optionsSchema: StrokePathInspectOptionsSchema,
  inspect: (subject: StrokePathInspectionSubject, context) => {
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
    if (output.length === 0 || subject.transforms.length === 0) return output;
    return { type: 'scope', transforms: subject.transforms, children: output };
  },
});
