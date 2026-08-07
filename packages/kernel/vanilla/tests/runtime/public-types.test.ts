import type { Scene } from '@retikz/core';

import { describe, expect, expectTypeOf, it } from 'vitest';

import type {
  CommonOptions,
  MountCanvasOptions,
  MountOptions,
  MountUnifiedOptions,
  RawStaticMountCanvasOptions,
  RawStaticMountOptions,
  RenderToStringOptions,
  RetainedCanvasUpdateOptions,
  RetainedCanvasView,
  RetainedSvgUpdateOptions,
  RetainedSvgView,
  StaticMountCanvasOptions,
  StaticMountOptions,
  StaticMountUnifiedOptions,
  StaticRawCanvasView,
  StaticRawSvgView,
  VanillaEmbedSpec,
  VanillaFigureSpec,
  VanillaPathSpec,
  VanillaRuntimeOptions,
  VanillaScopeSpec,
  VanillaViewModeValue,
} from '../../src';

import { mount, mountCanvas, mountSvg, VanillaViewMode } from '../../src';

type IsAssignable<TValue, TTarget> = TValue extends TTarget ? true : false;
type HasKey<TValue, TKey extends PropertyKey> = TKey extends keyof TValue ? true : false;

const assertStaticMountRejectsRetainedRuntime = (): void => {
  const container = {} as Element;
  const scene = {} as Scene;
  const runtime = {} as NonNullable<MountOptions['runtime']>;

  // @ts-expect-error 预编译 Scene 的 SVG static mount 不接受 retained Runtime 配置
  mountSvg(container, scene, { runtime });
  // @ts-expect-error 预编译 Scene 的 Canvas static mount 不接受 retained Runtime 配置
  mountCanvas(container, scene, { runtime });
  // @ts-expect-error 预编译 Scene 的统一 static mount 不接受 retained Runtime 配置
  mount(container, scene, { runtime });
};

void assertStaticMountRejectsRetainedRuntime;

describe('Vanilla retained 公开类型', () => {
  it('基础 authoring 与 runtime 不再暴露 inspection 字段', () => {
    expectTypeOf<HasKey<CommonOptions, 'inspect'>>().toEqualTypeOf<false>();
    expectTypeOf<HasKey<VanillaFigureSpec, 'inspect'>>().toEqualTypeOf<false>();
    expectTypeOf<HasKey<VanillaScopeSpec, 'inspect'>>().toEqualTypeOf<false>();
    expectTypeOf<HasKey<VanillaPathSpec, 'inspect'>>().toEqualTypeOf<false>();
    expectTypeOf<HasKey<VanillaEmbedSpec, 'inspect'>>().toEqualTypeOf<false>();
  });

  it('SSR options 不接受 retained renderer factory，mount options 才拥有 runtime 配置', () => {
    expectTypeOf<RenderToStringOptions>().toHaveProperty('runtime').toEqualTypeOf<undefined>();
    expectTypeOf<IsAssignable<MountOptions, RenderToStringOptions>>().toEqualTypeOf<false>();
    expectTypeOf<MountOptions>().toHaveProperty('runtime');
    expectTypeOf<MountCanvasOptions>().toHaveProperty('runtime');
    expectTypeOf<StaticMountOptions>().toHaveProperty('runtime').toEqualTypeOf<undefined>();
    expectTypeOf<StaticMountCanvasOptions>().toHaveProperty('runtime').toEqualTypeOf<undefined>();
    expectTypeOf<StaticMountUnifiedOptions>().toHaveProperty('runtime').toEqualTypeOf<undefined>();
    expectTypeOf<IsAssignable<MountOptions, StaticMountOptions>>().toEqualTypeOf<false>();
    expectTypeOf<IsAssignable<MountCanvasOptions, StaticMountCanvasOptions>>().toEqualTypeOf<false>();
    expectTypeOf<IsAssignable<MountUnifiedOptions, StaticMountUnifiedOptions>>().toEqualTypeOf<false>();
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

  it('raw static mount 由 runtime mode 判别，update 统一接受 IR 与 plain spec', () => {
    expectTypeOf<RawStaticMountOptions>().toHaveProperty('runtime');
    expectTypeOf<RawStaticMountCanvasOptions>().toHaveProperty('runtime');
    expectTypeOf<Parameters<StaticRawSvgView['update']>[0]>().toEqualTypeOf<Parameters<RetainedSvgView['update']>[0]>();
    expectTypeOf<Parameters<StaticRawCanvasView['update']>[0]>().toEqualTypeOf<
      Parameters<RetainedCanvasView['update']>[0]
    >();
    expectTypeOf({
      mode: 'static' as const,
      updateStrategy: 'full' as const,
    }).not.toMatchTypeOf<VanillaRuntimeOptions>();
  });
});
