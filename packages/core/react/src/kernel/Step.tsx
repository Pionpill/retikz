import type { FC, ReactNode } from 'react';
import type { IRControlPoint, IRStepLabel, IRTarget } from '@retikz/core';
import { TIKZ_STEP } from './_displayNames';

/**
 * React DSL 层的 target 类型：core 对象 `IRTarget` + 字符串 shorthand（`'A'` / `'A.north'` / `'A.30'` / `'+dx,dy'`）
 * @description core IRTarget 已对象化（无字符串分支）；字符串 shorthand 仅活在 React DSL，builder 经 parseTargetSugar eager 转对象后才入 IR
 */
export type DslTarget = IRTarget | string;

/** Move action：移动游标但不绘制（TikZ `(A)`） */
export type MoveStepProps = {
  /** 移动 step 鉴别字面量 */
  kind: 'move';
  /** 移动目标点 */
  to: DslTarget;
};

/** Line action：从当前游标到目标点画直线（TikZ `(A) -- (B)`） */
export type LineStepProps = {
  /** 直线 step 鉴别字面量；省略时默认 'line' */
  kind?: 'line';
  /** 直线终点 */
  to: DslTarget;
  /** 边标注，等价于 sugar `<EdgeLabel>` child */
  label?: IRStepLabel;
  /** sugar 形态：`<Step><EdgeLabel>...</EdgeLabel></Step>`；其它 children 静默忽略 */
  children?: ReactNode;
};

/** Fold action：经一个直角中间点的折角段（TikZ `(A) -| (B)` / `(A) |- (B)`） */
export type FoldStepProps = {
  /** 折角 step 鉴别字面量 */
  kind: 'fold';
  /** 折角走向：`-|` 先水平后垂直；`|-` 先垂直后水平 */
  via: '-|' | '|-';
  /** 折角终点 */
  to: DslTarget;
  /** 边标注 */
  label?: IRStepLabel;
  /** sugar 形态 */
  children?: ReactNode;
};

/** Cycle action：把当前子路径闭合回最近一次 move 起点（TikZ `cycle`） */
export type CycleStepProps = {
  /** 闭合 step 鉴别字面量；无 `to` / `label` / `children`——不可挂边标注、不消耗目标点 */
  kind: 'cycle';
};

/** Curve action：二次贝塞尔，一个控制点（TikZ `.. controls (B) ..`） */
export type CurveStepProps = {
  /** 二次贝塞尔 step 鉴别字面量 */
  kind: 'curve';
  /** 控制点（alpha.3 仅支持笛卡尔 `[x, y]`） */
  control: IRControlPoint;
  /** 曲线终点 */
  to: DslTarget;
  /** 边标注 */
  label?: IRStepLabel;
  /** sugar 形态 */
  children?: ReactNode;
};

/** Cubic action：三次贝塞尔，两个控制点（TikZ `.. controls (B) and (C) ..`） */
export type CubicStepProps = {
  /** 三次贝塞尔 step 鉴别字面量 */
  kind: 'cubic';
  /** 第一控制点（影响起点切线） */
  control1: IRControlPoint;
  /** 第二控制点（影响终点切线） */
  control2: IRControlPoint;
  /** 曲线终点 */
  to: DslTarget;
  /** 边标注 */
  label?: IRStepLabel;
  /** sugar 形态 */
  children?: ReactNode;
};

/**
 * Bend action：弧形简记，自动算控制点生成 cubic（TikZ `to[bend left=N]` / `to[out=…, in=…]`）
 * @description 两套互补字段：`bendDirection`/`bendAngle` 对称弯，或 `outAngle`/`inAngle`/`looseness` 非对称弯 / 自环；
 *   同给时 out/in 优先（编译层）。三者全省时默认 left 对称弯。`from == to`（同节点 / 同坐标）配合 out/in 画自环。
 */
export type BendStepProps = {
  /** 弧形简记 step 鉴别字面量 */
  kind: 'bend';
  /** 弯向：'left' / 'right'（视觉左右，相对 from→to）；可选，与 out/in 互补 */
  bendDirection?: 'left' | 'right';
  /** 弯角度（度），缺省 30 */
  bendAngle?: number;
  /** 出射角（度，TikZ `out=`）；与 inAngle 一起编译成 cubic，给定时优先于 bendDirection */
  outAngle?: number;
  /** 入射角（度，TikZ `in=`）；与 outAngle 一起编译成 cubic */
  inAngle?: number;
  /** 曲线松紧系数（TikZ `looseness=`，控制控制点距离），缺省约 1；也缩放自环默认大小 */
  looseness?: number;
  /** 终点 */
  to: DslTarget;
  /** 边标注 */
  label?: IRStepLabel;
  /** sugar 形态 */
  children?: ReactNode;
};

