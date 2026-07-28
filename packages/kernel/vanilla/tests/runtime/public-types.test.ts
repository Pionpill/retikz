import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  MountCanvasOptions,
  MountOptions,
  RenderToStringOptions,
  RetainedCanvasUpdateOptions,
  RetainedCanvasView,
  RetainedSvgUpdateOptions,
  RetainedSvgView,
  VanillaViewModeValue,
} from '../../src';

import { VanillaViewMode } from '../../src';

type IsAssignable<TValue, TTarget> = TValue extends TTarget ? true : false;

describe('Vanilla retained 公开类型', () => {
  it('SSR options 不接受 retained renderer factory，mount options 才拥有 runtime 配置', () => {
    expectTypeOf<RenderToStringOptions>().toHaveProperty('runtime').toEqualTypeOf<undefined>();
    expectTypeOf<IsAssignable<MountOptions, RenderToStringOptions>>().toEqualTypeOf<false>();
    expectTypeOf<MountOptions>().toHaveProperty('runtime');
    expectTypeOf<MountCanvasOptions>().toHaveProperty('runtime');
  });

  it('SVG 与 Canvas update options 只暴露各自会被消费的配置', () => {
    expectTypeOf<Parameters<RetainedSvgView['update']>[1]>().toEqualTypeOf<RetainedSvgUpdateOptions | undefined>();
    expectTypeOf<RetainedSvgUpdateOptions>().toHaveProperty('canvas').toEqualTypeOf<undefined>();
    expectTypeOf<Parameters<RetainedCanvasView['update']>[1]>().toEqualTypeOf<
      RetainedCanvasUpdateOptions | undefined
    >();
    expectTypeOf<RetainedCanvasUpdateOptions>().toHaveProperty('canvas');
    expectTypeOf<IsAssignable<RetainedCanvasUpdateOptions, RetainedSvgUpdateOptions>>().toEqualTypeOf<false>();
  });

  it('view mode 由公开 const object enum 与 ValueOf 类型共同约束', () => {
    expect(VanillaViewMode).toEqual({ Retained: 'retained', Static: 'static' });
    expectTypeOf(VanillaViewMode.Retained).toEqualTypeOf<'retained'>();
    expectTypeOf<VanillaViewModeValue>().toEqualTypeOf<'retained' | 'static'>();
  });
});
