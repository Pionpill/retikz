import type { ClipResource, PathCommand, SceneClipPath } from '../../contract';
import { guardProviderOutput } from '../../resolve';
import {
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve/diagnostics';
import type { ClipResolution } from '../../resolve/resource';
import { createResourceId, serializeResourceContent, storeSceneResource } from './identity';

/** 生成裁剪路径并登记可复用资源 */
export type ClipRegistry = {
  /** 生成规范路径，供预检保存或登记资源 */
  lower: (clip: ClipResolution) => SceneClipPath;
  /** 生成路径并登记裁剪资源 */
  register: (clip: ClipResolution) => string;
  /** 登记已生成的规范路径 */
  registerPath: (path: SceneClipPath) => string;
  /** 导入完整资源并保留内容身份 */
  importResource: (resource: ClipResource) => string;
  /** 按首次登记顺序返回裁剪资源 */
  getResources: () => Array<ClipResource>;
};

/** 一次裁剪转换允许访问的声明数量 */
export const DEFAULT_MAX_CLIP_DEPTH = 32;

/** 物化并规范化裁剪路径，建立唯一 SceneClipPath 字段顺序 */
const canonicalizeClipPath = (path: SceneClipPath, owner: string, round: (n: number) => number): SceneClipPath =>
  guardProviderOutput(owner, () => {
    const roundPoint = ([x, y]: [number, number]): [number, number] => [round(x), round(y)];
    /** 防止有效半径在编译取整后退化为零或非有限值 */
    const roundRadius = (radius: number, field: string): number => {
      const rounded = round(radius);
      if (!Number.isFinite(rounded) || rounded <= 0) {
        throw createCompositeContractError(
          `Clip shape 'path' has an invalid ${field} (${String(rounded)}); it must be a finite number greater than 0.`,
        );
      }
      return rounded;
    };
    const { commands: sourceCommands, fillRule } = path;
    const commands: Array<PathCommand> = [];

    let activeSubpath = false;
    let hasDrawingSegment = false;

    for (const [index, command] of sourceCommands.entries()) {
      switch (command.kind) {
        case 'move':
          commands.push({ kind: 'move', to: roundPoint(command.to) });
          activeSubpath = true;
          break;
        case 'line':
          if (!activeSubpath) {
            throw createCompositeContractError(
              `${owner} lower returned '${command.kind}' at command ${index} without an active subpath.`,
            );
          }
          commands.push({ kind: 'line', to: roundPoint(command.to) });
          hasDrawingSegment = true;
          break;
        case 'quad':
          if (!activeSubpath) {
            throw createCompositeContractError(
              `${owner} lower returned '${command.kind}' at command ${index} without an active subpath.`,
            );
          }
          commands.push({
            kind: 'quad',
            control: roundPoint(command.control),
            to: roundPoint(command.to),
          });
          hasDrawingSegment = true;
          break;
        case 'cubic':
          if (!activeSubpath) {
            throw createCompositeContractError(
              `${owner} lower returned '${command.kind}' at command ${index} without an active subpath.`,
            );
          }
          commands.push({
            kind: 'cubic',
            control1: roundPoint(command.control1),
            control2: roundPoint(command.control2),
            to: roundPoint(command.to),
          });
          hasDrawingSegment = true;
          break;
        case 'arc':
          commands.push({
            kind: 'arc',
            center: roundPoint(command.center),
            radius: roundRadius(command.radius, 'radius'),
            startAngle: round(command.startAngle),
            endAngle: round(command.endAngle),
            ...(command.counterClockwise !== undefined ? { counterClockwise: command.counterClockwise } : {}),
          });
          activeSubpath = true;
          hasDrawingSegment = true;
          break;
        case 'ellipseArc':
          commands.push({
            kind: 'ellipseArc',
            center: roundPoint(command.center),
            radiusX: roundRadius(command.radiusX, 'radiusX'),
            radiusY: roundRadius(command.radiusY, 'radiusY'),
            ...(command.rotation !== undefined ? { rotation: round(command.rotation) } : {}),
            startAngle: round(command.startAngle),
            endAngle: round(command.endAngle),
            ...(command.counterClockwise !== undefined ? { counterClockwise: command.counterClockwise } : {}),
          });
          activeSubpath = true;
          hasDrawingSegment = true;
          break;
        case 'close':
          if (!activeSubpath) {
            throw createCompositeContractError(
              `${owner} lower returned '${command.kind}' at command ${index} without an active subpath.`,
            );
          }
          commands.push({ kind: 'close' });
          activeSubpath = false;
          break;
      }
    }

    if (!hasDrawingSegment) {
      throw createCompositeContractError(`${owner} lower returned a SceneClipPath without a drawing segment.`);
    }

    return {
      commands,
      fillRule,
    };
  });

/** 创建一次 compile 隔离的单一 Clip Definition 资源注册表 */
export const createClipRegistry = (
  round: (n: number) => number,
  maxClipDepth = DEFAULT_MAX_CLIP_DEPTH,
): ClipRegistry => {
  type ClipTraversalGuard = {
    visited: number;
    readonly max: number;
    readonly active: WeakSet<object>;
  };

  const resources = new Map<string, ClipResource>();

  const lowerClip = (resolution: ClipResolution, guard: ClipTraversalGuard): SceneClipPath => {
    const { kind, definition, params } = resolution;
    const entered: Array<object> = [];
    for (const value of [resolution.spec, params]) {
      if (entered.includes(value)) continue;
      if (guard.active.has(value)) {
        throw createCompositeContractError('Clip traversal detected a cyclic clip object.');
      }
      guard.active.add(value);
      entered.push(value);
    }
    try {
      if (guard.visited >= guard.max) {
        throw createCompositeContractError(
          `Clip traversal exceeded CompileOptions.maxClipDepth ${guard.max} while entering clip '${kind}'.`,
        );
      }
      guard.visited += 1;
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
      entered.forEach(value => guard.active.delete(value));
    }
  };

  const importResource = (resource: ClipResource): string => {
    storeSceneResource(resource, resources);
    return resource.id;
  };

  const registerPath = (path: SceneClipPath): string => {
    const id = createResourceId('clip', serializeResourceContent(path));
    return importResource({ kind: 'clip', id, path });
  };

  const lower = (clip: ClipResolution): SceneClipPath =>
    lowerClip(clip, { visited: 0, max: maxClipDepth, active: new WeakSet() });
  const register = (clip: ClipResolution): string => registerPath(lower(clip));
  return { lower, register, registerPath, importResource, getResources: () => [...resources.values()] };
};
