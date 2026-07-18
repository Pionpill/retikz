import type { IRPaintSpec } from '../../schemas';
import type { ClipResource } from './clip';
import type { MarkerPrimitive } from './marker';

/**
 * paint 属性取值词汇表（可用于 fill / stroke，不绑定单一属性）
 * @description 渲染无关：`string` 表示纯色，`resourceRef` 指向 `Scene.resources`，`contextStroke` 继承所在元素描边
 */
export type PaintValue = string | { kind: 'resourceRef'; id: string } | { kind: 'contextStroke' };

/**
 * 已解析 pattern tile
 * @description 描述 tile 周期、可选底色 / 旋转和局部 motif 几何；纯 JSON 数据
 */
export type ResolvedPatternTile = {
  /** tile 周期（user units）；= 解析后 pattern.size（缺省 8） */
  size: number;
  /**
   * tile 背景填充（CSS 串）；缺省透明（字段缺省）
   * @default 透明背景
   */
  background?: string;
  /**
   * 整体旋转角（度）；= pattern.rotation，缺省不旋转（字段缺省）
   * @default 0
   */
  rotation?: number;
  /** 局部 tile 坐标系下的 motif 几何（`MarkerPrimitive` 窄子集，纯数据） */
  motif: Array<MarkerPrimitive>;
};

/**
 * paint 资源（gradient / pattern / image）
 * @description primitive 经 `{ kind:'resourceRef', id }` 引用；pattern 资源额外带已解析 `tile`
 */
export type PaintResource = {
  kind: 'paint';
  id: string;
  spec: IRPaintSpec;
  /** 已解析 pattern tile；仅 pattern 资源有，gradient / image 资源缺省 */
  tile?: ResolvedPatternTile;
};

/**
 * Scene 级渲染无关资源
 * @description 通过 `kind` 区分 paint 与 clip，id 在各资源类型间保持稳定且不冲突
 */
export type SceneResource = PaintResource | ClipResource;
