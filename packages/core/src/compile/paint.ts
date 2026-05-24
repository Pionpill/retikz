import type { IRPaintSpec } from '../ir';
import type { PatternDefinition } from '../patterns';
import type { CompileWarning } from './compile';
import type { PaintValue, SceneResource } from '../primitive';

/** fill 解析器：纯色 string 原样返回；PaintSpec 去重 + 派稳定 id → `{ kind:'resourceRef', id }`；undefined 透传 */
export type PaintResolver = (fill: string | IRPaintSpec | undefined) => PaintValue | undefined;

/** paint 资源登记表：编译期收集 PaintSpec、去重派 id，最后产出 Scene.resources */
export type PaintRegistry = {
  resolve: PaintResolver;
  resources: () => Array<SceneResource>;
};

/**
 * 建一个 paint 登记表
 * @description resolve 对相同 PaintSpec（结构化 JSON 深比较）合并为一个资源、派稳定 id（`paint-1` / `paint-2`…，首见序）。
 *   同一份 IR 编译两次 → 同 id（快照稳定、SSR / CSR 一致）。SVG id 跨实例唯一性由 react adapter 加 useId 前缀解决。
 *   pattern 资源额外查 `effectivePatterns` + 调 `PatternDefinition.emit` 产 tile 写进 `SceneResource.tile`
 *   （未注册名 throw、含可用名）；gradient / image 资源只 spec。
 * @param effectivePatterns 有效 pattern 表（内置 + 注入），供 pattern 资源查表 + emit
 * @param onWarn 编译期警告分发（与 compile 同一 dispatcher）
 */
export const createPaintRegistry = (
  effectivePatterns: Record<string, PatternDefinition>,
  onWarn: (warning: CompileWarning) => void,
): PaintRegistry => {
  // pattern 资源 emit-in-compile 接线（查表 + 调 emit 产 tile）由实现阶段落地；当前 stub 仅去重派 id。
  void effectivePatterns;
  void onWarn;
  const idByKey = new Map<string, string>();
  const list: Array<SceneResource> = [];
  let counter = 0;
  const resolve: PaintResolver = fill => {
    if (fill === undefined) return undefined;
    if (typeof fill === 'string') return fill;
    const key = JSON.stringify(fill);
    let id = idByKey.get(key);
    if (id === undefined) {
      counter += 1;
      id = `paint-${counter}`;
      idByKey.set(key, id);
      list.push({ kind: 'paint', id, spec: fill });
    }
    return { kind: 'resourceRef', id };
  };
  return { resolve, resources: () => list };
};
