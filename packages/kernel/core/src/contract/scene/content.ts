import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { Scene, ScenePrimitive, SceneResource } from './scene';

/** 遍历场景内容时的宿主、资源归属与位置上下文 */
export type SceneContentVisitContext = Readonly<{
  /** 当前使用处所属的宿主 */
  hostId: string | undefined;
  /** 是否位于箭头或 Pattern 内容中 */
  isResourceContent: boolean;
  /** 当前内容在 Scene 中的访问路径，用于定位错误 */
  scenePath: string;
}>;

/** 遍历完整场景及其使用的资源内容，同时检查引用闭包和活动路径循环 */
export const visitSceneContent = (
  scene: Pick<Scene, 'primitives' | 'resources'>,
  visit?: (primitive: ScenePrimitive, context: SceneContentVisitContext) => void,
): void => {
  /** 本次遍历的资源索引 Map，键为资源 id，值为资源对象 */
  const resourceMap = new Map<string, SceneResource>();
  /** 当前递归链上的对象 Set，进入时加入、退出时移除，用于检测循环引用 */
  const activeObjects = new Set<object>();
  /** 仅校验时记录已完成的对象，避免共享资源沿不同使用处重复展开 */
  const validatedObjects = new Set<object>();

  /** 抛出包含 Scene 内容位置的错误 */
  const throwSceneContentError = (scenePath: string, reason: string): never => {
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `Scene content ${scenePath}: ${reason}`);
  };

  for (const resource of scene.resources ?? []) {
    if (resourceMap.has(resource.id)) throwSceneContentError(`resources.${resource.id}`, 'duplicate resource id');
    resourceMap.set(resource.id, resource);
  }
  /** 在对象的递归访问作用域内执行操作，正常返回或抛错后均移除活动标记 */
  const withActiveObject = (contentObject: object, scenePath: string, action: () => void): void => {
    if (activeObjects.has(contentObject)) throwSceneContentError(scenePath, 'cyclic content or resource dependency');
    if (visit === undefined && validatedObjects.has(contentObject)) return;
    activeObjects.add(contentObject);
    try {
      action();
      if (visit === undefined) validatedObjects.add(contentObject);
    } finally {
      activeObjects.delete(contentObject);
    }
  };
  /** 查找引用的资源，并沿使用处的宿主上下文访问资源内容 */
  const visitResourceReference = (id: string, kind: SceneResource['kind'], context: SceneContentVisitContext): void => {
    const resource = resourceMap.get(id);
    if (resource === undefined || resource.kind !== kind) {
      throwSceneContentError(context.scenePath, `expected ${kind} resource '${id}'`);
      return;
    }
    if (resource.kind === 'paint' && 'tile' in resource) {
      const tile = resource.tile;
      withActiveObject(resource, context.scenePath, () =>
        tile.motif.forEach((child, index) =>
          visitPrimitive(child, {
            ...context,
            isResourceContent: true,
            scenePath: `${context.scenePath}.resource(${id}).motif[${index}]`,
          }),
        ),
      );
    }
  };
  /** 访问当前图元及其引用内容，递归传递宿主身份与 Scene 路径 */
  const visitPrimitive = (primitive: ScenePrimitive, inheritedContext: SceneContentVisitContext): void => {
    const context = {
      ...inheritedContext,
      hostId: inheritedContext.isResourceContent ? inheritedContext.hostId : (primitive.id ?? inheritedContext.hostId),
    };
    withActiveObject(primitive, context.scenePath, () => {
      visit?.(primitive, context);
      if (primitive.type === 'group') {
        if (primitive.clipRef !== undefined) visitResourceReference(primitive.clipRef, 'clip', context);
        primitive.children.forEach((child, index) =>
          visitPrimitive(child, { ...context, scenePath: `${context.scenePath}.children[${index}]` }),
        );
        return;
      }
      if (primitive.type === 'text') return;
      for (const field of ['fill', 'stroke'] as const) {
        const paint = primitive[field];
        if (typeof paint === 'object' && paint.kind === 'resourceRef')
          visitResourceReference(paint.id, 'paint', { ...context, scenePath: `${context.scenePath}.${field}` });
      }
      if (primitive.type === 'path') {
        for (const field of ['arrowStart', 'arrowEnd'] as const) {
          const arrow = primitive[field];
          if (arrow === undefined) continue;
          withActiveObject(arrow, `${context.scenePath}.${field}`, () =>
            arrow.marker.forEach((child, index) =>
              visitPrimitive(child, {
                ...context,
                isResourceContent: true,
                scenePath: `${context.scenePath}.${field}.marker[${index}]`,
              }),
            ),
          );
        }
      }
    });
  };
  scene.primitives.forEach((primitive, index) =>
    visitPrimitive(primitive, { hostId: undefined, isResourceContent: false, scenePath: `primitives[${index}]` }),
  );
};
