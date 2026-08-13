import type { BoundsRect } from '@retikz/math';

import type { IRJsonObject } from '../../schemas';
import type { CompileOccurrenceLocator } from '../occurrence';

/** Composite 在自身 allocation coordinate 中声明的局部空间区域 */
export type SpatialHandleDeclaration = Readonly<{
  /** 当前 owner occurrence 内唯一的稳定 key */
  key: string;
  /** owner 自行定义的稳定领域角色 */
  role: string;
  /** 当前 composite allocation coordinate 中的有限非负尺寸 AABB */
  bounds: Readonly<BoundsRect>;
  /** 无顺序匹配语义、但保留 authored order 的唯一非空标签 */
  tags?: ReadonlyArray<string>;
  /** owner 解释的 JSON-safe 领域数据 */
  payload?: Readonly<IRJsonObject>;
}>;

/** qualified handle path 中的单层 composite owner */
export type SpatialHandleOwner = Readonly<{
  /** provider namespace */
  namespace: string;
  /** provider type */
  type: string;
  /** authored composite 的显式 id */
  instanceId?: string;
  /** 当前完整 compile 中已结算的 owner occurrence */
  occurrence: CompileOccurrenceLocator;
}>;

/** 完整 compile 发布的 world-space qualified spatial handle */
export type QualifiedSpatialHandle = Readonly<{
  /** 从外到内的 composite owner path，声明者位于最后 */
  ownerPath: ReadonlyArray<SpatialHandleOwner>;
  /** owner-local key */
  key: string;
  /** owner-defined role */
  role: string;
  /** renderer-neutral world-space geometry */
  geometry: Readonly<{
    kind: 'rect';
    bounds: Readonly<BoundsRect>;
  }>;
  /** 冻结的 authored tags */
  tags: ReadonlyArray<string>;
  /** owner-defined JSON-safe payload */
  payload?: Readonly<IRJsonObject>;
  /** replay / remap 后的最终 declaration occurrence */
  finalOccurrence: CompileOccurrenceLocator;
  /** declaration 首次产生时的 occurrence */
  originOccurrence: CompileOccurrenceLocator;
}>;

/** owner path 的精确查询条件 */
export type SpatialOwnerSelector = Readonly<{
  /** provider namespace */
  namespace: string;
  /** 可选 provider type */
  type?: string;
  /** 可选 authored instance id */
  instanceId?: string;
  /** 可选当前 compile 精确 occurrence */
  occurrence?: CompileOccurrenceLocator;
}>;

/** qualified spatial handle 的闭合查询条件 */
export type SpatialHandleSelector = Readonly<{
  /** declaration owner 之前按顺序连续匹配的祖先子路径 */
  within?: ReadonlyArray<SpatialOwnerSelector>;
  /** declaration owner 的精确条件 */
  owner?: SpatialOwnerSelector;
  /** owner-local key */
  key?: string;
  /** owner-defined role */
  role?: string;
  /** 结果必须全部包含的 tags */
  tags?: ReadonlyArray<string>;
}>;

/** 与 CompileResult 同 revision 发布的不可变空间索引 */
export type SpatialHandleIndex = Readonly<{
  /** compile traversal order + authored declaration order 的稳定条目 */
  entries: ReadonlyArray<QualifiedSpatialHandle>;
}>;
