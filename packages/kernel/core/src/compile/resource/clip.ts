import type { ClipResource, ClipShape, PathClipShape, PathCommand } from '../../contract';
import type { ClipResolution } from '../../resolve/resource';

import {
  CompositeContractError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  LayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import { PathCommandSchema } from '../../schemas';
import { snapshotProviderOutputJson, withProviderOutputValidationBoundary } from '../scene-primitive';

export type ClipRegistry = {
  /** compile resource 阶段调用已绑定 provider 生成 shape */
  resolve: (clip: ClipResolution) => ClipShape;
  /** 解析 IR clip 为 canonical ClipShape，不登记资源 */
  register: (clip: ClipResolution) => string;
  /** 提交 probe 已解析的 clip shape，不再次调用 clip provider */
  importResolved: (shape: ClipShape) => string;
  resources: () => Array<ClipResource>;
};

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
  throw new CompositeContractError(
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

const assertResolvedClipShape: (shape: unknown, owner: string) => asserts shape is ClipShape = (shape, owner) => {
  const fail = (detail: string): never => {
    throw new CompositeContractError(`${owner} resolve returned ${detail}.`);
  };
  const ownStringKeys = (value: object, path: string, arrayLength = false): Array<string> => {
    const keys = Reflect.ownKeys(value);
    const stringKeys: Array<string> = [];
    for (const key of keys) {
      if (typeof key === 'symbol') {
        fail(`${path} with an unsupported symbol field`);
      }
      const stringKey = key as string;
      const descriptor = Object.getOwnPropertyDescriptor(value, stringKey);
      if (
        descriptor === undefined ||
        ((!arrayLength || key !== 'length') && (!descriptor.enumerable || !('value' in descriptor)))
      ) {
        fail(`${path} with a hidden or accessor field '${stringKey}'`);
      }
      stringKeys.push(stringKey);
    }
    return stringKeys;
  };
  const object = (value: unknown, path: string): Record<string, unknown> => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) fail(`an invalid ${path}`);
    const prototype = Object.getPrototypeOf(value);
    if (prototype !== Object.prototype && prototype !== null) fail(`a non-plain ${path}`);
    ownStringKeys(value as object, path);
    return value as Record<string, unknown>;
  };
  const array = (value: unknown, path: string): Array<unknown> => {
    if (!Array.isArray(value)) fail(`an invalid ${path}`);
    if (Object.getPrototypeOf(value) !== Array.prototype) fail(`an invalid ${path}`);
    const entries = value as Array<unknown>;
    for (const key of ownStringKeys(entries, path, true)) {
      if (key === 'length') continue;
      if (!/^(?:0|[1-9]\d*)$/.test(key) || Number(key) >= entries.length) {
        fail(`${path} with an unsupported field '${key}'`);
      }
    }
    for (let index = 0; index < entries.length; index += 1) {
      const descriptor = Object.getOwnPropertyDescriptor(entries, String(index));
      if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
        fail(`a sparse or accessor ${path}`);
      }
    }
    return entries;
  };
  const exactKeys = (value: Record<string, unknown>, allowed: ReadonlyArray<string>, path: string): void => {
    const unsupported = ownStringKeys(value, path).filter(key => !allowed.includes(key));
    if (unsupported.length > 0) fail(`${path} with unsupported field(s): ${unsupported.join(', ')}`);
  };
  const finiteNumber = (value: unknown, path: string, positiveValue = false): void => {
    if (typeof value !== 'number' || !Number.isFinite(value) || (positiveValue && value <= 0)) {
      fail(`an invalid ${path}`);
    }
  };
  const pointValue = (value: unknown, path: string): void => {
    const coordinates = array(value, path);
    if (coordinates.length !== 2) fail(`an invalid ${path}`);
    finiteNumber(coordinates[0], `${path}[0]`);
    finiteNumber(coordinates[1], `${path}[1]`);
  };
  const jsonActive = new WeakSet<object>();
  const assertJsonValue = (value: unknown, path: string): void => {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number') {
      finiteNumber(value, path);
      return;
    }
    if (typeof value !== 'object') fail(`a non-JSON ${path}`);
    const objectValue = value as object;
    if (jsonActive.has(objectValue)) fail(`a cyclic ${path}`);
    jsonActive.add(objectValue);
    try {
      if (Array.isArray(value)) {
        array(value, path).forEach((entry, index) => assertJsonValue(entry, `${path}[${index}]`));
      } else {
        const record = object(value, path);
        for (const key of ownStringKeys(record, path)) assertJsonValue(record[key], `${path}.${key}`);
      }
    } finally {
      jsonActive.delete(objectValue);
    }
  };
  const active = new WeakSet<object>();
  const visit = (value: unknown, path: string): void => {
    const candidate = object(value, path);
    switch (candidate.kind) {
      case 'rect':
        exactKeys(candidate, ['kind', 'x', 'y', 'width', 'height'], path);
        finiteNumber(candidate.x, `${path}.x`);
        finiteNumber(candidate.y, `${path}.y`);
        finiteNumber(candidate.width, `${path}.width`, true);
        finiteNumber(candidate.height, `${path}.height`, true);
        return;
      case 'circle':
        exactKeys(candidate, ['kind', 'cx', 'cy', 'r'], path);
        finiteNumber(candidate.cx, `${path}.cx`);
        finiteNumber(candidate.cy, `${path}.cy`);
        finiteNumber(candidate.r, `${path}.r`, true);
        return;
      case 'ellipse':
        exactKeys(candidate, ['kind', 'cx', 'cy', 'rx', 'ry'], path);
        finiteNumber(candidate.cx, `${path}.cx`);
        finiteNumber(candidate.cy, `${path}.cy`);
        finiteNumber(candidate.rx, `${path}.rx`, true);
        finiteNumber(candidate.ry, `${path}.ry`, true);
        return;
      case 'polygon': {
        exactKeys(candidate, ['kind', 'points'], path);
        const polygonPoints = array(candidate.points, `${path}.points`);
        if (polygonPoints.length < 3) fail(`an invalid ${path}.points`);
        polygonPoints.forEach((polygonPoint, index) => pointValue(polygonPoint, `${path}.points[${index}]`));
        return;
      }
      case 'path': {
        exactKeys(candidate, ['kind', 'commands', 'fillRule'], path);
        const commands = array(candidate.commands, `${path}.commands`);
        if (commands.length === 0) {
          fail(`an invalid ${path}.commands`);
        }
        commands.forEach((command, index) => {
          assertJsonValue(command, `${path}.commands[${index}]`);
          const parsed = PathCommandSchema.safeParse(command);
          if (!parsed.success) {
            throw new CompositeContractError(`${owner} resolve returned an invalid ${path}.commands[${index}].`, {
              cause: parsed.error,
            });
          }
        });
        if (candidate.fillRule !== undefined && candidate.fillRule !== 'nonzero' && candidate.fillRule !== 'evenodd') {
          fail(`an invalid ${path}.fillRule`);
        }
        return;
      }
      case 'compound': {
        exactKeys(candidate, ['kind', 'children', 'fillRule'], path);
        const children = array(candidate.children, `${path}.children`);
        if (children.length === 0) {
          fail(`an invalid ${path}.children`);
        }
        if (candidate.fillRule !== undefined && candidate.fillRule !== 'nonzero' && candidate.fillRule !== 'evenodd') {
          fail(`an invalid ${path}.fillRule`);
        }
        if (active.has(candidate)) fail(`a cyclic ${path}`);
        active.add(candidate);
        try {
          children.forEach((child, index) => visit(child, `${path}.children[${index}]`));
        } finally {
          active.delete(candidate);
        }
        return;
      }
      default:
        fail(`an invalid or unknown ${path} kind '${String(candidate.kind)}'`);
    }
  };
  visit(shape, 'root shape');
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
      if (!Array.isArray(shape.points) || shape.points.length < 3) {
        throw new CompositeContractError(
          `Clip 'polygon' needs at least 3 points; got ${Array.isArray(shape.points) ? shape.points.length : 'non-array'}.`,
        );
      }
      return {
        kind: 'polygon',
        points: shape.points.map(([x, y], index) => [
          finite({ kind: shape.kind, field: `points[${index}][0]`, value: x, round }),
          finite({ kind: shape.kind, field: `points[${index}][1]`, value: y, round }),
        ]),
      };
    case 'path': {
      if (!Array.isArray(shape.commands) || shape.commands.length === 0) {
        throw new CompositeContractError("Clip 'path' needs at least 1 command.");
      }
      const rounded: PathClipShape = {
        kind: 'path',
        commands: shape.commands.map(command => roundCommand(command, round)),
      };
      if (shape.fillRule !== undefined) rounded.fillRule = shape.fillRule;
      return rounded;
    }
    case 'compound':
      if (!Array.isArray(shape.children) || shape.children.length === 0) {
        throw new CompositeContractError("Clip 'compound' needs at least 1 child.");
      }
      return {
        kind: 'compound',
        children: shape.children.map(child => guardAndRoundShape(child, round)),
        ...(shape.fillRule !== undefined ? { fillRule: shape.fillRule } : {}),
      };
  }
};

