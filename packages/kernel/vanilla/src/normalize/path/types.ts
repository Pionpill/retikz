import type { IRPath, IRStep, IRStepLabel, PathThicknessValue, SideValue, WayDSL } from '@retikz/core';

/** 作者侧路径步骤标签 */
export type InputStepLabel = Omit<IRStepLabel, 'side'> & {
  side?: SideValue;
};

/** 作者侧路径步骤 */
export type InputStep = IRStep;

/** 作者侧路径输入 */
export type InputPath = Omit<IRPath, 'type' | 'children'> & {
  type?: 'path';
  children?: ReadonlyArray<InputStep>;
  /** TikZ 风格的路径走向简写 */
  way?: WayDSL;
  /** 路径描边宽度语法糖 */
  thickness?: PathThicknessValue;
  /** 可选编译驱动自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};
