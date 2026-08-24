import type { ValueOf } from '@retikz/foundation';
import type { infer as ZodInfer } from 'zod';

import type {
  BendDirection,
  FoldStepVia,
  GeometryLabelPlacement,
  GeometryLabelPosition,
  PathCloseMode,
} from './constants';
import type {
  ArcStepSchema,
  AxisLineStepSchema,
  AxisLineTargetSchema,
  BendStepSchema,
  CirclePathStepSchema,
  ControlPointSchema,
  CubicStepSchema,
  CurveStepSchema,
  CycleStepSchema,
  EllipsePathStepSchema,
  FoldStepSchema,
  GeneratorStepSchema,
  GeometryLabelSchema,
  LineStepSchema,
  MoveStepSchema,
  RectangleStepSchema,
  SmoothStepSchema,
  StepAnisotropicRadiusSchema,
  StepRadiusSchema,
  StepSchema,
} from './schema';

/** Shared path-like geometry label IR type. */
export type IRGeometryLabel = ZodInfer<typeof GeometryLabelSchema>;

/** Path step label IR type. */
export type IRStepLabel = IRGeometryLabel;

/** 椭圆半径对象，供 arc / ellipsePath step 复用 */
export type IRStepAnisotropicRadius = ZodInfer<typeof StepAnisotropicRadiusSchema>;

/** 路径 step 半径：number 表示正圆，object 表示椭圆 */
export type IRStepRadius = ZodInfer<typeof StepRadiusSchema>;

/** 控制点类型（曲线 step 用） */
export type IRControlPoint = ZodInfer<typeof ControlPointSchema>;

/** Move step：移动游标但不绘制 */
export type IRMoveStep = ZodInfer<typeof MoveStepSchema>;

/** Line step：从游标到目标画直线 */
export type IRLineStep = ZodInfer<typeof LineStepSchema>;

/** 单轴连接目标：笛卡尔坐标或节点目标 */
export type IRAxisLineTarget = ZodInfer<typeof AxisLineTargetSchema>;

/** Axis-line step：投影目标后只沿当前 host 的一个局部轴画直线 */
export type IRAxisLineStep = ZodInfer<typeof AxisLineStepSchema>;

/** Fold step：折角段，经一个直角中间点（TikZ `-|`/`|-`） */
export type IRFoldStep = ZodInfer<typeof FoldStepSchema>;

/** Cycle step：闭合回起点（TikZ `cycle`） */
export type IRCycleStep = ZodInfer<typeof CycleStepSchema>;

/** Curve step：二次贝塞尔，一个控制点 */
export type IRCurveStep = ZodInfer<typeof CurveStepSchema>;

/** Cubic step：三次贝塞尔，两控制点 */
export type IRCubicStep = ZodInfer<typeof CubicStepSchema>;

/** Bend step：弧形简记，按方向+角度生成 */
export type IRBendStep = ZodInfer<typeof BendStepSchema>;

/** Arc step：以游标为圆心的圆弧段，按起末角度+半径定 */
export type IRArcStep = ZodInfer<typeof ArcStepSchema>;

/** CirclePath step：以游标为圆心的整圆 */
export type IRCirclePathStep = ZodInfer<typeof CirclePathStepSchema>;

/** EllipsePath step：以游标为圆心的整椭圆 */
export type IREllipsePathStep = ZodInfer<typeof EllipsePathStepSchema>;

/** Rectangle step：两对角定义的轴对齐矩形（可圆角） */
export type IRRectangleStep = ZodInfer<typeof RectangleStepSchema>;

/** Smooth step：过 cursor + points 的平滑曲线，编译成 cubic 链 */
export type IRSmoothStep = ZodInfer<typeof SmoothStepSchema>;

/** Generator step：按 name 调注册的 path generator 产 sub-path（params 为 JSON 对象） */
export type IRGeneratorStep = ZodInfer<typeof GeneratorStepSchema>;

/**
 * 路径上的一个动作（十四种 kind）
 * @description 十四种 kind：move / line / axis-line（单轴投影连接）/ fold（折角）/ cycle / curve / cubic / bend / arc / circlePath / ellipsePath / rectangle（矩形）/ smooth（过点平滑曲线）/ generator（注册生成器）；普通 `to` 字段支持 relative / relativeAccumulate 变体，axis-line 的 `to` 仅支持笛卡尔坐标 / NodeTarget；除 move/cycle/rectangle/smooth 外可挂 `label?` 边标注（smooth 用 `points` 而非 `to`，自身亦可挂 `label?`）
 */
export type IRStep = ZodInfer<typeof StepSchema>;

export type GeometryLabelPlacementValue = ValueOf<typeof GeometryLabelPlacement>;

/** path-like 几何标签沿段的位置关键字取值 */
export type GeometryLabelPositionValue = ValueOf<typeof GeometryLabelPosition>;

export type FoldStepViaValue = ValueOf<typeof FoldStepVia>;

/** bend step 弯曲侧取值 */
export type BendDirectionValue = ValueOf<typeof BendDirection>;

/** 圆 / 椭圆 path 局部弧段闭合方式取值 */
export type PathCloseModeValue = ValueOf<typeof PathCloseMode>;
