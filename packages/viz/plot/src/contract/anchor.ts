import type { IRCoordinate, IRNodeTarget } from '@retikz/core';

import type { IRPlotAnchorId, IRPlotMarkTarget } from '../schemas';
import type { MarkInstance } from './mark';
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
  /** 当前锚点命名规则使用的前缀 */
  prefix: string;
  /** 同一数据目标中需要区分的锚点角色 */
  role?: string;
};

/** 按图元和数据行生成稳定锚点 id 的扩展函数 */
export type AnchorIdGenerator = (instance: MarkInstance, context: AnchorIdGeneratorContext) => string;

/** 锚点注册表记录的图元归属信息 */
export type AnchorOwner = {
  /** 生成或引用锚点的 mark 类型 */
  markType: string;
  /** 作者提供的所属 mark 身份 */
  markId?: string;
  /** 所属 mark 在声明列表中的索引 */
  markIndex: number;
  /** 同一数据目标中需要区分的锚点角色 */
  role?: string;
} & ({ kind: 'single' } | { kind: 'row'; transformedIndex: number });

/** 图元下沉期间注册、解析并校验锚点引用的运行时接口 */
export type AnchorRegistry = {
  /** 一次求值同时取得实例身份和 Core 标识 */
  identify: (spec: IRPlotAnchorId, instance: MarkInstance, owner: AnchorOwner, field?: string) => MarkAnchorIdentity;
  /** 按常量、字段或生成规则计算当前数据目标的锚点标识 */
  makeId: (spec: IRPlotAnchorId, instance: MarkInstance, owner: AnchorOwner, field?: string) => string;
  /** 登记锚点归属，并拒绝重复标识 */
  register: (id: string, owner: AnchorOwner) => void;
  /** 记录待校验的锚点引用及引用者 */
  reference: (id: string, owner: AnchorOwner) => void;
  /** 登记锚点并生成给定位置的 Core Coordinate */
  coordinate: (id: string, position: [number, number], owner: AnchorOwner) => IRCoordinate;
  /** 在收集结束后检查全部引用是否具有对应锚点 */
  assertResolved: () => void;
};

/** 目标侧身份求值结果，不持久化 */
export type MarkAnchorIdentity = {
  /** 已生成的 Core 标识 */
  id: string;
  /** 数据或生成规则提供的身份 */
  key: unknown;
};

/** 单个视图内的 Mark 目标解析能力 */
export type MarkTargetResolution = {
  /** 登记实际生成的可寻址实体 */
  register: (identity: MarkAnchorIdentity, owner: AnchorOwner, kind: 'node' | 'coordinate') => void;
  /** 解析已经声明并生成的端点目标 */
  reference: (target: IRPlotMarkTarget, instance: MarkInstance, owner: AnchorOwner) => IRNodeTarget;
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
  /** 当前实际视图的 Mark 身份引用 */
  targets?: MarkTargetResolution;
  /** Mark Placement pipeline 已解析的最终屏幕位置 */
  positions?: MarkPositionResolution;
};
