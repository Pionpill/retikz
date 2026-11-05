import type { ClipResource, PathCommand, SceneClipPath } from '../../contract';
import {
  guardProviderOutput,
  createCompositeContractError,
  createLayoutProbeRecoverableError,
  isFatalProbeError,
  isLayoutProbeRecoverableError,
  safeThrownDetail,
} from '../../resolve';
import type { ClipResolution } from '../../resolve';
import { formatResourceId, serializeResourceContent, storeSceneResource } from './identity';

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

    let hasActiveSubpath = false;
    let hasDrawingSegment = false;

    for (const [index, command] of sourceCommands.entries()) {
      switch (command.kind) {
        case 'move':
          commands.push({ kind: 'move', to: roundPoint(command.to) });
          hasActiveSubpath = true;
          break;
        case 'line':
          if (!hasActiveSubpath) {
            throw createCompositeContractError(
              `${owner} lower returned '${command.kind}' at command ${index} without an active subpath.`,
            );
          }
          commands.push({ kind: 'line', to: roundPoint(command.to) });
          hasDrawingSegment = true;
          break;
        case 'quad':
          if (!hasActiveSubpath) {
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
          if (!hasActiveSubpath) {
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
          hasActiveSubpath = true;
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
          hasActiveSubpath = true;
          hasDrawingSegment = true;
          break;
        case 'close':
          if (!hasActiveSubpath) {
            throw createCompositeContractError(
              `${owner} lower returned '${command.kind}' at command ${index} without an active subpath.`,
            );
          }
          commands.push({ kind: 'close' });
          hasActiveSubpath = false;
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
  /** 一次降解的访问预算与当前递归链，退出分支时移除活动对象 */
  type ClipTraversalGuard = {
    /** 已进入的声明数量 */
    visitedCount: number;
    /** 允许进入的声明总数 */
    readonly maxCount: number;
    /** 当前递归链中的声明及参数对象，不是全局已访问集合 */
    readonly activeObjects: WeakSet<object>;
  };

  /** 本次编译按内容身份去重的裁剪资源，保持首次登记顺序 */
  const resourceMap = new Map<string, ClipResource>();

  /** 降解当前裁剪并递归消费子声明，成功或异常退出均清理当前递归链 */
  const lowerClip = (resolution: ClipResolution, guard: ClipTraversalGuard): SceneClipPath => {
    const { kind, definition, params, spec } = resolution;
    /** 本层加入递归链的对象，用于 finally 中成对移除 */
    const entered: Array<object> = [];
    for (const value of [spec, params]) {
      if (entered.includes(value)) continue;
      if (guard.activeObjects.has(value)) {
        throw createCompositeContractError('Clip traversal detected a cyclic clip object.');
      }
      guard.activeObjects.add(value);
      entered.push(value);
    }
    try {
      if (guard.visitedCount >= guard.maxCount) {
        throw createCompositeContractError(
          `Clip traversal exceeded CompileOptions.maxClipDepth ${guard.maxCount} while entering clip '${kind}'.`,
        );
      }
      guard.visitedCount += 1;
      let path: SceneClipPath;
      try {
        path = definition.lower(params, {
          round,
          lower: nested => {
            if (guard.activeObjects.has(nested)) {
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
      entered.forEach(value => guard.activeObjects.delete(value));
    }
  };

  const importResource = (resource: ClipResource): string => {
    storeSceneResource(resource, resourceMap);
    return resource.id;
  };

  const registerPath = (path: SceneClipPath): string => {
    const id = formatResourceId('clip', serializeResourceContent(path));
    return importResource({ kind: 'clip', id, path });
  };

  const lower = (clip: ClipResolution): SceneClipPath =>
    lowerClip(clip, { visitedCount: 0, maxCount: maxClipDepth, activeObjects: new WeakSet() });
  const register = (clip: ClipResolution): string => registerPath(lower(clip));
  return { lower, register, registerPath, importResource, getResources: () => [...resourceMap.values()] };
};
