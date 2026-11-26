import type { IRCirclePathStep, IREllipsePathStep, IRStepLabel } from '@retikz/core';
import { pickDefined } from '@retikz/foundation';
import type {
  InputArcStep,
  InputAxisLineStep,
  InputBendStep,
  InputCubicStep,
  InputCurveStep,
  InputFoldStep,
  InputLineStep,
  InputMoveStep,
  InputRectangleStep,
  InputSmoothStep,
  InputStep,
  InputTarget,
} from '@retikz/vanilla';
import type { FC, ReactNode } from 'react';
import { Children, Fragment, isValidElement } from 'react';

import { KernelDisplayName, getDisplayName } from '../../shared';

/**
 * React DSL 层的 target 类型：core 对象 `IRTarget` + 字符串 shorthand（`'A'` / `'A.north'` / `'A.30'` / `'+dx,dy'`）
 * @description 对象形态适合精确描述节点锚点、坐标和相对位移；字符串 shorthand 适合手写 JSX 时快速引用常见目标
 */
export type DslTarget = InputTarget;

/** 可用 StepLabel 子元素声明步骤标签 */
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
 * 路径步骤属性
 * @description kind 决定可用字段；省略时首步为 move，后续为 line
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
 * 路径步骤
 * @description 声明移动、连线或闭合等路径动作
 */
export const Step: FC<StepProps> = () => null;
Step.displayName = KernelDisplayName.Step;

type StepLabelElementProps = Readonly<{
  position?: IRStepLabel['position'];
  side?: IRStepLabel['side'];
  sloped?: IRStepLabel['sloped'];
  interrupt?: IRStepLabel['interrupt'];
  children?: unknown;
}>;
/** 从 <StepLabel> sugar 中读取首个标签 */
const readStepLabel = (children: ReactNode): IRStepLabel | undefined => {
  let result: IRStepLabel | undefined;

  const visit = (node: ReactNode): void => {
    Children.forEach(node, child => {
      if (!isValidElement(child)) return;
      if (child.type === Fragment) {
        visit((child.props as { children?: ReactNode }).children);
        return;
      }

      if (getDisplayName(child) !== KernelDisplayName.StepLabel) {
        if (typeof child.type === 'function') visit((child.type as (props: unknown) => ReactNode)(child.props));
        return;
      }

      const props = child.props as StepLabelElementProps;
      if (typeof props.children !== 'string') return;
      if (result !== undefined) {
        if (__DEV__) {
          console.warn('[retikz] <Step> 含多个 <StepLabel>，仅首个生效、其余被忽略');
        }

        return;
      }

      result = {
        text: props.children,
        ...pickDefined(props, ['position', 'side', 'sloped', 'interrupt']),
      };
    });
  };

  visit(children);

  return result;
};

/** 把一个 <Step> props 组装为 Vanilla InputStep，不解析 target */
export const convertStepProps = (props: StepProps, first: boolean): InputStep => {
  // 首步省略 kind 时只移动游标，不读取边标签
  if (props.kind === undefined && first) return { type: 'step', kind: 'move', to: props.to };

  let label = 'label' in props ? props.label : undefined;
  if (label === undefined && 'children' in props) label = readStepLabel(props.children);

  switch (props.kind) {
    case 'cycle':
      return { type: 'step', kind: 'cycle' };
    case 'move':
      return { type: 'step', kind: 'move', to: props.to };
    case undefined:
    case 'line':
      return { type: 'step', kind: 'line', to: props.to, ...(label === undefined ? {} : { label }) };
    case 'axis-line':
      return {
        type: 'step',
        kind: 'axis-line',
        axis: props.axis,
        to: props.to,
        ...(label === undefined ? {} : { label }),
      };
    case 'fold':
      return {
        type: 'step',
        kind: 'fold',
        via: props.via,
        ...(props.via === '-|-' || props.via === '|-|' ? { fraction: props.fraction } : {}),
        to: props.to,
        ...(label === undefined ? {} : { label }),
      };
    case 'curve':
      return {
        type: 'step',
        kind: 'curve',
        control: props.control,
        to: props.to,
        ...(label === undefined ? {} : { label }),
      };
    case 'cubic':
      return {
        type: 'step',
        kind: 'cubic',
        control1: props.control1,
        control2: props.control2,
        to: props.to,
        ...(label === undefined ? {} : { label }),
      };
    case 'bend':
      return {
        type: 'step',
        kind: 'bend',
        to: props.to,
        ...pickDefined(props, ['bendDirection', 'bendAngle', 'outAngle', 'inAngle', 'looseness']),
        ...(label === undefined ? {} : { label }),
      };
    case 'arc':
      return {
        type: 'step',
        kind: 'arc',
        startAngle: props.startAngle,
        endAngle: props.endAngle,
        radius: props.radius,
        ...pickDefined(props, ['center']),
        ...(label === undefined ? {} : { label }),
      };
    case 'circlePath':
    case 'ellipsePath':
      return {
        type: 'step',
        kind: props.kind,
        radius: props.radius,
        ...pickDefined(props, ['startAngle', 'endAngle', 'closed']),
        ...(label === undefined ? {} : { label }),
      } as InputStep;
    case 'rectangle':
      return {
        type: 'step',
        kind: 'rectangle',
        from: props.from,
        to: props.to,
        ...pickDefined(props, ['cornerRadius']),
      };
    case 'smooth':
      return {
        type: 'step',
        kind: 'smooth',
        points: props.points,
        ...pickDefined(props, ['tension']),
        ...(label === undefined ? {} : { label }),
      };
  }
};
