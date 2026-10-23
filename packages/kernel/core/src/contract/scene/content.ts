import { RetikzCoreError, RetikzCoreErrorCode } from '../../error';
import type { Scene, ScenePrimitive, SceneResource } from './scene';

/** 场景内容访问位置，资源内部继承使用处的宿主身份 */
export type SceneContentSite = Readonly<{
  /** 当前使用处所属的宿主 */
  hostId: string | undefined;
  /** 是否位于箭头或 Pattern 内容中 */
  resourceContent: boolean;
  /** 可定位失败的内容路径 */
  path: string;
}>;

/** 遍历完整场景及其使用的资源内容，同时检查引用闭包和活动路径循环 */
export const visitSceneContent = (
  scene: Pick<Scene, 'primitives' | 'resources'>,
  visit: (primitive: ScenePrimitive, site: SceneContentSite) => void,
): void => {
  const resources = new Map<string, SceneResource>();
  const active = new Set<object>();
  const fail = (path: string, reason: string): never => {
    throw new RetikzCoreError(RetikzCoreErrorCode.Compile, `Scene content ${path}: ${reason}`);
  };
  for (const resource of scene.resources ?? []) {
    if (resources.has(resource.id)) fail(`resources.${resource.id}`, 'duplicate resource id');
    resources.set(resource.id, resource);
  }
  const enter = (value: object, path: string, action: () => void): void => {
    if (active.has(value)) fail(path, 'cyclic content or resource dependency');
    active.add(value);
    try {
      action();
    } finally {
      active.delete(value);
    }
  };
  const visitResourceReference = (id: string, kind: SceneResource['kind'], site: SceneContentSite): void => {
    const resource = resources.get(id);
    if (resource === undefined || resource.kind !== kind) {
      fail(site.path, `expected ${kind} resource '${id}'`);
      return;
    }
    if (resource.kind === 'paint' && resource.tile !== undefined) {
      const tile = resource.tile;
      enter(resource, site.path, () =>
        tile.motif.forEach((child, index) =>
          walk(child, {
            ...site,
            resourceContent: true,
            path: `${site.path}.resource(${id}).motif[${index}]`,
          }),
        ),
      );
    }
  };
  const walk = (primitive: ScenePrimitive, inherited: SceneContentSite): void => {
    const site = {
      ...inherited,
      hostId: inherited.resourceContent ? inherited.hostId : (primitive.id ?? inherited.hostId),
    };
    enter(primitive, site.path, () => {
      visit(primitive, site);
      if (primitive.type === 'group') {
        if (primitive.clipRef !== undefined) visitResourceReference(primitive.clipRef, 'clip', site);
        primitive.children.forEach((child, index) => walk(child, { ...site, path: `${site.path}.children[${index}]` }));
        return;
      }
      if (primitive.type === 'text') return;
      for (const field of ['fill', 'stroke'] as const) {
        const paint = primitive[field];
        if (typeof paint === 'object' && paint.kind === 'resourceRef')
          visitResourceReference(paint.id, 'paint', { ...site, path: `${site.path}.${field}` });
      }
      if (primitive.type === 'path') {
        for (const field of ['arrowStart', 'arrowEnd'] as const) {
          const arrow = primitive[field];
          if (arrow === undefined) continue;
          enter(arrow, `${site.path}.${field}`, () =>
            arrow.marker.forEach((child, index) =>
              walk(child, {
                ...site,
                resourceContent: true,
                path: `${site.path}.${field}.marker[${index}]`,
              }),
            ),
          );
        }
      }
    });
  };
  scene.primitives.forEach((primitive, index) =>
    walk(primitive, { hostId: undefined, resourceContent: false, path: `primitives[${index}]` }),
  );
};
