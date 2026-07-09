import type {
  IRArcStep,
  IRBendStep,
  IRCirclePathStep,
  IRCubicStep,
  IRCurveStep,
  IRCycleStep,
  IREllipsePathStep,
  IRFoldStep,
  IRGeneratorStep,
  IRLineStep,
  IRMoveStep,
  IRRectangleStep,
  IRSmoothStep,
} from '@retikz/core';
import type { ReactNode } from 'react';

import { describe, expectTypeOf, it } from 'vitest';

import type {
  ArcStepProps,
  BendStepProps,
  CirclePathStepProps,
  CubicStepProps,
  CurveStepProps,
  CycleStepProps,
  DslTarget,
  EllipsePathStepProps,
  FoldStepProps,
  GeneratorStepProps,
  LineStepProps,
  MoveStepProps,
  RectangleStepProps,
  SmoothStepProps,
  StepProps,
} from '../../../src';

type DslField<T, TKey extends keyof T, TValue> =
  {} extends Pick<T, TKey> ? { [TField in TKey]?: TValue } : { [TField in TKey]: TValue };

type TargetField<T> = 'to' extends keyof T ? DslField<T, 'to', DslTarget> : {};

type FromField<T> = 'from' extends keyof T ? DslField<T, 'from', DslTarget> : {};

type CenterField<T> = 'center' extends keyof T ? DslField<T, 'center', DslTarget> : {};

type PointsField<T> = 'points' extends keyof T ? DslField<T, 'points', Array<DslTarget>> : {};

type CoreStepProps<T> = Omit<T, 'type' | 'to' | 'from' | 'center' | 'points'> &
  TargetField<T> &
  FromField<T> &
  CenterField<T> &
  PointsField<T>;

type LabelChildren<T> = T extends { label?: unknown } ? { children?: ReactNode } : {};

type DslStepProps<T> = CoreStepProps<T> & LabelChildren<T>;

type LineStepPropsFromCore = Omit<DslStepProps<IRLineStep>, 'kind'> & { kind?: 'line' };

type IsNever<T> = [T] extends [never] ? true : false;

type IsAssignable<TActual, TExpected> = [TActual] extends [TExpected] ? true : false;

type IsBranchParity<TActual, TExpected> =
  IsNever<Exclude<keyof TActual, keyof TExpected>> extends true
    ? IsNever<Exclude<keyof TExpected, keyof TActual>> extends true
      ? IsAssignable<TActual, TExpected> extends true
        ? IsAssignable<TExpected, TActual>
        : false
      : false
    : false;

describe('StepProps named types', () => {
  it('每个 named type 的 kind 字面量与命名对照一致', () => {
    expectTypeOf<MoveStepProps['kind']>().toEqualTypeOf<'move'>();
    expectTypeOf<LineStepProps['kind']>().toEqualTypeOf<'line' | undefined>();
    expectTypeOf<FoldStepProps['kind']>().toEqualTypeOf<'fold'>();
    expectTypeOf<CycleStepProps['kind']>().toEqualTypeOf<'cycle'>();
    expectTypeOf<CurveStepProps['kind']>().toEqualTypeOf<'curve'>();
    expectTypeOf<CubicStepProps['kind']>().toEqualTypeOf<'cubic'>();
    expectTypeOf<BendStepProps['kind']>().toEqualTypeOf<'bend'>();
    expectTypeOf<ArcStepProps['kind']>().toEqualTypeOf<'arc'>();
    expectTypeOf<CirclePathStepProps['kind']>().toEqualTypeOf<'circlePath'>();
    expectTypeOf<EllipsePathStepProps['kind']>().toEqualTypeOf<'ellipsePath'>();
    expectTypeOf<RectangleStepProps['kind']>().toEqualTypeOf<'rectangle'>();
    expectTypeOf<SmoothStepProps['kind']>().toEqualTypeOf<'smooth'>();
    expectTypeOf<GeneratorStepProps['kind']>().toEqualTypeOf<'generator'>();
  });

  it('StepProps 是 13 个 named type 的并集', () => {
    expectTypeOf<StepProps>().toEqualTypeOf<
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
      | GeneratorStepProps
    >();
  });

  it('Pick<> / Omit<> 派生：能从单 named type 提子集（wrapper 用例）', () => {
    // bendDirection 现为可选（与 outAngle/inAngle 互补，同给时 out/in 优先）
    type BendDir = Pick<BendStepProps, 'bendDirection'>;
    expectTypeOf<BendDir>().toEqualTypeOf<{ bendDirection?: 'left' | 'right' }>();
  });

  it('each StepProps branch matches the core IR step after DSL target mapping', () => {
    expectTypeOf<IsBranchParity<MoveStepProps, DslStepProps<IRMoveStep>>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<LineStepProps, LineStepPropsFromCore>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<FoldStepProps, DslStepProps<IRFoldStep>>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<CycleStepProps, DslStepProps<IRCycleStep>>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<CurveStepProps, DslStepProps<IRCurveStep>>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<CubicStepProps, DslStepProps<IRCubicStep>>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<BendStepProps, DslStepProps<IRBendStep>>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<ArcStepProps, DslStepProps<IRArcStep>>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<CirclePathStepProps, DslStepProps<IRCirclePathStep>>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<EllipsePathStepProps, DslStepProps<IREllipsePathStep>>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<RectangleStepProps, DslStepProps<IRRectangleStep>>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<SmoothStepProps, DslStepProps<IRSmoothStep>>>().toEqualTypeOf<true>();
    expectTypeOf<IsBranchParity<GeneratorStepProps, DslStepProps<IRGeneratorStep>>>().toEqualTypeOf<true>();
  });
});
