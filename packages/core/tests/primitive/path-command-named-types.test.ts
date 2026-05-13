import { describe, expectTypeOf, it } from 'vitest';
import type {
  ArcPathCommand,
  ClosePathCommand,
  CubicPathCommand,
  EllipseArcPathCommand,
  LinePathCommand,
  MovePathCommand,
  PathCommand,
  QuadPathCommand,
} from '../../src';

describe('PathCommand named types', () => {
  it('每个 named type 的 kind 字面量与命名对照一致', () => {
    expectTypeOf<MovePathCommand['kind']>().toEqualTypeOf<'move'>();
    expectTypeOf<LinePathCommand['kind']>().toEqualTypeOf<'line'>();
    expectTypeOf<QuadPathCommand['kind']>().toEqualTypeOf<'quad'>();
    expectTypeOf<CubicPathCommand['kind']>().toEqualTypeOf<'cubic'>();
    expectTypeOf<ArcPathCommand['kind']>().toEqualTypeOf<'arc'>();
    expectTypeOf<EllipseArcPathCommand['kind']>().toEqualTypeOf<'ellipseArc'>();
    expectTypeOf<ClosePathCommand['kind']>().toEqualTypeOf<'close'>();
  });

  it('PathCommand 是 7 个 named type 的并集', () => {
    expectTypeOf<PathCommand>().toEqualTypeOf<
      | MovePathCommand
      | LinePathCommand
      | QuadPathCommand
      | CubicPathCommand
      | ArcPathCommand
      | EllipseArcPathCommand
      | ClosePathCommand
    >();
  });

  it('每个 named 字段都直接可读（无需 type narrow）', () => {
    expectTypeOf<MovePathCommand>().toHaveProperty('to').toEqualTypeOf<[number, number]>();
    expectTypeOf<QuadPathCommand>().toHaveProperty('control').toEqualTypeOf<[number, number]>();
    expectTypeOf<CubicPathCommand>().toHaveProperty('control1').toEqualTypeOf<[number, number]>();
    expectTypeOf<ArcPathCommand>().toHaveProperty('radius').toEqualTypeOf<number>();
    expectTypeOf<EllipseArcPathCommand>().toHaveProperty('radiusX').toEqualTypeOf<number>();
    expectTypeOf<EllipseArcPathCommand>().toHaveProperty('radiusY').toEqualTypeOf<number>();
  });
});
