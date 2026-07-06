import type { Position } from '@retikz/math';

import type { AnchorValue } from './anchor';

import { Anchor } from './anchor';

/**
 * 极坐标点：相对 origin 的角度 + 半径偏移。
 * @description IR 保留 polar 形态，Scene 编译时统一解析为笛卡尔；origin 可嵌套节点 id、坐标或极坐标。
 */
export type SharedPolarPosition = {
  /**
   * 极坐标原点：节点 id / 笛卡尔坐标 / 嵌套极坐标；省略表示 [0,0]。
   * @default [0, 0]
   */
  origin?: string | Position | SharedPolarPosition;
  /** 角度（度数）：从 +x 轴量起，90 度朝 +y（屏幕下方）。 */
  angle: number;
  /** 半径。 */
  radius: number;
};

/** 结构化相对定位对象。 */
export type SharedAtPositionLike = {
  /** 相对方向。 */
  direction: AnchorValue;
  /** 被引用的节点或坐标 id。 */
  of: string;
  /** 可选距离。 */
  distance?: number;
};

/** 结构化 offset 定位对象。 */
export type SharedOffsetPositionLike = {
  /** 被偏移的基础位置。 */
  of: unknown;
  /** 笛卡尔偏移量。 */
  offset: Position;
};

/** 结构化 between 定位对象。 */
export type SharedBetweenPositionLike = {
  /** 两个待插值端点。 */
  between: [unknown, unknown];
  /** 从第一个端点到第二个端点的比例。 */
  fraction: number;
};

/** 路径端点的非累积相对偏移对象。 */
export type SharedRelativeTargetLike = {
  /** 相对上一端点的偏移量。 */
  relative: Position;
};

/** 路径端点的累积相对偏移对象。 */
export type SharedRelativeAccumulateTargetLike = {
  /** 相对上一端点的累积偏移量。 */
  relativeAccumulate: Position;
};

/** 结构化节点目标对象。 */
export type SharedNodeTargetLike = {
  /** 被引用的节点或坐标 id。 */
  id: string;
  /** 可选 anchor。 */
  anchor?: unknown;
  /** 可选偏移。 */
  offset?: unknown;
  /** 可选 boundary。 */
  boundary?: unknown;
};

const isRecord = (value: unknown): value is Record<PropertyKey, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const isNumber = (value: unknown): value is number => typeof value === 'number';

const isAnchorValue = (value: unknown): value is AnchorValue =>
  typeof value === 'string' && Object.values(Anchor).includes(value as AnchorValue);

/** 判断输入是否为笛卡尔坐标元组。 */
export const isPositionTuple = (value: unknown): value is Position =>
  Array.isArray(value) && value.length === 2 && isNumber(value[0]) && isNumber(value[1]);

/** 判断输入是否为极坐标结构。 */
export const isPolarPositionLike = (value: unknown): value is SharedPolarPosition =>
  isRecord(value) && isNumber(value.angle) && isNumber(value.radius);

/** 判断输入是否为相对节点方向定位结构。 */
export const isAtPositionLike = (value: unknown): value is SharedAtPositionLike =>
  isRecord(value) && isAnchorValue(value.direction) && typeof value.of === 'string';

/** 判断输入是否为 offset 定位结构。 */
export const isOffsetPositionLike = (value: unknown): value is SharedOffsetPositionLike =>
  isRecord(value) && 'of' in value && isPositionTuple(value.offset);

/** 判断输入是否为 between 定位结构。 */
export const isBetweenPositionLike = (value: unknown): value is SharedBetweenPositionLike =>
  isRecord(value) && Array.isArray(value.between) && value.between.length === 2 && isNumber(value.fraction);

/** 判断输入是否为路径端点的非累积相对偏移结构。 */
export const isRelativeTargetLike = (value: unknown): value is SharedRelativeTargetLike =>
  isRecord(value) && isPositionTuple(value.relative);

/** 判断输入是否为路径端点的累积相对偏移结构。 */
export const isRelativeAccumulateTargetLike = (value: unknown): value is SharedRelativeAccumulateTargetLike =>
  isRecord(value) && isPositionTuple(value.relativeAccumulate);

/** 判断输入是否为节点或坐标目标结构。 */
export const isNodeTargetLike = (value: unknown): value is SharedNodeTargetLike =>
  isRecord(value) && typeof value.id === 'string';
