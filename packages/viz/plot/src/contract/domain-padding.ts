import type { ExternalRow } from '@retikz/data';

import type { MarkChannels } from './channel';
import type { PositionScale } from './scale';

/** 逐点域留白的独立观测目标 */
export type DomainPaddingTarget = {
  /** 按 coordinate roles 排列的位置值 */
  values: ReadonlyArray<unknown>;
  /** 各角色方向上的尺寸半径，单位为屏幕输出单位 */
  extent: ReadonlyArray<number>;
};

/** Mark 提供已完成尺寸映射、尚未执行位置映射的观测目标 */
export type MarkDomainPaddingCapability<T> = (
  mark: T,
  rows: Array<ExternalRow>,
  roles: ReadonlyArray<string>,
  channels: MarkChannels,
) => Array<DomainPaddingTarget>;

/** 可逆且对 range 仿射的位置映射 */
export type DomainPaddingScale = {
  /** 不钳位的基准域归一化映射，非法值返回 NaN */
  normalize: (value: unknown) => number;
  /** 两端留白以有效 range 比例表示，创建最终位置 scale */
  createScale: (padding: { lower: number; upper: number }, range: readonly [number, number]) => PositionScale;
};

/** Coordinate 声明相互独立、以屏幕单位度量的直线位置角色 */
export type CoordinateDomainPaddingCapability = {
  /** 支持逐点留白的轴向角色 */
  roles: ReadonlyArray<string>;
};
