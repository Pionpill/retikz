import type {
  AnyClipShapeDefinition,
  ClipResource,
  ClipShape,
  ClipShapeLowerContext,
  PathCommand,
  SceneClipPath,
} from '../../contract';
import type { ClipResolution } from '../../resolve/resource';

import {
  CompositeContractError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  LayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import { resolveClipShape } from '../../resolve/resource';
import {
  assertProviderOutputKeys,
  assertProviderOutputPathCommands,
  providerOutputArray,
  providerOutputRecord,
  snapshotProviderOutputJson,
  withProviderOutputValidationBoundary,
} from '../scene-primitive';

export type ClipRegistry = {
  /** 调用已绑定 operation provider 生成开放 ClipShape */
  resolve: (clip: ClipResolution) => ClipShape;
  /** 解析 operation、降低 shape 并登记 canonical clip resource */
  register: (clip: ClipResolution) => string;
  /** 提交 probe 已解析的 ClipShape，并经 shape registry 降低 */
  importResolved: (shape: ClipShape) => string;
  /** 提交 probe 已生成的 canonical SceneClipPath */
  importPath: (path: SceneClipPath) => string;
  /** 当前按首次登记顺序保存的 clip resources */
  resources: () => Array<ClipResource>;
};

/** Clip operation resolve 与 ClipShape lower 共用的默认边预算 */
export const DEFAULT_MAX_CLIP_DEPTH = 32;

type ClipTraversalGuard = {
  visited: number;
  readonly max: number;
  readonly active: WeakSet<object>;
};

const createClipTraversalGuard = (max: number, visited = 0): ClipTraversalGuard => ({
  visited,
  max,
  active: new WeakSet(),
});

const consumeClipTraversalEdge = (guard: ClipTraversalGuard, stage: string): void => {
  if (guard.visited >= guard.max) {
    throw new CompositeContractError(
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
      throw new CompositeContractError(`Clip traversal detected a cyclic ${cycleName} object.`);
    }
    guard.active.add(value);
    entered.push(value);
  }
  return entered;
};

const leaveClipTraversalObjects = (guard: ClipTraversalGuard, values: ReadonlyArray<object>): void => {
  values.forEach(value => guard.active.delete(value));
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
    `Clip shape '${kind}' has an invalid ${field} (${String(value)}); it must be a finite number${
      positive ? ' greater than 0' : ''
    }.`,
  );
};

const finite = ({ kind, field, value, round }: ClipRoundFieldInput): number => {
  if (!Number.isFinite(value)) bad({ kind, field, value });
  const rounded = round(value);
  return Object.is(rounded, -0) ? 0 : rounded;
};

const positive = ({ kind, field, value, round }: ClipRoundFieldInput): number => {
  if (!Number.isFinite(value) || value <= 0) bad({ kind, field, value, positive: true });
  const rounded = round(value);
  if (!Number.isFinite(rounded) || rounded <= 0) bad({ kind, field, value: rounded, positive: true });
  return Object.is(rounded, -0) ? 0 : rounded;
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
          throw new CompositeContractError(
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
          throw new CompositeContractError(
            `${owner} lower returned 'close' at command ${index} without an active subpath.`,
          );
        }
        activeSubpath = false;
        continue;
    }
  }
  if (!hasDrawingSegment) {
    throw new CompositeContractError(`${owner} lower returned a SceneClipPath without a drawing segment.`);
  }
};

/** 物化 operation provider 输出，并只收窄开放 ClipShape 的共同判别契约 */
const snapshotResolvedClipShape = (shape: unknown, owner: string): ClipShape =>
  withProviderOutputValidationBoundary(owner, () => {
    const snapshot = snapshotProviderOutputJson(owner, shape, 'root shape');
    const record = providerOutputRecord(owner, snapshot, 'root shape');
    if (typeof record.kind !== 'string' || record.kind.trim().length === 0) {
      throw new CompositeContractError(`${owner} resolve returned a root shape without a non-empty string kind.`);
    }
    return record as ClipShape;
  });

