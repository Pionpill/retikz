import type {
  IRControlPoint,
  IRGeneratorStep,
  IRJsonObject,
  IRStepAnisotropicRadius,
  IRStepLabelInput,
  IRStepRadius,
  IRTarget,
} from '@retikz/core';
import type { FC, ReactNode } from 'react';

import { TIKZ_STEP } from '../protocol';

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
  label?: IRStepLabelInput;
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
  label?: IRStepLabelInput;
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
  /** 控制点（仅支持笛卡尔 `[x, y]`） */
  control: IRControlPoint;
  /** 曲线终点 */
  to: DslTarget;
  /** 边标注 */
  label?: IRStepLabelInput;
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
  label?: IRStepLabelInput;
  /** sugar 形态 */
  children?: ReactNode;
};

/**
 * Bend action：弧形简记，自动算控制点生成 cubic（TikZ `to[bend left=N]` / `to[out=…, in=…]`）
 * @description 支持对称弯与非对称弯 / 自环两种模式；同给时 out/in 优先（编译层）。
 *   三者全省时默认 left 对称弯。`from == to`（同节点 / 同坐标）配合 out/in 画自环。
 */
export type BendStepProps = {
  /** 弧形简记 step 鉴别字面量 */
  kind: 'bend';
  /** 对称弯模式的弯向：'left' / 'right'（视觉左右，相对 from→to）；可选，与 out/in 互补 */
  bendDirection?: 'left' | 'right';
  /** 对称弯模式的弯角度（度），缺省 30 */
  bendAngle?: number;
  /** 非对称弯 / 自环模式的出射角（度，TikZ `out=`）；与 inAngle 一起编译成 cubic，给定时优先于 bendDirection */
  outAngle?: number;
  /** 非对称弯 / 自环模式的入射角（度，TikZ `in=`）；与 outAngle 一起编译成 cubic */
  inAngle?: number;
  /** 非对称弯 / 自环模式的曲线松紧系数（TikZ `looseness=`，控制控制点距离），缺省约 1；也缩放自环默认大小 */
  looseness?: number;
  /** 终点 */
  to: DslTarget;
  /** 边标注 */
  label?: IRStepLabelInput;
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
  /** 弧半径；number 表示正圆，{ x, y } 表示椭圆 */
  radius: IRStepRadius;
  /** 显式圆心；缺省取游标（上一 step anchor） */
  center?: DslTarget;
  /** 边标注 */
  label?: IRStepLabelInput;
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
  label?: IRStepLabelInput;
  /** sugar 形态 */
  children?: ReactNode;
};

/** EllipsePath action：以游标为圆心绘制椭圆；无角度=整椭圆（画完回圆心），带角度=部分椭圆（TikZ `ellipse[x radius=…, y radius=…]`） */
export type EllipsePathStepProps = {
  /** 整椭圆 step 鉴别字面量 */
  kind: 'ellipsePath';
  /** 椭圆 x 轴半径 */
  radius: IRStepAnisotropicRadius;
  /** 椭圆 y 轴半径 */
  /** 部分椭圆起始角（度）；与 endAngle 同给才生效 */
  startAngle?: number;
  /** 部分椭圆终止角（度） */
  endAngle?: number;
  /** 闭合模式：无角度=closed（整椭圆）；带角度=chord（默认）/ sector（连回中心）/ open */
  closed?: 'closed' | 'chord' | 'open' | 'sector';
  /** 边标注 */
  label?: IRStepLabelInput;
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
 * Smooth action：过当前游标 + `points` 的平滑曲线（TikZ `plot[smooth]` / Hobby 风格）
 * @description 游标为隐式首 knot，曲线依次穿过 `points` 每个点；编译期经 centripetal Catmull-Rom 转成 cubic 链。
 *   需前置 step 设游标；游标终于 `points` 末项。`tension` 缺省 1（标准 centripetal CR），<1 更紧、>1 更鼓。
 */
export type SmoothStepProps = {
  /** 平滑曲线 step 鉴别字面量 */
  kind: 'smooth';
  /** 游标之后依次穿过的点（顺序敏感）；单点 = 一段曲线，游标终于末点 */
  points: Array<DslTarget>;
  /** 切线长度乘子（TikZ `tension`）；缺省 1，<1 更紧、>1 更鼓 */
  tension?: number;
  /** 边标注，沿生成 cubic 按贝塞尔参数定位 */
  label?: IRStepLabelInput;
  /** sugar 形态 */
  children?: ReactNode;
};

/** Generator action：调用内置或运行时注册的 path generator 生成一段低层路径命令 */
export type GeneratorStepProps = {
  /** 生成器 step 鉴别字面量 */
  kind: 'generator';
  /** path generator 名称；内置名或 `<Layout pathGenerators>` 注册名 */
  name: IRGeneratorStep['name'];
  /** 可选终点，会作为 generator context 的 `to` 传入 */
  to?: DslTarget;
  /** JSON-safe 参数对象；目标引用需写在 generator 的 `targetParams` 顶层 key 上 */
  params: IRJsonObject;
  /** 边标注 */
  label?: IRStepLabelInput;
  /** sugar 形态 */
  children?: ReactNode;
};

/**
 * `<Step>` 组件的 props（13 种 step kind 的 discriminated union）
 * @description 十三种 kind：'move' / 'line'（默认） / 'fold'（折角） / 'cycle'（闭合） / 'curve'（二次贝塞尔） / 'cubic'（三次贝塞尔） / 'bend'（弧形简记） / 'arc'（圆 / 椭圆弧段） / 'circlePath'（整圆 / 部分圆） / 'ellipsePath'（整椭圆 / 部分椭圆） / 'rectangle'（矩形） / 'smooth'（过点平滑曲线） / 'generator'（内置或注册路径生成器）。除 'move' / 'cycle' / 'rectangle' 外均可挂 `label?: IRStepLabel`，等价于 sugar `<EdgeLabel>` child（prop 优先）；'smooth' 用 `points` 而非 `to`，'generator' 用 `name` + JSON-safe `params`。每个 kind 有对应 named type export，便于 wrapper / forwardRef / `Pick<>` 派生。
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
  | RectangleStepProps
  | SmoothStepProps
  | GeneratorStepProps;

/**
 * Step 是 DSL 标记组件——本身不渲染
 * @description 必须作为 `<Path>` 的直接子节点出现，由 `<Path>` 的 children 扫描读出
 */
export const Step: FC<StepProps> = () => null;
Step.displayName = TIKZ_STEP;
