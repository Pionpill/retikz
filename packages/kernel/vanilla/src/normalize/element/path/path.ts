import type {
  IRAxisLineTarget,
  IRFoldStep,
  IRPath,
  IRStep,
  IRCirclePathStep,
  IREllipsePathStep,
  IRTarget,
} from '@retikz/core';
import type { RequireExactlyOne } from '@retikz/foundation';

import { parseAxisLineTarget, parseTargetSugar } from './target';
import type { WayDSL } from './way';
import { parseWay } from './way';

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
export type InputLineStep = Omit<Extract<IRStep, { kind: 'line' }>, 'to'> & {
  /** 直线终点，可使用目标标识字符串简写 */
  to: InputTarget;
};

/** 以作者侧 target 组装的 axis-line 步骤 */
export type InputAxisLineStep = Omit<Extract<IRStep, { kind: 'axis-line' }>, 'to'> & {
  /** 仅决定指定轴分量的目标，可使用目标标识字符串简写 */
  to: InputAxisLineTarget;
};

/** 以作者侧 target 组装的 fold 步骤 */
export type InputFoldStep = (
  | Omit<Extract<IRFoldStep, { via: '-|' | '|-' }>, 'to'>
  | Omit<Extract<IRFoldStep, { via: '-|-' | '|-|' }>, 'to'>
) & { to: InputTarget };

/** 以作者侧 target 组装的 curve 步骤 */
export type InputCurveStep = Omit<Extract<IRStep, { kind: 'curve' }>, 'to'> & {
  /** 二次贝塞尔曲线终点，可使用目标标识字符串简写 */
  to: InputTarget;
};

/** 以作者侧 target 组装的 cubic 步骤 */
export type InputCubicStep = Omit<Extract<IRStep, { kind: 'cubic' }>, 'to'> & {
  /** 三次贝塞尔曲线终点，可使用目标标识字符串简写 */
  to: InputTarget;
};

/** 以作者侧 target 组装的 bend 步骤 */
export type InputBendStep = Omit<Extract<IRStep, { kind: 'bend' }>, 'to'> & {
  /** 弯曲路径的终点，可使用目标标识字符串简写 */
  to: InputTarget;
};

/** 以作者侧 target 组装的 arc 步骤 */
export type InputArcStep = Omit<Extract<IRStep, { kind: 'arc' }>, 'center'> & {
  /** 显式圆心目标，省略时沿用 Core 弧段的圆心推导语义 */
  center?: InputTarget;
};

/** 以作者侧 target 组装的 rectangle 步骤 */
export type InputRectangleStep = Omit<Extract<IRStep, { kind: 'rectangle' }>, 'from' | 'to'> & {
  /** 矩形的一个对角点，可使用目标标识字符串简写 */
  from: InputTarget;
  /** 矩形的另一个对角点，可使用目标标识字符串简写 */
  to: InputTarget;
};

/** 以作者侧 target 组装的 smooth 步骤 */
export type InputSmoothStep = Omit<Extract<IRStep, { kind: 'smooth' }>, 'points'> & {
  /** 平滑曲线按顺序经过的目标列表 */
  points: ReadonlyArray<InputTarget>;
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
  | IRCirclePathStep
  | IREllipsePathStep
  | InputArcStep
  | InputRectangleStep
  | InputSmoothStep;

/** 具名路径构造函数的配置，必须选择一种步骤来源 */
export type InputPathConfig = Omit<IRPath, 'type' | 'children' | 'arrow'> & {
  /** 端点箭头配置，或用方向字符串快捷启用起点、终点或两端箭头 */
  arrow?: IRPath['arrow'] | '->' | '<-' | '<->';
  /** 归一化时保留的作者元数据，不进入 Core IR */
  authoring?: unknown;
} & RequireExactlyOne<{
    /** 路径步骤序列；与 way 互斥 */
    children: ReadonlyArray<InputStep>;
    /** TikZ 风格的路径走向简写 */
    way: WayDSL;
  }>;

/** 作者侧路径输入 */
export type InputPath = Pick<IRPath, 'type'> & InputPathConfig;

/** 将方向简写转换为端点箭头对象，供 Kernel 与领域路径作者入口复用 */
export const normalizePathArrow = (arrow: InputPath['arrow']): IRPath['arrow'] =>
  typeof arrow === 'string'
    ? {
        ...(arrow === '<-' || arrow === '<->' ? { start: {} } : {}),
        ...(arrow === '->' || arrow === '<->' ? { end: {} } : {}),
      }
    : arrow;

/** 将一条作者侧步骤组装为 Source IR 步骤 */
const normalizeStep = (input: InputStep): IRStep => {
  switch (input.kind) {
    case 'move':
    case 'line':
    case 'fold':
    case 'curve':
    case 'cubic':
    case 'bend':
      return { ...input, to: parseTargetSugar(input.to) };
    case 'axis-line':
      return {
        ...input,
        to: parseAxisLineTarget(input.to),
      };
    case 'arc': {
      const { center, ...step } = input;
      return {
        ...step,
        ...(center === undefined ? {} : { center: parseTargetSugar(center) }),
      };
    }
    case 'rectangle':
      return { ...input, from: parseTargetSugar(input.from), to: parseTargetSugar(input.to) };
    case 'smooth':
      return {
        ...input,
        points: input.points.map(parseTargetSugar),
      };
    case 'cycle':
    case 'circlePath':
    case 'ellipsePath':
      return input;
  }
};

/** 将作者侧路径输入组装为 Source IR */
export const normalizePath = (input: InputPath): IRPath => {
  const { authoring: _authoring, way, children, arrow, ...path } = input;
  void _authoring;
  const authoredChildren = children !== undefined ? children.map(normalizeStep) : parseWay(way);
  const normalizedArrow = normalizePathArrow(arrow);

  return {
    ...path,
    ...(normalizedArrow === undefined ? {} : { arrow: normalizedArrow }),
    children: authoredChildren,
  };
};