/** 在统一 fatal boundary 内校验并规范化 Clip provider resolved output */
const validateResolvedClipShape = (shape: unknown, owner: string, round: (n: number) => number): ClipShape =>
  withProviderOutputValidationBoundary(owner, () => {
    const snapshot = snapshotProviderOutputJson(owner, shape, 'root shape');
    assertResolvedClipShape(snapshot, owner);
    return guardAndRoundShape(snapshot, round);
  });

export const createClipRegistry = (round: (n: number) => number): ClipRegistry => {
  const idByKey = new Map<string, string>();
  const list: Array<ClipResource> = [];
  let counter = 0;
  const resolveShape = (resolution: ClipResolution): ClipShape => {
    const { kind, definition, params } = resolution;
    let resolved: unknown;
    try {
      resolved = definition.resolve(params as { kind: string }, {
        round,
        resolve: nested => resolveShape(resolution.resolve(nested)),
      });
    } catch (thrown) {
      if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;
      throw new LayoutProbeRecoverableError(`Clip '${kind}' resolve failed: ${safeThrownDetail(thrown)}`, {
        cause: thrown,
        providerKey: `clip:${kind}`,
      });
    }
    return validateResolvedClipShape(resolved, `Clip '${kind}'`, round);
  };
  const importResolved = (shape: ClipShape): string => {
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
  const register = (clip: ClipResolution): string => importResolved(resolveShape(clip));
  return { resolve: resolveShape, register, importResolved, resources: () => list };
};
