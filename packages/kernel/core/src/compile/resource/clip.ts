import type { ClipDefinition, ClipResource, ClipShape, PathClipShape, PathCommand } from '../../contract';
import type { IRClipSpec } from '../../schemas';

import { providerDefinitionOf } from '../../providers/registry';
import { JsonObjectSchema } from '../../schemas';
import { parseProviderPayload } from '../provider-payload';

export type ClipRegistry = {
  register: (clip: IRClipSpec) => string;
  resources: () => Array<ClipResource>;
};

const clipKindOf = (clip: IRClipSpec): string => clip.kind;

type ClipFieldInput = {
  kind: string;
  field: string;
  value: number;
};

type ClipRoundFieldInput = ClipFieldInput & {
  round: (n: number) => number;
};

type ClipPointInput = {
  kind: string;
  field: string;
  value: [number, number];
  round: (n: number) => number;
};

const bad = ({ kind, field, value, positive = false }: ClipFieldInput & { positive?: boolean }): never => {
  throw new Error(
    `Clip '${kind}' has an invalid ${field} (${String(value)}); it must be a finite number${
      positive ? ' greater than 0' : ''
    }.`,
  );
};

const finite = ({ kind, field, value, round }: ClipRoundFieldInput): number => {
  if (!Number.isFinite(value)) bad({ kind, field, value });
  return round(value);
};

const positive = ({ kind, field, value, round }: ClipRoundFieldInput): number => {
  if (!Number.isFinite(value) || value <= 0) bad({ kind, field, value, positive: true });
  return round(value);
};

const point = ({ kind, field, value, round }: ClipPointInput): [number, number] => [
  finite({ kind, field: `${field}[0]`, value: value[0], round }),
  finite({ kind, field: `${field}[1]`, value: value[1], round }),
];

const roundCommand = (command: PathCommand, round: (n: number) => number): PathCommand => {
  switch (command.kind) {
    case 'move':
      return { kind: 'move', to: point({ kind: 'path', field: 'to', value: command.to, round }) };
    case 'line':
      return { kind: 'line', to: point({ kind: 'path', field: 'to', value: command.to, round }) };
    case 'quad':
      return {
        kind: 'quad',
        control: point({ kind: 'path', field: 'control', value: command.control, round }),
        to: point({ kind: 'path', field: 'to', value: command.to, round }),
      };
    case 'cubic':
      return {
        kind: 'cubic',
        control1: point({ kind: 'path', field: 'control1', value: command.control1, round }),
        control2: point({ kind: 'path', field: 'control2', value: command.control2, round }),
        to: point({ kind: 'path', field: 'to', value: command.to, round }),
      };
    case 'arc':
      return {
        kind: 'arc',
        center: point({ kind: 'path', field: 'center', value: command.center, round }),
        radius: positive({ kind: 'path', field: 'radius', value: command.radius, round }),
        startAngle: finite({ kind: 'path', field: 'startAngle', value: command.startAngle, round }),
        endAngle: finite({ kind: 'path', field: 'endAngle', value: command.endAngle, round }),
        ...(command.counterClockwise !== undefined ? { counterClockwise: command.counterClockwise } : {}),
      };
    case 'ellipseArc':
      return {
        kind: 'ellipseArc',
        center: point({ kind: 'path', field: 'center', value: command.center, round }),
        radiusX: positive({ kind: 'path', field: 'radiusX', value: command.radiusX, round }),
        radiusY: positive({ kind: 'path', field: 'radiusY', value: command.radiusY, round }),
        ...(command.rotation !== undefined
          ? { rotation: finite({ kind: 'path', field: 'rotation', value: command.rotation, round }) }
          : {}),
        startAngle: finite({ kind: 'path', field: 'startAngle', value: command.startAngle, round }),
        endAngle: finite({ kind: 'path', field: 'endAngle', value: command.endAngle, round }),
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
        x: finite({ kind: shape.kind, field: 'x', value: shape.x, round }),
        y: finite({ kind: shape.kind, field: 'y', value: shape.y, round }),
        width: positive({ kind: shape.kind, field: 'width', value: shape.width, round }),
        height: positive({ kind: shape.kind, field: 'height', value: shape.height, round }),
      };
    case 'circle':
      return {
        kind: 'circle',
        cx: finite({ kind: shape.kind, field: 'cx', value: shape.cx, round }),
        cy: finite({ kind: shape.kind, field: 'cy', value: shape.cy, round }),
        r: positive({ kind: shape.kind, field: 'r', value: shape.r, round }),
      };
    case 'ellipse':
      return {
        kind: 'ellipse',
        cx: finite({ kind: shape.kind, field: 'cx', value: shape.cx, round }),
        cy: finite({ kind: shape.kind, field: 'cy', value: shape.cy, round }),
        rx: positive({ kind: shape.kind, field: 'rx', value: shape.rx, round }),
        ry: positive({ kind: shape.kind, field: 'ry', value: shape.ry, round }),
      };
    case 'polygon':
      if (shape.points.length < 3) {
        throw new Error(`Clip 'polygon' needs at least 3 points; got ${shape.points.length}.`);
      }
      return {
        kind: 'polygon',
        points: shape.points.map(([x, y], index) => [
          finite({ kind: shape.kind, field: `points[${index}][0]`, value: x, round }),
          finite({ kind: shape.kind, field: `points[${index}][1]`, value: y, round }),
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
    const parsed = parseProviderPayload({
      capability: 'clip',
      providerName: kind,
      irPath: 'clip',
      payloadName: 'schema',
      schema: definition.schema,
      value: clip,
    });
    JsonObjectSchema.parse(parsed);
    return guardAndRoundShape(definition.resolve(parsed, { round, resolve: resolveShape }), round);
  };
  const register = (clip: IRClipSpec): string => {
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
  return { register, resources: () => list };
};
