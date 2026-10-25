import type { IRArcStep, IRAxisLineTarget, IRPath, IRStep, IRTarget } from '@retikz/core';
import { AxisLineTargetSchema, parseTargetSugar, parseWay } from '@retikz/core';

import { RetikzVanillaError, RetikzVanillaErrorCode } from '../../error';
import type { InputAxisLineTarget, InputPath, InputStep, InputTarget } from './types';

/** 将作者目标写法转换为 IR 目标 */
const normalizeTarget = (input: InputTarget): IRTarget => parseTargetSugar(input);

/** 将作者侧 axis-line target 组装为受限的 Source IR target */
const normalizeAxisLineTarget = (input: InputAxisLineTarget): IRAxisLineTarget => {
  const target = normalizeTarget(input);
  const result = AxisLineTargetSchema.safeParse(target);
  if (!result.success) {
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Normalize,
      'normalizePath: axis-line target must resolve to a Cartesian position or NodeTarget',
      {
        cause: result.error,
      },
    );
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
    throw new RetikzVanillaError(RetikzVanillaErrorCode.Normalize, 'normalizePath: path requires at least 2 steps');
  }

  if (selfContainedRectangle || children[0]?.kind === 'move') return [...children];

  const [first, ...rest] = children;
  const target = 'to' in first ? first.to : ([0, 0] as [number, number]);

  return [{ type: 'step', kind: 'move', to: target }, ...rest];
};

/** 将作者侧路径输入组装为 Source IR */
export const normalizePath = (input: InputPath): IRPath => {
  const { type: _type, authoring: _authoring, way, children, arrow, ...path } = input;
  void _type;
  void _authoring;
  if (way !== undefined && children !== undefined) {
    throw new RetikzVanillaError(
      RetikzVanillaErrorCode.Normalize,
      'normalizePath: use either way or children, not both',
    );
  }

  const authoredChildren =
    way === undefined ? (children === undefined ? undefined : children.map(normalizeStep)) : parseWay(way);
  if (authoredChildren === undefined) {
    throw new RetikzVanillaError(RetikzVanillaErrorCode.Normalize, 'normalizePath: path requires way or children');
  }

  const normalizedChildren = normalizePathChildren(authoredChildren);
  const normalizedArrow =
    typeof arrow === 'string'
      ? {
          ...(arrow === '<-' || arrow === '<->' ? { start: {} } : {}),
          ...(arrow === '->' || arrow === '<->' ? { end: {} } : {}),
        }
      : arrow;

  return {
    type: 'path',
    ...path,
    ...(normalizedArrow === undefined ? {} : { arrow: normalizedArrow }),
    children: normalizedChildren,
  };
};
