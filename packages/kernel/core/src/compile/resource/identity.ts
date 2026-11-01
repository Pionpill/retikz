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
  let hash = 0x6c62272e07bb014262b821756295c58dn;
  for (let index = 0; index < content.length; index++) {
    const code = content.charCodeAt(index);
    hash = BigInt.asUintN(128, (hash ^ BigInt(code & 0xff)) * 0x1000000000000000000013bn);
    hash = BigInt.asUintN(128, (hash ^ BigInt(code >>> 8)) * 0x1000000000000000000013bn);
  }
  return `${kind}-${hash.toString(16).padStart(32, '0')}`;
};

/** 保留资源身份并去重；摘要冲突不能静默覆盖已有内容 */
export const storeSceneResource = <T extends SceneResource>(resource: T, resources: Map<string, T>): void => {
  const existing = resources.get(resource.id);
  if (existing === undefined) {
    resources.set(resource.id, resource);
  } else if (existing !== resource && serializeResourceContent(existing) !== serializeResourceContent(resource)) {
    throw createCompileInvariantError(`Resource '${resource.id}' has conflicting content`);
  }
};
