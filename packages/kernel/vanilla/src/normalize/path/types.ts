import type { IRAxisLineTarget, IRPath, IRStep, IRStepLabel, IRTarget } from '@retikz/core';

import type { WayDSL } from './way';

/** 作者侧路径步骤标签 */
export type InputStepLabel = IRStepLabel;

/** 作者侧路径 target */
export type InputTarget = IRTarget | string;

/** 作者侧单轴路径 target */
export type InputAxisLineTarget = IRAxisLineTarget | string;

/** 以作者侧 target 组装的 move 步骤 */
export type InputMoveStep = Omit<Extract<IRStep, { kind: 'move' }>, 'to'> & {
  /** 移动后的目标位置，可使用目标标识字符串简写 */
  to: InputTarget;
};

/** 以作者侧 target 组装的 line 步骤 */
export type InputLineStep = Omit<Extract<IRStep, { kind: 'line' }>, 'to' | 'label'> & {
  /** 直线终点，可使用目标标识字符串简写 */
  to: InputTarget;
  /** 附着在当前直线段上的可选标签 */
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 axis-line 步骤 */
export type InputAxisLineStep = Omit<Extract<IRStep, { kind: 'axis-line' }>, 'to' | 'label'> & {
  /** 仅决定指定轴分量的目标，可使用目标标识字符串简写 */
  to: InputAxisLineTarget;
  /** 附着在当前单轴线段上的可选标签 */
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 fold 步骤 */
export type InputFoldStep = Omit<Extract<IRStep, { kind: 'fold' }>, 'to' | 'label'> & {
  /** 折线终点，可使用目标标识字符串简写 */
  to: InputTarget;
  /** 附着在当前折线步骤上的可选标签 */
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 curve 步骤 */
export type InputCurveStep = Omit<Extract<IRStep, { kind: 'curve' }>, 'to' | 'label'> & {
  /** 二次贝塞尔曲线终点，可使用目标标识字符串简写 */
  to: InputTarget;
  /** 附着在当前二次曲线上的可选标签 */
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 cubic 步骤 */
export type InputCubicStep = Omit<Extract<IRStep, { kind: 'cubic' }>, 'to' | 'label'> & {
  /** 三次贝塞尔曲线终点，可使用目标标识字符串简写 */
  to: InputTarget;
  /** 附着在当前三次曲线上的可选标签 */
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 bend 步骤 */
export type InputBendStep = Omit<Extract<IRStep, { kind: 'bend' }>, 'to' | 'label'> & {
  /** 弯曲路径的终点，可使用目标标识字符串简写 */
  to: InputTarget;
  /** 附着在当前弯曲路径上的可选标签 */
  label?: InputStepLabel;
};

/** 以作者侧标签组装的 circlePath 步骤 */
export type InputCirclePathStep = Omit<Extract<IRStep, { kind: 'circlePath' }>, 'label'> & {
  /** 附着在圆形路径上的可选标签 */
  label?: InputStepLabel;
};

/** 以作者侧标签组装的 ellipsePath 步骤 */
export type InputEllipsePathStep = Omit<Extract<IRStep, { kind: 'ellipsePath' }>, 'label'> & {
  /** 附着在椭圆路径上的可选标签 */
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 arc 步骤 */
export type InputArcStep = Omit<Extract<IRStep, { kind: 'arc' }>, 'center' | 'label'> & {
  /** 显式圆心目标，省略时沿用 Core 弧段的圆心推导语义 */
  center?: InputTarget;
  /** 附着在当前弧段上的可选标签 */
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 rectangle 步骤 */
export type InputRectangleStep = Omit<Extract<IRStep, { kind: 'rectangle' }>, 'from' | 'to'> & {
  /** 矩形的一个对角点，可使用目标标识字符串简写 */
  from: InputTarget;
  /** 矩形的另一个对角点，可使用目标标识字符串简写 */
  to: InputTarget;
};

/** 以作者侧 target 组装的 smooth 步骤 */
export type InputSmoothStep = Omit<Extract<IRStep, { kind: 'smooth' }>, 'points' | 'label'> & {
  /** 平滑曲线按顺序经过的目标列表 */
  points: ReadonlyArray<InputTarget>;
  /** 附着在当前平滑曲线上的可选标签 */
  label?: InputStepLabel;
};

/** 作者侧路径步骤 */
export type InputStep =
  | InputMoveStep
  | InputLineStep
  | InputAxisLineStep
  | InputFoldStep
  | Extract<IRStep, { kind: 'cycle' }>
  | InputCurveStep
  | InputCubicStep
  | InputBendStep
  | InputCirclePathStep
  | InputEllipsePathStep
  | InputArcStep
  | InputRectangleStep
  | InputSmoothStep;

/** 作者侧路径输入的公共字段 */
type InputPathBase = Omit<IRPath, 'type' | 'children' | 'arrow'> & {
  /** 端点箭头配置，或用方向字符串快捷启用起点、终点或两端箭头 */
  arrow?: IRPath['arrow'] | '->' | '<-' | '<->';
  /** 路径步骤序列；与 way 互斥 */
  children?: ReadonlyArray<InputStep>;
  /** TikZ 风格的路径走向简写 */
  way?: WayDSL;
  /** 可选编译驱动自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};

/** 作者侧路径输入 */
export type InputPath = InputPathBase & {
  /** 无法由 authoring 字段唯一识别时显式指定路径类别 */
  type?: 'path';
};