/** Arc action：按起末角度绘制圆弧 / 椭圆弧段；圆心缺省取游标，可显式指定（TikZ `arc[start angle=…, end angle=…, radius=…]`） */
export type ArcStepProps = {
  /** 弧段 step 鉴别字面量 */
  kind: 'arc';
  /** 起始角度（度，0° = +x、90° = +y screen-down；与 ArcStep / Node label 角度约定一致） */
  startAngle: number;
  /** 终止角度（度），sweep 方向由 startAngle vs endAngle 决定 */
  endAngle: number;
  /** 正圆弧半径（user units）；与 radiusX/radiusY 二选一 */
  radius?: number;
  /** 椭圆弧 x 半轴；需与 radiusY 同给 */
  radiusX?: number;
  /** 椭圆弧 y 半轴；需与 radiusX 同给 */
  radiusY?: number;
  /** 显式圆心；缺省取游标（上一 step anchor） */
  center?: DslTarget;
  /** 边标注 */
  label?: IRStepLabel;
  /** sugar 形态 */
  children?: ReactNode;
};

/** CirclePath action：以游标为圆心绘制圆；无角度=整圆（画完回圆心），带角度=部分圆（TikZ `circle[radius=…]`） */
export type CirclePathStepProps = {
  /** 整圆 step 鉴别字面量 */
  kind: 'circlePath';
  /** 圆半径（user units） */
  radius: number;
  /** 部分圆起始角（度）；与 endAngle 同给才生效 */
  startAngle?: number;
  /** 部分圆终止角（度） */
  endAngle?: number;
  /** 闭合模式：无角度=closed（整圆）；带角度=chord（弦，默认）/ sector（连回中心）/ open（纯弧） */
  closed?: 'closed' | 'chord' | 'open' | 'sector';
  /** 边标注 */
  label?: IRStepLabel;
  /** sugar 形态 */
  children?: ReactNode;
};

/** EllipsePath action：以游标为圆心绘制椭圆；无角度=整椭圆（画完回圆心），带角度=部分椭圆（TikZ `ellipse[x radius=…, y radius=…]`） */
export type EllipsePathStepProps = {
  /** 整椭圆 step 鉴别字面量 */
  kind: 'ellipsePath';
  /** 椭圆 x 轴半径 */
  radiusX: number;
  /** 椭圆 y 轴半径 */
  radiusY: number;
  /** 部分椭圆起始角（度）；与 endAngle 同给才生效 */
  startAngle?: number;
  /** 部分椭圆终止角（度） */
  endAngle?: number;
  /** 闭合模式：无角度=closed（整椭圆）；带角度=chord（默认）/ sector（连回中心）/ open */
  closed?: 'closed' | 'chord' | 'open' | 'sector';
  /** 边标注 */
  label?: IRStepLabel;
  /** sugar 形态 */
  children?: ReactNode;
};

/** Rectangle action：两对角定义的轴对齐矩形（可圆角）；编译为 path 命令（TikZ `(a) rectangle (b)`） */
export type RectangleStepProps = {
  /** 矩形 step 鉴别字面量 */
  kind: 'rectangle';
  /** 一角 */
  from: DslTarget;
  /** 对角（顺序无关） */
  to: DslTarget;
  /** 四角同圆角半径；缺省直角，compile clamp 到边长一半 */
  cornerRadius?: number;
};

/**
 * `<Step>` 组件的 props（11 种 step kind 的 discriminated union）
 * @description 十一种 kind：'move' / 'line'（默认） / 'fold'（折角） / 'cycle'（闭合） / 'curve'（二次贝塞尔） / 'cubic'（三次贝塞尔） / 'bend'（弧形简记） / 'arc'（圆 / 椭圆弧段） / 'circlePath'（整圆 / 部分圆） / 'ellipsePath'（整椭圆 / 部分椭圆） / 'rectangle'（矩形）。除 'move' / 'cycle' / 'rectangle' 外均可挂 `label?: IRStepLabel`，等价于 sugar `<EdgeLabel>` child（prop 优先）。每个 kind 有对应 named type export，便于 wrapper / forwardRef / `Pick<>` 派生。
 */
export type StepProps =
  | MoveStepProps
  | LineStepProps
  | FoldStepProps
  | CycleStepProps
  | CurveStepProps
  | CubicStepProps
  | BendStepProps
  | ArcStepProps
  | CirclePathStepProps
  | EllipsePathStepProps
  | RectangleStepProps;

/**
 * Step 是 DSL 标记组件——本身不渲染
 * @description 必须作为 `<Path>` 的直接子节点出现，由 `<Path>` 的 children 扫描读出
 */
export const Step: FC<StepProps> = () => null;
Step.displayName = TIKZ_STEP;
