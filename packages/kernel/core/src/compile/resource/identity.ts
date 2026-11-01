import type { SceneResource } from '../../contract';
import { createCompileInvariantError } from '../shared';

/** 按字段名排序序列化资源内容，省略未定义字段并保留数组顺序 */
export const serializeResourceContent = (value: unknown): string =>
  JSON.stringify(value, (_key, current: unknown) => {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return current;
    return Object.fromEntries(
      Object.keys(current)
        .sort()
        .map(key => [key, Reflect.get(current, key)]),
    );
  });

/** 对规范内容的 UTF-16LE 字节计算 FNV-1a 128 位摘要，生成与注册顺序无关的资源 ID */
export const createResourceId = (kind: SceneResource['kind'], content: string): string => {
  // 四个小端 32 位字保存状态；素数为 2^88 + 315，乘积与进位均处于精确整数范围
  let low = 0x6295c58d;
  let middleLow = 0x62b82175;
  let middleHigh = 0x07bb0142;
  let high = 0x6c62272e;
  for (let index = 0; index < content.length; index++) {
    const code = content.charCodeAt(index);
    for (let shift = 0; shift <= 8; shift += 8) {
      const mixed = (low ^ ((code >>> shift) & 255)) >>> 0;
      const productLow = mixed * 315;
      const productMiddleLow = middleLow * 315 + Math.floor(productLow / 0x100000000);
      const productMiddleHigh =
        middleHigh * 315 + Math.floor(productMiddleLow / 0x100000000) + (mixed & 255) * 0x1000000;
      high =
        (high * 315 + Math.floor(productMiddleHigh / 0x100000000) + (mixed >>> 8) + (middleLow & 255) * 0x1000000) >>>
        0;
      low = productLow >>> 0;
      middleLow = productMiddleLow >>> 0;
      middleHigh = productMiddleHigh >>> 0;
    }
  }
  return `${kind}-${high.toString(16).padStart(8, '0')}${middleHigh.toString(16).padStart(8, '0')}${middleLow.toString(16).padStart(8, '0')}${low.toString(16).padStart(8, '0')}`;
};

/** 保留资源身份并去重；摘要冲突不能静默覆盖已有内容 */
export const storeSceneResource = <T extends SceneResource>(resource: T, resources: Map<string, T>): void => {
  /** 比较已类型化 JSON 内容，保持序列化对负零、可选 undefined 和数组空位的语义 */
  const equalContent = (left: unknown, right: unknown): boolean => {
    if (left === right) return true;
    if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
    if (Array.isArray(left)) {
      if (!Array.isArray(right) || left.length !== right.length) return false;
      for (let index = 0; index < left.length; index++) {
        if (!equalContent(left[index] ?? null, right[index] ?? null)) return false;
      }
      return true;
    }
    if (Array.isArray(right)) return false;
    let leftCount = 0;
    for (const field of Object.keys(left)) {
      const entry: unknown = Reflect.get(left, field);
      if (entry === undefined) continue;
      if (!Object.hasOwn(right, field) || !equalContent(entry, Reflect.get(right, field))) return false;
      leftCount++;
    }
    let rightCount = 0;
    for (const field of Object.keys(right)) {
      if (Reflect.get(right, field) !== undefined) rightCount++;
    }
    return leftCount === rightCount;
  };

  const existing = resources.get(resource.id);
  if (existing === undefined) {
    resources.set(resource.id, resource);
  } else if (!equalContent(existing, resource)) {
    throw createCompileInvariantError(`Resource '${resource.id}' has conflicting content`);
  }
};
