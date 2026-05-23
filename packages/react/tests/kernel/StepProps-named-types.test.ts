import { describe, expectTypeOf, it } from 'vitest';
import type {
  ArcStepProps,
  BendStepProps,
  CirclePathStepProps,
  CubicStepProps,
  CurveStepProps,
  CycleStepProps,
  EllipsePathStepProps,
  FoldStepProps,
  LineStepProps,
  MoveStepProps,
  RectangleStepProps,
  StepProps,
} from '../../src';

describe('StepProps named types', () => {
  it('每个 named type 的 kind 字面量与命名对照一致', () => {
    expectTypeOf<MoveStepProps['kind']>().toEqualTypeOf<'move'>();
    expectTypeOf<LineStepProps['kind']>().toEqualTypeOf<'line' | undefined>();
    expectTypeOf<FoldStepProps['kind']>().toEqualTypeOf<'step'>();
    expectTypeOf<CycleStepProps['kind']>().toEqualTypeOf<'cycle'>();
    expectTypeOf<CurveStepProps['kind']>().toEqualTypeOf<'curve'>();
    expectTypeOf<CubicStepProps['kind']>().toEqualTypeOf<'cubic'>();
    expectTypeOf<BendStepProps['kind']>().toEqualTypeOf<'bend'>();
    expectTypeOf<ArcStepProps['kind']>().toEqualTypeOf<'arc'>();
    expectTypeOf<CirclePathStepProps['kind']>().toEqualTypeOf<'circlePath'>();
    expectTypeOf<EllipsePathStepProps['kind']>().toEqualTypeOf<'ellipsePath'>();
    expectTypeOf<RectangleStepProps['kind']>().toEqualTypeOf<'rectangle'>();
  });

  it('StepProps 是 11 个 named type 的并集', () => {
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
    >();
  });

  it('Pick<> / Omit<> 派生：能从单 named type 提子集（wrapper 用例）', () => {
    type BendDir = Pick<BendStepProps, 'bendDirection'>;
    expectTypeOf<BendDir>().toEqualTypeOf<{ bendDirection: 'left' | 'right' }>();
  });
});
