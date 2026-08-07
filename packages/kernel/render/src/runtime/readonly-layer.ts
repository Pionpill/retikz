import type { Scene, ScenePrimitive } from '@retikz/core';

/** Render 在主图之后执行的领域中立只读 Scene 图层 */
export type RenderReadonlyLayer = Readonly<{
  /** 单帧内唯一的资源命名空间 key */
  key: string;
  /** 不参与主图 identity、viewport、patch 与交互的普通 Scene */
  scene: Scene;
  /** 从图层局部坐标到主 Scene 坐标的有限仿射矩阵 */
  transform: readonly [number, number, number, number, number, number];
}>;

/** 未配置只读图层时复用的冻结空数组 */
export const EMPTY_READONLY_LAYERS: ReadonlyArray<RenderReadonlyLayer> = Object.freeze([]);

const hasOwn = (value: object, key: PropertyKey): boolean => Object.prototype.hasOwnProperty.call(value, key);

/** 递归拒绝只读图层 primitive 树中的公共身份、元数据与动画语义 */
const assertPrimitiveHasNoPublicRuntimeSemantics = (primitive: ScenePrimitive): void => {
  if (hasOwn(primitive, 'id') || hasOwn(primitive, 'meta') || hasOwn(primitive, 'animations')) {
    throw new Error('Render readonly layer Scene must not contain public id, meta, or animation fields');
  }
  if (primitive.type === 'group') {
    for (const child of primitive.children) assertPrimitiveHasNoPublicRuntimeSemantics(child);
  }
};

/** 深度冻结对象，同时继续遍历已经浅冻结的外层对象 */
const deepFreeze = <T>(value: T): T => {
  if (typeof value !== 'object' || value === null) return value;
  for (const child of Object.values(value)) deepFreeze(child);
  return Object.isFrozen(value) ? value : Object.freeze(value);
};

/** 校验并冻结单帧有序只读图层 */
export const validateReadonlyLayers = (
  input: ReadonlyArray<RenderReadonlyLayer>,
): ReadonlyArray<RenderReadonlyLayer> => {
  if (!Array.isArray(input)) throw new Error('Render readonly layers must be an array');
  if (input.length === 0) return EMPTY_READONLY_LAYERS;
  const keys = new Set<string>();
  for (const layer of input) {
    if (typeof layer !== 'object' || layer === null) throw new Error('Render readonly layer must be an object');
    if (typeof layer.key !== 'string' || layer.key.trim().length === 0) {
      throw new Error('Render readonly layer key must be a non-empty string');
    }
    if (keys.has(layer.key)) throw new Error(`Duplicate Render readonly layer key "${layer.key}"`);
    keys.add(layer.key);
    if (
      !Array.isArray(layer.transform) ||
      layer.transform.length !== 6 ||
      !layer.transform.every((value: unknown) => typeof value === 'number' && Number.isFinite(value))
    ) {
      throw new Error(`Render readonly layer "${layer.key}" transform must contain six finite numbers`);
    }
    if (typeof layer.scene !== 'object' || layer.scene === null || !Array.isArray(layer.scene.primitives)) {
      throw new Error(`Render readonly layer "${layer.key}" Scene is invalid`);
    }
    if (hasOwn(layer.scene, 'animations')) {
      throw new Error(`Render readonly layer "${layer.key}" Scene must not contain root animation fields`);
    }
    for (const primitive of layer.scene.primitives) assertPrimitiveHasNoPublicRuntimeSemantics(primitive);
  }
  return deepFreeze([...input]);
};
