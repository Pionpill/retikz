import { describe, expectTypeOf, it } from 'vitest';
import type {
  RotateTransform,
  ScaleTransform,
  Transform,
  TranslateTransform,
} from '../../src';

describe('Transform named types', () => {
  it('每个 named type 的 kind 字面量与命名对照一致', () => {
    expectTypeOf<TranslateTransform['kind']>().toEqualTypeOf<'translate'>();
    expectTypeOf<RotateTransform['kind']>().toEqualTypeOf<'rotate'>();
    expectTypeOf<ScaleTransform['kind']>().toEqualTypeOf<'scale'>();
  });

  it('Transform 是 3 个 named type 的并集', () => {
    expectTypeOf<Transform>().toEqualTypeOf<
      TranslateTransform | RotateTransform | ScaleTransform
    >();
  });

  it('字段类型签名稳定', () => {
    expectTypeOf<TranslateTransform>().toHaveProperty('x').toEqualTypeOf<number>();
    expectTypeOf<TranslateTransform>().toHaveProperty('y').toEqualTypeOf<number>();
    expectTypeOf<RotateTransform>().toHaveProperty('degrees').toEqualTypeOf<number>();
    expectTypeOf<RotateTransform>().toHaveProperty('cx').toEqualTypeOf<number | undefined>();
    expectTypeOf<ScaleTransform>().toHaveProperty('y').toEqualTypeOf<number | undefined>();
  });
});
