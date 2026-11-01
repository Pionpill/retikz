import type { PaintValue, ScenePrimitive, SceneResource } from '../../contract';
import { createCompileInvariantError } from '../shared';
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

/** 导入已编译资源并建立 ID 映射；Pattern 内容不持有资源引用 */
export const importSceneResources = (
  resources: ReadonlyArray<SceneResource>,
  paint: PaintRegistry,
  clip: ClipRegistry,
): Map<string, string> => {
  const ids = new Map<string, string>();
  for (const resource of resources) {
    if (resource.kind === 'clip') {
      ids.set(resource.id, clip.importResource(resource.path));
    } else {
      ids.set(resource.id, paint.importResource(resource).id);
    }
  }
  return ids;
};
