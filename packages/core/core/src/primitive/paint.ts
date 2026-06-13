import type { IRPaintSpec } from '../ir/paint';
import type { ClipResource } from './clip';
import type { MarkerPrimitive } from './marker';

/**
 * paint 属性取值词汇表（可用于 fill / stroke，不绑定单一属性）
 * @description 渲染无关：`string` 纯色（含 var() 由 adapter 走 inline style）；`{ kind:'resourceRef' }` 指向
 *   `Scene.resources` 里的 paint server（gradient / 后续 pattern·image）；`{ kind:'contextStroke' }` 继承所在元素描边
 *   （adapter → SVG context-stroke）。
 */
export type PaintValue =
  | string
  | { kind: 'resourceRef'; id: string }
  | { kind: 'contextStroke' };

/**
 * 已解析 pattern tile（进 Scene，纯数据，无函数）
 * @description compile 期对 pattern 资源查表 + 调 `PatternDefinition.emit` 产出的"已物化 tile"：
 *   `size` tile 周期（user units）、`background` 可选底色、`rotation` 可选整体旋转（度）、
 *   `motif` 局部 tile 坐标系下的 `MarkerPrimitive[]` 几何。renderer-agnostic：adapter 只把它物化成
 *   `<pattern>`（宽高 = size、可选 background rect、motif 元素），自身不含任何 motif 分支逻辑。
 *   100% JSON 可序列化（无函数）——保 Scene round-trip 等价。
 */
export type ResolvedPatternTile = {
  /** tile 周期（user units）；= 解析后 pattern.size（缺省 8） */
  size: number;
  /** tile 背景填充（CSS 串）；缺省透明（字段缺省） */
  background?: string;
  /** 整体旋转角（度）；= pattern.rotation，缺省不旋转（字段缺省） */
  rotation?: number;
  /** 局部 tile 坐标系下的 motif 几何（`MarkerPrimitive` 窄子集，纯数据） */
  motif: Array<MarkerPrimitive>;
};

/**
 * paint 资源（gradient / pattern / image）
 * @description id 由 compile 去重 + 稳定分配（`paint-1`…），primitive 经 `{ kind:'resourceRef', id }` 引用。
 *   pattern 资源额外带 `tile`（已解析 motif 几何，emit-in-compile 产物）；gradient / image 资源只 `spec`。
 */
export type PaintResource = {
  kind: 'paint';
  id: string;
  spec: IRPaintSpec;
  /** 已解析 pattern tile；仅 pattern 资源有，gradient / image 资源缺省 */
  tile?: ResolvedPatternTile;
};

/**
 * Scene 级渲染无关资源（adapter 各自物化；SVG → `<defs>`）
 * @description discriminated union（`kind`）——`paint`（gradient / pattern / image）与 `clip`（裁剪区）；
 *   消费方按 `kind` 分流。id 由 compile 去重 + 稳定分配（paint-N / clip-N，命名空间不撞），无 SVG-only 特性。
 */
export type SceneResource = PaintResource | ClipResource;
