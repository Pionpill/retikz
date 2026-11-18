import type { SceneResource } from '../../contract';
import { createCompileInvariantError } from '../shared';

/** 按字段名排序序列化资源内容，省略未定义字段并保留数组顺序 */
export const serializeResourceContent = (value: unknown): string =>
  JSON.stringify(value, (_key, current: unknown) => {
    if (current === null || typeof current !== 'object' || Array.isArray(current)) return current;
    const keys = Object.keys(current);
    const prototype: unknown = Object.getPrototypeOf(current);
    let ordered = true;
    for (let index = 1; index < keys.length; index++) {
      if (keys[index - 1] > keys[index]) {
        ordered = false;
        break;
      }
    }
    // ⚡字段已有稳定顺序的JSON对象直接交给原生序列化，避免逐命令重建与排序
    if (ordered && (prototype === Object.prototype || prototype === null)) return current;
    const sorted: Record<string, unknown> = {};
    for (const key of keys.sort()) {
      const entry: unknown = Reflect.get(current, key);
      if (key === '__proto__')
        Object.defineProperty(sorted, key, { value: entry, enumerable: true, configurable: true, writable: true });
      else sorted[key] = entry;
    }
    return sorted;
  });

/** 对规范内容的 UTF-16LE 字节计算 FNV-1a 128 位摘要，生成与注册顺序无关的资源 ID */
export const formatResourceId = (kind: SceneResource['kind'], content: string): string => {
  // ⚡用八个16位字保持128位状态，按码元更新并用位运算传播进位
  let word0 = 0xc58d;
  let word1 = 0x6295;
  let word2 = 0x2175;
  let word3 = 0x62b8;
  let word4 = 0x0142;
  let word5 = 0x07bb;
  let word6 = 0x272e;
  let word7 = 0x6c62;
  for (let index = 0; index < content.length; index++) {
    const code = content.charCodeAt(index);
    // ⚡低字节异或后的状态记作 X。两次 FNV 乘法合并为 X·P² + correction·P，
    // correction 是第一次乘积异或高字节后的差；ASCII 码元的差为零
    const mixed = word0 ^ (code & 255);
    const firstByte = (mixed * 315) & 255;
    const correction = (firstByte ^ (code >>> 8)) - firstByte;
    // P² ≡ (33689 + 2^16) + (30208 + 2·2^16)·2^80 (mod 2^128)
    // 乘积均小于 2^32，可用无符号移位传播进位；原状态从高到低的依赖用局部值保留
    const previousWord1 = word1;
    const previousWord2 = word2;
    const previousWord3 = word3;
    const previousWord4 = word4;
    const previousWord5 = word5;
    const previousWord6 = word6;
    let product = Math.imul(mixed, 33689) + correction * 315;
    word0 = product & 65535;
    product = Math.imul(word1, 33689) + mixed + (product >>> 16);
    word1 = product & 65535;
    product = Math.imul(word2, 33689) + previousWord1 + (product >>> 16);
    word2 = product & 65535;
    product = Math.imul(word3, 33689) + previousWord2 + (product >>> 16);
    word3 = product & 65535;
    product = Math.imul(word4, 33689) + previousWord3 + (product >>> 16);
    word4 = product & 65535;
    product = Math.imul(word5, 33689) + previousWord4 + (product >>> 16) + Math.imul(mixed, 30208) + correction * 256;
    word5 = product & 65535;
    product = Math.imul(word6, 33689) + previousWord5 + (product >>> 16) + Math.imul(previousWord1, 30208) + mixed * 2;
    word6 = product & 65535;
    word7 =
      (Math.imul(word7, 33689) +
        previousWord6 +
        (product >>> 16) +
        Math.imul(previousWord2, 30208) +
        previousWord1 * 2) &
      65535;
  }
  return `${kind}-${word7.toString(16).padStart(4, '0')}${word6.toString(16).padStart(4, '0')}${word5.toString(16).padStart(4, '0')}${word4.toString(16).padStart(4, '0')}${word3.toString(16).padStart(4, '0')}${word2.toString(16).padStart(4, '0')}${word1.toString(16).padStart(4, '0')}${word0.toString(16).padStart(4, '0')}`;
};

/** 保留资源身份并去重；摘要冲突不能静默覆盖已有内容 */
export const storeSceneResource = <T extends SceneResource>(resource: T, resources: Map<string, T>): void => {
  /** 比较已类型化 JSON 内容，保持序列化对负零、可选 undefined 和数组空位的语义 */
  const isResourceContentEqual = (left: unknown, right: unknown): boolean => {
    if (left === right) return true;
    if (left === null || right === null || typeof left !== 'object' || typeof right !== 'object') return false;
    if (Array.isArray(left)) {
      if (!Array.isArray(right) || left.length !== right.length) return false;
      for (let index = 0; index < left.length; index++) {
        if (!isResourceContentEqual(left[index] ?? null, right[index] ?? null)) return false;
      }
      return true;
    }
    if (Array.isArray(right)) return false;
    let leftCount = 0;
    for (const field of Object.keys(left)) {
      const entry: unknown = Reflect.get(left, field);
      if (entry === undefined) continue;
      if (!Object.hasOwn(right, field) || !isResourceContentEqual(entry, Reflect.get(right, field))) return false;
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
  } else if (!isResourceContentEqual(existing, resource)) {
    throw createCompileInvariantError(`Resource '${resource.id}' has conflicting content`);
  }
};
