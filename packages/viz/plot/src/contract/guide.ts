import type { IRScope } from '@retikz/core';

import type { IRPlotAxisGuide } from '../schemas';
import type { Rect } from '../shared';
import type { PolarCoordinateFrame, TernaryVertices } from './coordinate';
import type { ProvenanceContext } from './provenance';
import type { PositionScale, TickSet } from './scale';

/**
 * lowerGuide 上下文。
 * @description cartesian 使用 plotArea / projectX / projectY / ticks；polar 由 frame 驱动圆心、半径和角度几何；
 *   ternary 由三角顶点和共享刻度驱动三边轴几何。该类型只描述 coordinate provider 与 pipeline guide lowering
 *   之间的协议，不承载具体下沉实现
 */
export type GuideContext = {
  /** 缩进后的绘图区矩形（cartesian 轴线 / 网格框） */
  plotArea: Rect;
  /** x 维位置 scale（值 -> 像素 x，含 band 中心；cartesian 用） */
  projectX: PositionScale;
  /** y 维位置 scale（值 -> 像素 y；cartesian 用） */
  projectY: PositionScale;
  /** x 轴刻度集（axis 与同维 grid 复用；cartesian 用） */
  xTicks: TickSet;
  /** y 轴刻度集（cartesian 用） */
  yTicks: TickSet;
  /** label 字号（与 layout 估算同源） */
  fontSize: number;
  /** axis title / composition label 与 axis 的固定间距；省略时复用默认 axis label gap */
  labelGap?: number;
  /**
   * 直线轴向覆盖（仅 cartesian1D 给）。
   * @description cartesian1D 单维角色恒为 x，但轴可竖排；给此值时 lowerCartesianGuide 按它选屏幕方向，而非按 dimension
   */
  axisOrientation?: 'horizontal' | 'vertical';
  /** polar 坐标帧（在 polar2D / polar1D 时给）：存在即按维度角色走 angular / radial 几何 */
  frame?: PolarCoordinateFrame;
  /** angular 维刻度集（polar：angle / x 维 axis 与同维 grid 复用） */
  angularTicks?: TickSet;
  /** radial 维刻度集（polar：radius / y 维） */
  radialTicks?: TickSet;
  /** 三角顶点（仅 ternary2D 给）：[Va, Vb, Vc]，存在即走三角轴几何 */
  ternaryVertices?: TernaryVertices;
  /** 三角轴共享刻度集（仅 ternary2D；values 为 0..1 占比） */
  ternaryTicks?: TickSet;
};

/** lowerGuide 返回：网格层（仅 grid:true 时非空）与轴层 */
export type LoweredGuide = {
  /** 网格层 scope（grid:true 且有刻度时）；否则 null */
  gridLayer: IRScope | null;
  /** 轴层 scope（轴线 + 刻度线 + 可选标签）；空刻度时 null */
  axisLayer: IRScope | null;
};

/** guide 下沉函数签名，供 coordinate contract 暴露给 provider resolve context */
export type GuideLowerer = (guide: IRPlotAxisGuide, ctx: GuideContext, provenance?: ProvenanceContext) => LoweredGuide;
