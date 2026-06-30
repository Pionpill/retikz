import type { ClipDefinition } from '../contract/clip';
import type { ClipResource, ClipShape, PathClipShape } from '../primitive';
import type { PathCommand } from '../primitive/path';
import type { IRClipSpec } from '../schemas';

import { providerDefinitionOf } from '../providers/registry';
import { JsonObjectSchema } from '../schemas';

export type ClipRegistry = {
  resolve: (clip: IRClipSpec) => string;
  resources: () => Array<ClipResource>;
};

const clipKindOf = (clip: IRClipSpec): string => clip.kind;

const bad = (kind: string, field: string, value: number, positive = false): never => {
  throw new Error(
    `Clip '${kind}' has an invalid ${field} (${String(value)}); it must be a finite number${
      positive ? ' greater than 0' : ''
    }.`,
  );
};

const finite = (kind: string, field: string, value: number, round: (n: number) => number): number => {
  if (!Number.isFinite(value)) bad(kind, field, value);
  return round(value);
};

const positive = (kind: string, field: string, value: number, round: (n: number) => number): number => {
  if (!Number.isFinite(value) || value <= 0) bad(kind, field, value, true);
  return round(value);
};

const point = (kind: string, field: string, value: [number, number], round: (n: number) => number): [number, number] => [
  finite(kind, `${field}[0]`, value[0], round),
  finite(kind, `${field}[1]`, value[1], round),
];

const roundCommand = (command: PathCommand, round: (n: number) => number): PathCommand => {
  switch (command.kind) {
    case 'move':
      return { kind: 'move', to: point('path', 'to', command.to, round) };
    case 'line':
      return { kind: 'line', to: point('path', 'to', command.to, round) };
    case 'quad':
      return {
        kind: 'quad',
        control: point('path', 'control', command.control, round),
        to: point('path', 'to', command.to, round),
      };
    case 'cubic':
      return {
        kind: 'cubic',
        control1: point('path', 'control1', command.control1, round),
        control2: point('path', 'control2', command.control2, round),
        to: point('path', 'to', command.to, round),
      };
    case 'arc':
      return {
        kind: 'arc',
        center: point('path', 'center', command.center, round),
        radius: positive('path', 'radius', command.radius, round),
        startAngle: finite('path', 'startAngle', command.startAngle, round),
        endAngle: finite('path', 'endAngle', command.endAngle, round),
        ...(command.counterClockwise !== undefined ? { counterClockwise: command.counterClockwise } : {}),
      };
    case 'ellipseArc':
      return {
        kind: 'ellipseArc',
        center: point('path', 'center', command.center, round),
        radiusX: positive('path', 'radiusX', command.radiusX, round),
        radiusY: positive('path', 'radiusY', command.radiusY, round),
        ...(command.rotation !== undefined ? { rotation: finite('path', 'rotation', command.rotation, round) } : {}),
        startAngle: finite('path', 'startAngle', command.startAngle, round),
        endAngle: finite('path', 'endAngle', command.endAngle, round),
        ...(command.counterClockwise !== undefined ? { counterClockwise: command.counterClockwise } : {}),
      };
    case 'close':
      return { kind: 'close' };
  }
};

const guardAndRoundShape = (shape: ClipShape, round: (n: number) => number): ClipShape => {
  switch (shape.kind) {
    case 'rect':
      return {
        kind: 'rect',
        x: finite(shape.kind, 'x', shape.x, round),
        y: finite(shape.kind, 'y', shape.y, round),
        width: positive(shape.kind, 'width', shape.width, round),
        height: positive(shape.kind, 'height', shape.height, round),
      };
    case 'circle':
      return {
        kind: 'circle',
        cx: finite(shape.kind, 'cx', shape.cx, round),
        cy: finite(shape.kind, 'cy', shape.cy, round),
        r: positive(shape.kind, 'r', shape.r, round),
      };
    case 'ellipse':
      return {
        kind: 'ellipse',
        cx: finite(shape.kind, 'cx', shape.cx, round),
        cy: finite(shape.kind, 'cy', shape.cy, round),
        rx: positive(shape.kind, 'rx', shape.rx, round),
        ry: positive(shape.kind, 'ry', shape.ry, round),
      };
    case 'polygon':
      if (shape.points.length < 3) {
        throw new Error(`Clip 'polygon' needs at least 3 points; got ${shape.points.length}.`);
      }
      return {
        kind: 'polygon',
        points: shape.points.map(([x, y], index) => [
          finite(shape.kind, `points[${index}][0]`, x, round),
          finite(shape.kind, `points[${index}][1]`, y, round),
        ]),
      };
    case 'path': {
      if (shape.commands.length === 0) throw new Error("Clip 'path' needs at least 1 command.");
      const rounded: PathClipShape = {
        kind: 'path',
        commands: shape.commands.map(command => roundCommand(command, round)),
      };
      if (shape.fillRule !== undefined) rounded.fillRule = shape.fillRule;
      return rounded;
    }
    case 'compound':
      if (shape.children.length === 0) throw new Error("Clip 'compound' needs at least 1 child.");
      return {
        kind: 'compound',
        children: shape.children.map(child => guardAndRoundShape(child, round)),
        ...(shape.fillRule !== undefined ? { fillRule: shape.fillRule } : {}),
      };
  }
};

export const createClipRegistry = (
  round: (n: number) => number,
  definitions: ReadonlyMap<string, ClipDefinition>,
): ClipRegistry => {
  const idByKey = new Map<string, string>();
  const list: Array<ClipResource> = [];
  let counter = 0;
  const resolveShape = (clip: IRClipSpec): ClipShape => {
    const kind = clipKindOf(clip);
    const definition = providerDefinitionOf(definitions, kind, { capability: 'clip', optionName: 'clips' });
    const parsed = (() => {
      try {
        return definition.schema.parse(clip);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        throw new Error(`Clip '${kind}' failed schema validation: ${message}`, { cause: error });
      }
    })();
    JsonObjectSchema.parse(parsed);
    return guardAndRoundShape(definition.resolve(parsed, { round, resolve: resolveShape }), round);
  };
  const resolve = (clip: IRClipSpec): string => {
    const shape = resolveShape(clip);
    const key = JSON.stringify(shape);
    let id = idByKey.get(key);
    if (id === undefined) {
      counter += 1;
      id = `clip-${counter}`;
      idByKey.set(key, id);
      list.push({ kind: 'clip', id, shape });
    }
    return id;
  };
  return { resolve, resources: () => list };
};
