import type { PaintValue, ScenePrimitive, SceneResource } from '../../contract';
import { visitSceneContent } from '../../contract';
import { createCompileInvariantError } from '../probe-failure';
import type { ClipRegistry } from './clip';
import type { PaintRegistry } from './paint';

const remapPaint = (paint: PaintValue | undefined, ids: ReadonlyMap<string, string>): PaintValue | undefined => {
  if (paint === undefined || typeof paint === 'string' || paint.kind === 'contextStroke') return paint;

  const id = ids.get(paint.id);
  if (id === undefined) throw createCompileInvariantError(`paint resource '${paint.id}' was not imported`);

  return { kind: 'resourceRef', id };
};

/** 按导入后的资源映射复制图元引用，不修改缓存片段 */
export const remapPrimitiveResources = (
  primitive: ScenePrimitive,
  ids: ReadonlyMap<string, string>,
): ScenePrimitive => {
  if (primitive.type === 'group') {
    const clipRef = primitive.clipRef === undefined ? undefined : ids.get(primitive.clipRef);
    if (primitive.clipRef !== undefined && clipRef === undefined) {
      throw createCompileInvariantError(`clip resource '${primitive.clipRef}' was not imported`);
    }

    return {
      ...primitive,
      ...(clipRef !== undefined ? { clipRef } : {}),
      children: primitive.children.map(child => remapPrimitiveResources(child, ids)),
    };
  }

  if (primitive.type === 'text') return { ...primitive };

  const arrows =
    primitive.type === 'path'
      ? {
          ...(primitive.arrowStart
            ? {
                arrowStart: {
                  ...primitive.arrowStart,
                  marker: primitive.arrowStart.marker.map(child => remapPrimitiveResources(child, ids)),
                },
              }
            : {}),
          ...(primitive.arrowEnd
            ? {
                arrowEnd: {
                  ...primitive.arrowEnd,
                  marker: primitive.arrowEnd.marker.map(child => remapPrimitiveResources(child, ids)),
                },
              }
            : {}),
        }
      : {};
  return {
    ...primitive,
    ...arrows,
    fill: remapPaint(primitive.fill, ids),
    stroke: remapPaint(primitive.stroke, ids),
  };
};

/** 按依赖顺序导入资源，并重映射 Pattern 内容中的引用 */
export const importSceneResources = (
  resources: ReadonlyArray<SceneResource>,
  paint: PaintRegistry,
  clip: ClipRegistry,
): Map<string, string> => {
  const ids = new Map<string, string>();
  const resourceMap = new Map(resources.map(resource => [resource.id, resource]));
  // 在任何导入发生前统一检查所有资源内容，共享依赖只校验一次
  visitSceneContent({
    primitives: resources.flatMap(resource =>
      resource.kind === 'paint' && 'tile' in resource ? resource.tile.motif : [],
    ),
    resources: [...resources],
  });
  /** 仅收集图元树中的直接依赖，资源内容由 insert 按资源身份处理一次 */
  const dependencies = (primitives: Array<ScenePrimitive>): void => {
    for (const primitive of primitives) {
      if (primitive.type === 'group') {
        if (primitive.clipRef !== undefined) insert(primitive.clipRef);
        dependencies(primitive.children);
      } else if (primitive.type !== 'text') {
        for (const value of [primitive.fill, primitive.stroke]) {
          if (typeof value === 'object' && value.kind === 'resourceRef') insert(value.id);
        }
        if (primitive.type === 'path') {
          if (primitive.arrowStart !== undefined) dependencies(primitive.arrowStart.marker);
          if (primitive.arrowEnd !== undefined) dependencies(primitive.arrowEnd.marker);
        }
      }
    }
  };
  const insert = (id: string): void => {
    if (ids.has(id)) return;
    const resource = resourceMap.get(id);
    if (!resource) throw createCompileInvariantError(`resource '${id}' was not imported`);
    if (resource.kind === 'clip') {
      ids.set(id, clip.importPath(resource.path));
      return;
    }
    if ('tile' in resource) dependencies(resource.tile.motif);
    const imported = paint.importResolved(
      'tile' in resource
        ? {
            ...resource,
            tile: {
              ...resource.tile,
              motif: resource.tile.motif.map(primitive => remapPrimitiveResources(primitive, ids)),
            },
          }
        : resource,
    );
    if (typeof imported !== 'object' || imported.kind !== 'resourceRef') {
      throw createCompileInvariantError(`paint resource '${id}' did not produce a resourceRef`);
    }
    ids.set(id, imported.id);
  };
  for (const resource of resources) insert(resource.id);
  return ids;
};
