import type { ClipDefinition, ClipRegistry, IRClip, SceneClipPath } from '@retikz/core';
import { jsonStructuralEquals } from '@retikz/foundation';

/** 单次工作区中成功降解的输入快照与尚未发布的路径 */
type ClipCacheEntry = {
  /** 第二次出现后保存的解析输入快照 */
  params?: IRClip;
  /** 成功生成的路径，首次出现时仅保留供下一次核对 */
  path: SceneClipPath;
  /** 建立复用后用于检测路径变异的内容快照 */
  pathContent?: string;
  /** 真正登记后才保存的资源身份 */
  id?: string;
};

/** 在固定定义环境及遍历预算的工作区内复用裁剪，不跨计算保存状态 */
export const createWorkspaceClipRegistry = (registry: ClipRegistry): ClipRegistry => {
  const entries = new Map<ClipDefinition, Map<string, ClipCacheEntry>>();
  const paths = new WeakMap<SceneClipPath, ClipCacheEntry>();

  const lower: ClipRegistry['lower'] = clip => {
    let key: string;
    try {
      key = JSON.stringify([clip.spec, clip.params]);
    } catch {
      // 循环声明交由 Core 原有遍历守卫报告，不缓存失败
      return registry.lower(clip);
    }
    let definitions = entries.get(clip.definition);
    if (!definitions) {
      definitions = new Map();
      entries.set(clip.definition, definitions);
    }
    // ⚡ 首次输入只保留路径引用；确认重复后才支付参数和路径内容快照成本
    if (!definitions.has(key)) {
      const path = registry.lower(clip);
      definitions.set(key, { path });
      return path;
    }
    const cached = definitions.get(key);
    // ⚡ 比较小输入及路径修改状态，命中时跳过降解、规范化与内容 hash
    if (
      cached &&
      jsonStructuralEquals(cached.params, clip.params) &&
      cached.pathContent === JSON.stringify(cached.path)
    ) {
      return cached.path;
    }
    const params = structuredClone(clip.params);
    const lowered = registry.lower(clip);
    // 首次路径仍可能被调用方修改，只有与本次真实产物一致才沿用其资源身份
    const path = cached && jsonStructuralEquals(cached.path, lowered) ? cached.path : lowered;
    const entry: ClipCacheEntry = { params, path, pathContent: JSON.stringify(path) };
    definitions.set(key, entry);
    paths.set(path, entry);
    return path;
  };

  const registerEntry = (cached: ClipCacheEntry): string => {
    if (cached.id === undefined) cached.id = registry.registerPath(cached.path);
    else registry.importResource({ kind: 'clip', id: cached.id, path: cached.path });
    return cached.id;
  };

  const registerPath: ClipRegistry['registerPath'] = path => {
    const cached = paths.get(path);
    if (!cached || cached.pathContent !== JSON.stringify(path)) return registry.registerPath(path);
    return registerEntry(cached);
  };

  return {
    lower,
    register: clip => {
      const path = lower(clip);
      const cached = paths.get(path);
      // ⚡ lower 已检查或刚创建路径，同步登记不重复遍历命令
      return cached ? registerEntry(cached) : registry.registerPath(path);
    },
    registerPath,
    importResource: registry.importResource,
    getResources: registry.getResources,
  };
};
