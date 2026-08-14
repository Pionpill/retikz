import type {
  IRArrowDetail,
  IRAxisLineTarget,
  IRPath,
  IRStep,
  IRStepLabel,
  IRTarget,
  PathThicknessValue,
  SideValue,
  WayDSL,
} from '@retikz/core';
import type { ValueOf } from '@retikz/foundation';

/** 作者侧路径箭头方向 */
export const InputPathArrowDirection = {
  None: 'none',
  Forward: '->',
  Backward: '<-',
  Both: '<->',
} as const;

/** 作者侧路径箭头方向取值 */
export type InputPathArrowDirectionValue = ValueOf<typeof InputPathArrowDirection>;

/** 作者侧路径步骤标签 */
export type InputStepLabel = Omit<IRStepLabel, 'side'> & {
  side?: SideValue;
};

/** 作者侧路径 target */
export type InputTarget = IRTarget | string;

/** 作者侧单轴路径 target */
export type InputAxisLineTarget = IRAxisLineTarget | string;

/** 以作者侧 target 组装的 move 步骤 */
export type InputMoveStep = Omit<Extract<IRStep, { kind: 'move' }>, 'to'> & {
  to: InputTarget;
};

/** 以作者侧 target 组装的 line 步骤 */
export type InputLineStep = Omit<Extract<IRStep, { kind: 'line' }>, 'to' | 'label'> & {
  to: InputTarget;
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 axis-line 步骤 */
export type InputAxisLineStep = Omit<Extract<IRStep, { kind: 'axis-line' }>, 'to' | 'label'> & {
  to: InputAxisLineTarget;
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 fold 步骤 */
export type InputFoldStep = Omit<Extract<IRStep, { kind: 'fold' }>, 'to' | 'label'> & {
  to: InputTarget;
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 curve 步骤 */
export type InputCurveStep = Omit<Extract<IRStep, { kind: 'curve' }>, 'to' | 'label'> & {
  to: InputTarget;
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 cubic 步骤 */
export type InputCubicStep = Omit<Extract<IRStep, { kind: 'cubic' }>, 'to' | 'label'> & {
  to: InputTarget;
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 bend 步骤 */
export type InputBendStep = Omit<Extract<IRStep, { kind: 'bend' }>, 'to' | 'label'> & {
  to: InputTarget;
  label?: InputStepLabel;
};

/** 以作者侧标签组装的 circlePath 步骤 */
export type InputCirclePathStep = Omit<Extract<IRStep, { kind: 'circlePath' }>, 'label'> & {
  label?: InputStepLabel;
};

/** 以作者侧标签组装的 ellipsePath 步骤 */
export type InputEllipsePathStep = Omit<Extract<IRStep, { kind: 'ellipsePath' }>, 'label'> & {
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 arc 步骤 */
export type InputArcStep = Omit<Extract<IRStep, { kind: 'arc' }>, 'center' | 'label'> & {
  center?: InputTarget;
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 rectangle 步骤 */
export type InputRectangleStep = Omit<Extract<IRStep, { kind: 'rectangle' }>, 'from' | 'to'> & {
  from: InputTarget;
  to: InputTarget;
};

/** 以作者侧 target 组装的 smooth 步骤 */
export type InputSmoothStep = Omit<Extract<IRStep, { kind: 'smooth' }>, 'points' | 'label'> & {
  points: ReadonlyArray<InputTarget>;
  label?: InputStepLabel;
};

/** 以作者侧 target 组装的 generator 步骤 */
export type InputGeneratorStep = Omit<Extract<IRStep, { kind: 'generator' }>, 'to' | 'label'> & {
  to?: InputTarget;
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
  | InputSmoothStep
  | InputGeneratorStep;

/** 作者侧路径输入的公共字段 */
type InputPathBase = Omit<IRPath, 'type' | 'children'> & {
  children?: ReadonlyArray<InputStep>;
  /** TikZ 风格的路径走向简写 */
  way?: WayDSL;
  /** 路径描边宽度语法糖 */
  thickness?: PathThicknessValue;
  /** 路径级箭头方向 */
  arrow?: InputPathArrowDirectionValue;
  /** 箭头的顶层默认与端点覆盖配置 */
  arrowDetail?: IRArrowDetail;
  /** 可选编译驱动自行解释的运行时载荷，不进入 Core IR */
  authoring?: unknown;
};

/** 作者侧路径输入 */
export type InputPath = InputPathBase & {
  /** 无法由 authoring 字段唯一识别时显式指定路径类别 */
  type?: 'path';
};
