import type { IRCoordinate } from '@retikz/core';
import type { ExternalRow } from '@retikz/data';

import type { IRPlotAnchorId } from '../schemas';
import type { MarkPositionResolution } from './position-adjustment';
import type { MarkProvenance } from './provenance';

/** 自定义锚点 id 生成器可读取的图元与数据行上下文 */
export type AnchorIdGeneratorContext = {
  /** 作者提供的 Plot 身份 */
  plotId?: string;
  /** 作者提供的当前 mark 身份 */
  markId?: string;
  /** 当前 mark 在声明列表中的索引 */
  markIndex: number;
  /** 当前行在变换后数据中的索引 */
  transformedIndex: number;
  /** 当前锚点命名规则使用的前缀 */
  prefix: string;
  /** 同一数据目标中需要区分的锚点角色 */
  role?: string;
};

/** 按图元和数据行生成稳定锚点 id 的扩展函数 */
export type AnchorIdGenerator = (row: ExternalRow, context: AnchorIdGeneratorContext) => string;

/** 锚点注册表记录的图元归属信息 */
export type AnchorOwner = {
  /** 生成或引用锚点的 mark 类型 */
  markType: string;
  /** 作者提供的所属 mark 身份 */
  markId?: string;
  /** 所属 mark 在声明列表中的索引 */
  markIndex: number;
  /** 所属行在变换后数据中的索引 */
  transformedIndex: number;
  /** 同一数据目标中需要区分的锚点角色 */
  role?: string;
};

/** 图元下沉期间注册、解析并校验锚点引用的运行时接口 */
export type AnchorRegistry = {
  /** 按常量、字段或生成规则计算当前数据目标的锚点标识 */
  makeId: (spec: IRPlotAnchorId, row: ExternalRow, owner: AnchorOwner) => string;
  /** 登记锚点归属，并拒绝重复标识 */
  register: (id: string, owner: AnchorOwner) => void;
  /** 记录待校验的锚点引用及引用者 */
  reference: (id: string, owner: AnchorOwner) => void;
  /** 登记锚点并生成给定位置的 Core Coordinate */
  coordinate: (id: string, position: [number, number], owner: AnchorOwner) => IRCoordinate;
  /** 在收集结束后检查全部引用是否具有对应锚点 */
  assertResolved: () => void;
};

/** 单个图元下沉时可用的 provenance 与锚点能力 */
export type MarkLoweringContext = {
  /** 当前 mark 在声明列表中的索引 */
  markIndex: number;
  /** 当前 Plot 的作者身份 */
  plotId?: string;
  /** 当前 mark 的数据来源追踪上下文 */
  provenance?: MarkProvenance;
  /** 当前下沉过程共享的锚点注册与引用能力 */
  anchors?: AnchorRegistry;
  /** Mark Placement pipeline 已解析的最终屏幕位置 */
  positions?: MarkPositionResolution;
};
