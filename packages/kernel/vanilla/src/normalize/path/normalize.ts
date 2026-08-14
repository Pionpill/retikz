import type {
  IRArcStep,
  IRArrowMark,
  IRAxisLineTarget,
  IRGeneratorStep,
  IRPath,
  IRPathBase,
  IRStep,
  IRTarget,
} from '@retikz/core';

import { AxisLineTargetSchema, parseTargetSugar, parseWay, THICKNESS_TO_WIDTH } from '@retikz/core';

import type { InputAxisLineTarget, InputPath, InputStep, InputTarget } from './types';

/** 从路径箭头细节生成单端 Source IR 标记 */
const arrowMarkFromDetail = (detail: InputPath['arrowDetail'], endpoint: 'start' | 'end'): IRArrowMark => {
  const base = detail ?? {};
  const side = endpoint === 'start' ? base.start : base.end;
  const shape = side?.shape ?? base.shape;
  const scale = side?.scale ?? base.scale;
  const length = side?.length ?? base.length;
  const width = side?.width ?? base.width;
  const color = side?.color ?? base.color;
  const fill = side?.fill ?? base.fill;
  const opacity = side?.opacity ?? base.opacity;
  const lineWidth = side?.lineWidth ?? base.lineWidth;
  return {
    kind: 'arrow',
    ...(shape === undefined ? {} : { shape }),
    ...(scale === undefined ? {} : { scale }),
    ...(length === undefined ? {} : { length }),
    ...(width === undefined ? {} : { width }),
    ...(color === undefined ? {} : { color }),
    ...(fill === undefined ? {} : { fill }),
    ...(opacity === undefined ? {} : { opacity }),
    ...(lineWidth === undefined ? {} : { lineWidth }),
  };
};

/** 汇总路径箭头语法糖与显式 marks */
const normalizePathMarks = (input: InputPath): IRPathBase['marks'] | undefined => {
  const marks: NonNullable<IRPathBase['marks']> = [];
  if (input.arrow !== undefined && input.arrow !== 'none') {
    if (input.arrow === '<-' || input.arrow === '<->') {
      marks.push({ pos: 0, mark: arrowMarkFromDetail(input.arrowDetail, 'start') });
    }
    if (input.arrow === '->' || input.arrow === '<->') {
      marks.push({ pos: 1, mark: arrowMarkFromDetail(input.arrowDetail, 'end') });
    }
  }
  if (input.marks !== undefined) marks.push(...input.marks);
  return marks.length === 0 ? undefined : marks;
};

/** 将作者侧 target 组装为 Source IR target */
const normalizeTarget = (input: InputTarget): IRTarget => parseTargetSugar(input);

/** 将作者侧 axis-line target 组装为受限的 Source IR target */
const normalizeAxisLineTarget = (input: InputAxisLineTarget): IRAxisLineTarget => {
  const target = normalizeTarget(input);
  const result = AxisLineTargetSchema.safeParse(target);
  if (!result.success) {
    throw new Error('normalizePath: axis-line target must resolve to a Cartesian position or NodeTarget', {
      cause: result.error,
    });
  }
  return result.data;
};

/** 将一条作者侧步骤组装为 Source IR 步骤 */
const normalizeStep = (input: InputStep): IRStep => {
  switch (input.kind) {
    case 'move':
      return { ...input, to: normalizeTarget(input.to) };
    case 'line':
    case 'fold':
    case 'curve':
    case 'cubic':
    case 'bend':
      return { ...input, to: normalizeTarget(input.to), ...(input.label === undefined ? {} : { label: input.label }) };
    case 'axis-line':
      return {
        ...input,
        to: normalizeAxisLineTarget(input.to),
        ...(input.label === undefined ? {} : { label: input.label }),
      };
    case 'arc': {
      const { center, label, ...step } = input;
      const normalized: IRArcStep = {
        ...step,
        ...(center === undefined ? {} : { center: normalizeTarget(center) }),
        ...(label === undefined ? {} : { label }),
      };
      return normalized;
    }
    case 'rectangle':
      return { ...input, from: normalizeTarget(input.from), to: normalizeTarget(input.to) };
    case 'smooth':
      return {
        ...input,
        points: input.points.map(normalizeTarget),
        ...(input.label === undefined ? {} : { label: input.label }),
      };
    case 'generator': {
      const { to, label, ...step } = input;
      const normalized: IRGeneratorStep = {
        ...step,
        ...(to === undefined ? {} : { to: normalizeTarget(to) }),
        ...(label === undefined ? {} : { label }),
      };
      return normalized;
    }
    case 'cycle':
      return input;
    case 'circlePath':
    case 'ellipsePath': {
      const { label, ...step } = input;
      return { ...step, ...(label === undefined ? {} : { label }) };
    }
  }
};

/** 将路径作者序列收敛为以 move 开头的有效 Source IR 步骤 */
const normalizePathChildren = (children: ReadonlyArray<IRStep>): Array<IRStep> => {
  const selfContainedRectangle = children.length === 1 && children[0]?.kind === 'rectangle';
  if (children.length < 2 && !selfContainedRectangle) {
    throw new Error('normalizePath: path requires at least 2 steps');
  }
  if (selfContainedRectangle || children[0]?.kind === 'move') return [...children];

  const [first, ...rest] = children;
  const target = 'to' in first && first.to !== undefined ? first.to : ([0, 0] as [number, number]);
  return [{ type: 'step', kind: 'move', to: target }, ...rest];
};

/** 将作者侧路径输入组装为 Source IR */
export const normalizePath = (input: InputPath): IRPath => {
  const {
    type: _type,
    authoring: _authoring,
    way,
    thickness,
    arrow: _arrow,
    arrowDetail: _arrowDetail,
    children,
    strokeWidth,
    marks: _marks,
    ...path
  } = input;
  void _type;
  void _authoring;
  void _arrow;
  void _arrowDetail;
  void _marks;
  if (way !== undefined && children !== undefined) {
    throw new Error('normalizePath: use either way or children, not both');
  }
  const authoredChildren =
    way === undefined ? (children === undefined ? undefined : children.map(normalizeStep)) : parseWay(way);
  if (authoredChildren === undefined) {
    throw new Error('normalizePath: path requires way or children');
  }
  const normalizedChildren = normalizePathChildren(authoredChildren);
  const marks = normalizePathMarks(input);
  return {
    type: 'path',
    ...path,
    children: normalizedChildren,
    ...(strokeWidth === undefined
      ? thickness === undefined
        ? {}
        : { strokeWidth: THICKNESS_TO_WIDTH[thickness] }
      : { strokeWidth }),
    ...(marks === undefined ? {} : { marks }),
  };
};
