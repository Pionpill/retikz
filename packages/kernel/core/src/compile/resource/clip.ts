import type { ClipResource, PathCommand, SceneClipPath } from '../../contract';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import type { ClipResolution } from '../../resolve/resource';
import { snapshotProviderOutputJson, withProviderOutputValidationBoundary } from '../scene-primitive';

/** 生成裁剪路径并登记可复用资源 */
export type ClipRegistry = {
  /** 生成规范路径，供预检保存或登记资源 */
  lower: (clip: ClipResolution) => SceneClipPath;
  /** 生成路径并登记裁剪资源 */
  register: (clip: ClipResolution) => string;
  /** 登记已生成的规范路径 */
  importPath: (path: SceneClipPath) => string;
  /** 按首次登记顺序返回裁剪资源 */
  resources: () => Array<ClipResource>;
};

/** 一次裁剪转换允许访问的声明数量 */
export const DEFAULT_MAX_CLIP_DEPTH = 32;

type ClipTraversalGuard = {
  visited: number;
  readonly max: number;
  readonly active: WeakSet<object>;
};

const createClipTraversalGuard = (max: number): ClipTraversalGuard => ({
  visited: 0,
  max,
  active: new WeakSet(),
});

const consumeClipTraversalEdge = (guard: ClipTraversalGuard, stage: string): void => {
  if (guard.visited >= guard.max) {
    throw createCompositeContractError(
      `Clip traversal exceeded CompileOptions.maxClipDepth ${guard.max} while entering ${stage}.`,
    );
  }

  guard.visited += 1;
};

const enterClipTraversalObjects = (
  guard: ClipTraversalGuard,
  values: ReadonlyArray<object>,
  cycleName: string,
): Array<object> => {
  const entered: Array<object> = [];

  for (const value of values) {
    if (entered.includes(value)) continue;
    if (guard.active.has(value)) {
      throw createCompositeContractError(`Clip traversal detected a cyclic ${cycleName} object.`);
    }

    guard.active.add(value);
    entered.push(value);
  }

  return entered;
};

const leaveClipTraversalObjects = (guard: ClipTraversalGuard, values: ReadonlyArray<object>): void => {
  values.forEach(value => guard.active.delete(value));
};

type InputClipField = {
  kind: string;
  field: string;
  value: number;
};

type InputClipRoundField = InputClipField & {
  round: (n: number) => number;
};

type InputClipPoint = {
  kind: string;
  field: string;
  value: [number, number];
  round: (n: number) => number;
};

const bad = ({ kind, field, value, positive = false }: InputClipField & { positive?: boolean }): never => {
  throw createCompositeContractError(
    `Clip shape '${kind}' has an invalid ${field} (${String(value)}); it must be a finite number${
      positive ? ' greater than 0' : ''
    }.`,
  );
};

const finite = ({ kind, field, value, round }: InputClipRoundField): number => {
  if (!Number.isFinite(value)) bad({ kind, field, value });
  const rounded = round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
};

const positive = ({ kind, field, value, round }: InputClipRoundField): number => {
  if (!Number.isFinite(value) || value <= 0) bad({ kind, field, value, positive: true });
  const rounded = round(value);
  if (!Number.isFinite(rounded) || rounded <= 0) bad({ kind, field, value: rounded, positive: true });

  return Object.is(rounded, -0) ? 0 : rounded;
};

const point = ({ kind, field, value, round }: InputClipPoint): [number, number] => [
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

/** 校验 canonical clip path 的有序子路径语法与最小可绘制性 */
const assertClipPathGrammar = (commands: ReadonlyArray<PathCommand>, owner: string): void => {
  let activeSubpath = false;
  let hasDrawingSegment = false;

  for (const [index, command] of commands.entries()) {
    switch (command.kind) {
      case 'move':
        activeSubpath = true;
        continue;
      case 'line':
      case 'quad':
      case 'cubic':
        if (!activeSubpath) {
          throw createCompositeContractError(
            `${owner} lower returned '${command.kind}' at command ${index} without an active subpath.`,
          );
        }

        hasDrawingSegment = true;
        continue;
      case 'arc':
      case 'ellipseArc':
        activeSubpath = true;
        hasDrawingSegment = true;
        continue;
      case 'close':
        if (!activeSubpath) {
          throw createCompositeContractError(
            `${owner} lower returned 'close' at command ${index} without an active subpath.`,
          );
        }

        activeSubpath = false;
        continue;
    }
  }

  if (!hasDrawingSegment) {
    throw createCompositeContractError(`${owner} lower returned a SceneClipPath without a drawing segment.`);
  }
};

/** 物化并规范化裁剪路径，建立唯一 SceneClipPath 字段顺序 */
const canonicalizeClipPath = (path: SceneClipPath, owner: string, round: (n: number) => number): SceneClipPath =>
  withProviderOutputValidationBoundary(owner, () => {
    const { commands, fillRule } = snapshotProviderOutputJson(owner, path, 'root path');
    assertClipPathGrammar(commands, owner);

    return {
      commands: commands.map(command => roundCommand(command, round)),
      fillRule,
    };
  });

/** 创建一次 compile 隔离的单一 Clip Definition 资源注册表 */
export const createClipRegistry = (
  round: (n: number) => number,
  maxClipDepth = DEFAULT_MAX_CLIP_DEPTH,
): ClipRegistry => {
  const idByKey = new Map<string, string>();

  const list: Array<ClipResource> = [];
  let counter = 0;

  const lowerClip = (resolution: ClipResolution, guard: ClipTraversalGuard): SceneClipPath => {
    const { kind, definition, params } = resolution;
    const entered = enterClipTraversalObjects(guard, [resolution.spec, params], 'clip');
    try {
      consumeClipTraversalEdge(guard, `clip '${kind}'`);
      let path: SceneClipPath;
      try {
        path = definition.lower(params, {
          round,
          lower: nested => {
            if (guard.active.has(nested)) {
              throw createCompositeContractError('Clip traversal detected a cyclic clip object.');
            }
            return lowerClip(resolution.resolve(nested), guard);
          },
        });
      } catch (thrown) {
        if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;
        throw createLayoutProbeRecoverableError(
          `Clip provider 'clip:${kind}' lower failed: ${safeThrownDetail(thrown)}`,
          {
            cause: thrown,
            providerKey: `clip:${kind}`,
          },
        );
      }
      return canonicalizeClipPath(path, `Clip provider 'clip:${kind}'`, round);
    } finally {
      leaveClipTraversalObjects(guard, entered);
    }
  };

  const importPath = (path: SceneClipPath): string => {
    const key = JSON.stringify(path);
    let id = idByKey.get(key);
    if (id === undefined) {
      counter += 1;
      id = `clip-${counter}`;
      idByKey.set(key, id);
      list.push({ kind: 'clip', id, path });
    }

    return id;
  };

  const lower = (clip: ClipResolution): SceneClipPath => lowerClip(clip, createClipTraversalGuard(maxClipDepth));
  const register = (clip: ClipResolution): string => importPath(lower(clip));
  return { lower, register, importPath, resources: () => list };
};
