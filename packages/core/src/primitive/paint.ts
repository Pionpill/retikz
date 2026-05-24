import type { IRPaintSpec } from '../ir/paint';

/**
 * paint 属性取值词汇表（可用于 fill / stroke，不绑定单一属性）
 * @description 渲染无关：`string` 纯色（含 var() 由 adapter 走 inline style）；`{ kind:'resourceRef' }` 指向
 *   `Scene.resources` 里的 paint server（gradient / 后续 pattern·image）；`{ kind:'contextStroke' }` 继承所在元素描边
 *   （adapter → SVG context-stroke，alpha.8 arrow 用）。
 */
export type PaintValue =
  | string
  | { kind: 'resourceRef'; id: string }
  | { kind: 'contextStroke' };

/**
 * Scene 级渲染无关资源（adapter 各自物化；SVG → `<defs>`）
 * @description discriminated union——本段只 paint（gradient），后续 clip 加 `{ kind:'clip' }` 分支不破契约。
 *   id 由 compile 去重 + 稳定分配，primitive 经 `{ kind:'resourceRef', id }` 引用。
 */
export type SceneResource = { kind: 'paint'; id: string; spec: IRPaintSpec };