/** 物化并规范化 ClipShape lower 输出，建立唯一 SceneClipPath 字段顺序 */
const canonicalizeClipPath = (path: unknown, owner: string, round: (n: number) => number): SceneClipPath =>
  withProviderOutputValidationBoundary(owner, () => {
    const snapshot = snapshotProviderOutputJson(owner, path, 'SceneClipPath');
    const record = providerOutputRecord(owner, snapshot, 'SceneClipPath');
    assertProviderOutputKeys(owner, record, ['commands', 'fillRule'], 'SceneClipPath');
    const commands = providerOutputArray(owner, record.commands, 'SceneClipPath.commands');
    if (commands.length === 0) {
      throw new CompositeContractError(`${owner} lower returned an empty SceneClipPath.commands.`);
    }
    assertProviderOutputPathCommands(owner, commands, 'SceneClipPath.commands');
    if (record.fillRule !== 'nonzero' && record.fillRule !== 'evenodd') {
      throw new CompositeContractError(`${owner} lower returned an invalid SceneClipPath.fillRule.`);
    }
    assertClipPathGrammar(commands as Array<PathCommand>, owner);
    return {
      commands: (commands as Array<PathCommand>).map(command => roundCommand(command, round)),
      fillRule: record.fillRule,
    };
  });

/** 创建一次 compile 隔离的两级 clip 资源注册表 */
export const createClipRegistry = (
  round: (n: number) => number,
  clipShapes: ReadonlyMap<string, AnyClipShapeDefinition>,
  maxClipDepth = DEFAULT_MAX_CLIP_DEPTH,
): ClipRegistry => {
  const idByKey = new Map<string, string>();
  const visitedByResolvedShape = new WeakMap<object, number>();
  const list: Array<ClipResource> = [];
  let counter = 0;

  const resolveOperation = (resolution: ClipResolution, guard: ClipTraversalGuard): ClipShape => {
    const { kind, definition, params } = resolution;
    const entered = enterClipTraversalObjects(guard, [resolution.spec, params], 'clip operation');
    try {
      consumeClipTraversalEdge(guard, `clip operation '${kind}'`);
      let resolved: unknown;
      try {
        resolved = definition.resolve(params as { kind: string }, {
          round,
          resolve: nested => resolveOperation(resolution.resolve(nested), guard),
        });
      } catch (thrown) {
        if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;
        throw new LayoutProbeRecoverableError(`Clip '${kind}' resolve failed: ${safeThrownDetail(thrown)}`, {
          cause: thrown,
          providerKey: `clip:${kind}`,
        });
      }
      return snapshotResolvedClipShape(resolved, `Clip '${kind}'`);
    } finally {
      leaveClipTraversalObjects(guard, entered);
    }
  };

  const lowerShape = (shape: ClipShape, guard: ClipTraversalGuard): SceneClipPath => {
    const enteredShape = enterClipTraversalObjects(guard, [shape], 'clip shape');
    try {
      consumeClipTraversalEdge(guard, `clip shape '${shape.kind}'`);
      const resolution = resolveClipShape(shape, { clipShapes });
      const { kind, definition, params } = resolution;
      const enteredParams = params === shape ? [] : enterClipTraversalObjects(guard, [params], 'clip shape');
      try {
        let lowered: unknown;
        try {
          const lower = definition.lower as unknown as (
            shape: ClipShape,
            context: ClipShapeLowerContext,
          ) => SceneClipPath;
          lowered = lower(params, {
            round,
            lower: nested => lowerShape(nested, guard),
          });
        } catch (thrown) {
          if (isFatalProbeError(thrown) || isLayoutProbeRecoverableError(thrown)) throw thrown;
          throw new LayoutProbeRecoverableError(`Clip shape '${kind}' lower failed: ${safeThrownDetail(thrown)}`, {
            cause: thrown,
            providerKey: `clipShape:${kind}`,
          });
        }
        return canonicalizeClipPath(lowered, `Clip shape '${kind}'`, round);
      } finally {
        leaveClipTraversalObjects(guard, enteredParams);
      }
    } finally {
      leaveClipTraversalObjects(guard, enteredShape);
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
  const importWithGuard = (shape: ClipShape, guard: ClipTraversalGuard): string => importPath(lowerShape(shape, guard));
  const resolve = (clip: ClipResolution): ClipShape => {
    const guard = createClipTraversalGuard(maxClipDepth);
    const shape = resolveOperation(clip, guard);
    visitedByResolvedShape.set(shape, guard.visited);
    return shape;
  };
  const importResolved = (shape: ClipShape): string =>
    importWithGuard(shape, createClipTraversalGuard(maxClipDepth, visitedByResolvedShape.get(shape) ?? 0));
  const register = (clip: ClipResolution): string => {
    const guard = createClipTraversalGuard(maxClipDepth);
    return importWithGuard(resolveOperation(clip, guard), guard);
  };
  return { resolve, register, importResolved, importPath, resources: () => list };
};
