import type { ScenePrimitive } from '../../contract';

/** path 延迟解析时使用的内部占位 primitive */
export type PathPlaceholder = {
  /** 标识等待路径编译结果回填的内部占位项 */
  type: 'path-placeholder';
};

/** compile 内部 sink 元素类型：真 Scene primitive 或编译期占位 */
export type InternalScenePrimitive = ScenePrimitive | PathPlaceholder;

/** zIndex 只作为编译期旁路信息，不写入 Scene primitive */
export type PrimitiveZIndexTable = WeakMap<ScenePrimitive, number>;

/** 创建遍历占位项，使路径可以在节点及目标位置确定后按原顺序替换 */
export const makePathPlaceholder = (): PathPlaceholder => ({ type: 'path-placeholder' });

/** 把占位已回填的内部 sink 收窄回公开 ScenePrimitive[] */
export const sealSink = (sink: Array<InternalScenePrimitive>): Array<ScenePrimitive> => sink as Array<ScenePrimitive>;

/** 记录 primitive 的显式 zIndex */
export const recordPrimitiveZIndex = (
  table: PrimitiveZIndexTable,
  prim: ScenePrimitive,
  zIndex: number | undefined,
): void => {
  if (zIndex !== undefined) table.set(prim, zIndex);
};

/** 按 zIndex 升序稳定排序，同 zIndex 保持原顺序 */
export const stableSortByZIndex = (arr: Array<ScenePrimitive>, table: PrimitiveZIndexTable): Array<ScenePrimitive> => {
  const decorated = arr.map((prim, index) => ({ prim, index, z: table.get(prim) ?? 0 }));
  decorated.sort((a, b) => a.z - b.z || a.index - b.index);

  for (let i = 0; i < arr.length; i++) arr[i] = decorated[i].prim;

  return arr;
};

/** 开发诊断：递归找出残留占位的 index 路径 */
export const collectPlaceholderLocators = (
  prims: ReadonlyArray<InternalScenePrimitive>,
  prefix = 'primitives',
): Array<string> => {
  const locators: Array<string> = [];
  prims.forEach((prim, idx) => {
    if (prim.type === 'path-placeholder') {
      locators.push(`${prefix}[${idx}]`);
    } else if (prim.type === 'group') {
      locators.push(...collectPlaceholderLocators(prim.children, `${prefix}[${idx}].children`));
    }
  });

  return locators;
};
