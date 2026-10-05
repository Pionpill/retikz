import type { ExternalRow } from '@retikz/data';

import type { MarkChannels } from './channel';
import type { CoordinateFrame } from './coordinate';
import type { PositionScale } from './scale';

/** 逐点域留白的独立观测目标 */
export type DomainPaddingTarget = {
  /** 与 placement target 一致的稳定身份；启用位置调整时必填 */
  key?: string;
  /** 按 coordinate roles 排列的位置值 */
  values: ReadonlyArray<unknown>;
  /** 各角色方向上的尺寸半径，单位为屏幕输出单位 */
  extent: ReadonlyArray<number>;
};

/**
 * Mark 提供已完成尺寸映射、尚未执行位置映射的观测目标
 * @template T 参与位置定义域留白测量的 mark 类型
 */
export type MarkDomainPaddingCapability<T> = (
  mark: T,
  rows: Array<ExternalRow>,
  roles: ReadonlyArray<string>,
  channels: MarkChannels,
) => Array<DomainPaddingTarget>;

/** 在参数空间中可由两端留白重建的位置映射 */
export type DomainPaddingScale = {
  /** 不钳位的基准域归一化映射，非法值返回 NaN */
  normalize: (value: unknown) => number;
  /** 输出位置到归一化参数；省略表示对 range 仿射，径向面积映射使用平方参数 */
  parameter?: (position: number, range: readonly [number, number]) => number;
  /** 两端留白以归一化参数空间的比例表示，创建最终位置 scale */
  createScale: (padding: { lower: number; upper: number }, range: readonly [number, number]) => PositionScale;
};

/** Coordinate 提供各角色的绘图区边界度量 */
export type CoordinateDomainPaddingCapability = {
  /** 支持逐点留白的轴向角色 */
  roles: ReadonlyArray<string>;
  /** 将屏幕外缘及净空转成两端 role range 距离；循环角色返回 null，不制造接缝 */
  measure?: (context: {
    /** 当前坐标帧 */
    frame: CoordinateFrame;
    /** 当前测量角色 */
    role: string;
    /** 按坐标角色顺序排列的最终映射位置 */
    mappedRoles: ReadonlyArray<number>;
    /** 当前角色上的图元外缘半径 */
    extent: number;
    /** 两端额外净空 */
    clearance: { lower: number; upper: number };
  }) => { lower: number; upper: number } | null;
};
