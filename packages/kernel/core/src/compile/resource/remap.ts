import type { PaintValue, ScenePrimitive } from '../../contract';
import { createCompileInvariantError } from '../probe-failure';

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

  return {
    ...primitive,
    fill: remapPaint(primitive.fill, ids),
    stroke: remapPaint(primitive.stroke, ids),
  };
};
