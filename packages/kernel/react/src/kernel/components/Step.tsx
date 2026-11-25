import type { IRCirclePathStep, IREllipsePathStep } from '@retikz/core';
import type {
  InputMoveStep,
  InputLineStep,
  InputAxisLineStep,
  InputFoldStep,
  InputCurveStep,
  InputCubicStep,
  InputBendStep,
  InputArcStep,
  InputRectangleStep,
  InputSmoothStep,
  InputStep,
  InputTarget,
} from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';

import { TIKZ_STEP } from '../protocol';

/**
 * React DSL 层的 target 类型：core 对象 `IRTarget` + 字符串 shorthand（`'A'` / `'A.north'` / `'A.30'` / `'+dx,dy'`）
 * @description 对象形态适合精确描述节点锚点、坐标和相对位移；字符串 shorthand 适合手写 JSX 时快速引用常见目标
 */
export type DslTarget = InputTarget;

/** 可用 EdgeLabel 子元素声明步骤标签 */
type StepLabelChildren = {
  /** sugar 形态 */
  children?: ReactNode;
};

/** 对每个输入分支独立移除 JSX 已表达的 type，保留 fold 的 via 与 fraction 关联 */
type StepFields<TStep extends InputStep> = TStep extends InputStep ? Omit<TStep, 'type'> : never;

/** Move action：移动游标但不绘制 */
export type MoveStepProps = StepFields<InputMoveStep>;

/** Line action：从当前游标到目标点画直线 */
export type LineStepProps = Omit<InputLineStep, 'type' | 'kind'> &
  Partial<Pick<InputLineStep, 'kind'>> &
  StepLabelChildren;

/** Axis-line action：把目标投影到当前 host 的一个局部轴并画单段直线 */
export type AxisLineStepProps = StepFields<InputAxisLineStep> & StepLabelChildren;

/**
 * Fold action：两段或三段正交折线
 * @description `-|` / `|-` 使用一个转折点；`-|-` / `|-|` 使用两个转折点，并可用归一化 `fraction` 调整中间腿位置
 */
export type FoldStepProps = StepFields<InputFoldStep> & StepLabelChildren;

/** Cycle action：把当前子路径闭合回最近一次 move 起点 */
export type CycleStepProps = StepFields<Extract<InputStep, { kind: 'cycle' }>>;

/** Curve action：二次贝塞尔，一个控制点 */
export type CurveStepProps = StepFields<InputCurveStep> & StepLabelChildren;

/** Cubic action：三次贝塞尔，两个控制点 */
export type CubicStepProps = StepFields<InputCubicStep> & StepLabelChildren;

/**
 * Bend action：弧形简记，自动算控制点生成 cubic
 * @description 支持对称弯与非对称弯 / 自环两种模式；同给时 out/in 优先（编译层）。
 *   三者全省时默认 left 对称弯。`from == to`（同节点 / 同坐标）配合 out/in 画自环
 */
export type BendStepProps = StepFields<InputBendStep> & StepLabelChildren;

/** Arc action：按起末角度绘制圆弧 / 椭圆弧段；圆心缺省取游标，可显式指定 */
export type ArcStepProps = StepFields<InputArcStep> & StepLabelChildren;

/** CirclePath action：以游标为圆心绘制圆；无角度=整圆（画完回圆心），带角度=部分圆 */
export type CirclePathStepProps = StepFields<IRCirclePathStep> & StepLabelChildren;

/** EllipsePath action：以游标为圆心绘制椭圆；无角度=整椭圆（画完回圆心），带角度=部分椭圆 */
export type EllipsePathStepProps = StepFields<IREllipsePathStep> & StepLabelChildren;

/** Rectangle action：两对角定义的轴对齐矩形（可圆角）；编译为 path 命令 */
export type RectangleStepProps = StepFields<InputRectangleStep>;

/**
 * Smooth action：过当前游标 + `points` 的平滑曲线
 * @description 游标为隐式首 knot，曲线依次穿过 `points` 每个点；编译期经 centripetal Catmull-Rom 转成 cubic 链。
 *   需前置 step 设游标；游标终于 `points` 末项。`tension` 缺省 1（标准 centripetal CR），<1 更紧、>1 更鼓
 */
export type SmoothStepProps = Omit<InputSmoothStep, 'type' | 'points'> & {
  /** 游标之后依次穿过的点（顺序敏感）；单点 = 一段曲线，游标终于末点 */
  points: Array<InputTarget>;
} & StepLabelChildren;

/**
 * @description 十三种 kind：'move'（首步默认） / 'line'（后续步骤默认） / 'axis-line'（单轴投影连接） / 'fold'（折角） / 'cycle'（闭合） / 'curve'（二次贝塞尔） / 'cubic'（三次贝塞尔） / 'bend'（弧形简记） / 'arc'（圆 / 椭圆弧段） / 'circlePath'（整圆 / 部分圆） / 'ellipsePath'（整椭圆 / 部分椭圆） / 'rectangle'（矩形） / 'smooth'（过点平滑曲线）。除 'move' / 'cycle' / 'rectangle' 外均可挂 `label?: IRStepLabel`，等价于 sugar `<EdgeLabel>` child（prop 优先）；'smooth' 用 `points` 而非 `to`。每个 kind 有对应 named type export，便于 wrapper / forwardRef / `Pick<>` 派生
 */
export type StepProps =
  | MoveStepProps
  | LineStepProps
  | AxisLineStepProps
  | FoldStepProps
  | CycleStepProps
  | CurveStepProps
  | CubicStepProps
  | BendStepProps
  | ArcStepProps
  | CirclePathStepProps
  | EllipsePathStepProps
  | RectangleStepProps
  | SmoothStepProps;

/**
 * Step 是 DSL 标记组件——本身不渲染
 * @description 声明路径中的一个动作，例如移动、连线、曲线、圆弧或闭合
 */
export const Step: FC<StepProps> = () => null;
Step.displayName = TIKZ_STEP;
