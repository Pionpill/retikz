import type { Scene, SceneContentVisitContext, ScenePrimitive, SceneResource } from '@retikz/core';
import { visitSceneContent } from '@retikz/core';

import { RetikzRenderError, RetikzRenderErrorCode } from '../error';

/** 内部 Runtime 持有的稳定场景内容，生命周期内不允许修改 */
type PreparedSceneContent = {
  /** 按资源 id 查询当前快照资源 */
  resourceMap: ReadonlyMap<string, SceneResource>;
  /** 含动画的图元使用处，共享资源按宿主分别保存 */
  animations: Array<{ primitive: ScenePrimitive; context: SceneContentVisitContext }>;
};

/** 仅保存显式接收的 Runtime 快照或私有副本；普通可变 Scene 不进入此缓存 */
const runtimeContentCache = new WeakMap<Scene, PreparedSceneContent>();

/** 将内容检查错误归属到渲染器的拓扑错误边界 */
const throwSceneContentError = (cause: unknown): never => {
  throw new RetikzRenderError(
    RetikzRenderErrorCode.SceneTopologyInvalid,
    `Invalid Scene resource content: ${cause instanceof Error ? cause.message : String(cause)}`,
    { cause },
  );
};

/** 接收 Runtime 的不可变快照或私有稳定副本，校验完成后复用资源索引和动画使用处 */
export const prepareRuntimeSceneContent = (scene: Scene): Scene => {
  if (runtimeContentCache.has(scene)) return scene;
  const animations: PreparedSceneContent['animations'] = [];
  try {
    visitSceneContent(scene, (primitive, context) => {
      if (primitive.animations !== undefined) animations.push({ primitive, context });
    });
  } catch (cause) {
    throwSceneContentError(cause);
  }
  runtimeContentCache.set(scene, {
    resourceMap: new Map((scene.resources ?? []).map(resource => [resource.id, resource])),
    animations,
  });
  return scene;
};

/** 访问动画使用处，Runtime 内容复用已校验的归属，直接 Scene 保持实时读取 */
export const visitSceneAnimations = (
  scene: Scene,
  visit: (primitive: ScenePrimitive, context: SceneContentVisitContext) => void,
): void => {
  const content = runtimeContentCache.get(scene);
  if (content === undefined) {
    visitSceneContent(scene, (primitive, context) => {
      if (primitive.animations !== undefined) visit(primitive, context);
    });
    return;
  }
  for (const entry of content.animations) visit(entry.primitive, entry.context);
};

/** 取得当前场景的有效资源索引，普通可变输入每次重新检查 */
export const resolveSceneResourceMap = (scene: Scene): ReadonlyMap<string, SceneResource> => {
  const content = runtimeContentCache.get(scene);
  if (content !== undefined) return content.resourceMap;
  assertSceneContent(scene);
  return new Map((scene.resources ?? []).map(resource => [resource.id, resource]));
};

/** 在渲染器发布任何输出前检查 Scene 的资源引用闭包 */
const assertSceneContent = (scene: Scene): void => {
  if (runtimeContentCache.has(scene)) return;
  try {
    visitSceneContent(scene);
  } catch (cause) {
    throwSceneContentError(cause);
  }
};
