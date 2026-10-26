import { describe, expect, it } from 'vitest';

import type { CompileWarning, IRAnimationTrack, IRScene, ScenePrimitive } from '../../src';
import {
  AnimationTrackSchema,
  BuiltinCompileWarningCode,
  NodeDefaultSchema,
  PathDefaultSchema,
  SceneSchema,
} from '../../src';
import { compileToScene } from '../../src/compile/compile';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IRScene['children'], extra: Partial<IRScene> = {}): IRScene => ({
  version: 1,
  type: 'scene',
  children,
  ...extra,
});

const silent = { onWarn: () => {} };

const collector = () => {
  const warnings: Array<CompileWarning> = [];
  return { onWarn: (w: CompileWarning) => warnings.push(w), warnings };
};

const allOfType = (prims: ReadonlyArray<ScenePrimitive>, type: ScenePrimitive['type']): Array<ScenePrimitive> =>
  flattenPrims(prims).filter(p => p.type === type);

/** opacity fadeIn track（末帧 1 = base，settled 不变量） */
const FADE: IRAnimationTrack = {
  property: 'opacity',
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
  duration: 400,
  trigger: 'load',
};

const SPIN: IRAnimationTrack = {
  property: 'rotate',
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 360 },
  ],
  duration: 1000,
  iterations: 'infinite',
  easing: 'linear',
};

const CAMERA: IRAnimationTrack = {
  property: 'viewBox',
  keyframes: [
    { at: 0, value: [0, 0, 100, 100] },
    { at: 1, value: [10, 10, 50, 50] },
  ],
  duration: 500,
  easing: 'ease-in-out',
};

/** 柱子从基线长出：scaleY 0→1，支点底边中点 */
const GROW_UP: IRAnimationTrack = {
  property: 'scaleY',
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
  duration: 500,
  origin: 'bottom',
  easing: 'ease-out',
};

describe('Happy path：三载体与 scene 根动画', () => {
  it.each([
    { property: 'viewBox', value: ['x', 0, 100, 100] },
    { property: 'viewBox', value: [0, 0, 0, 100] },
    { property: 'viewBox', value: [0, 0, 100, -1] },
    { property: 'opacity', value: 1.1 },
    { property: 'fillOpacity', value: -0.1 },
    { property: 'strokeOpacity', value: 2 },
    { property: 'strokeWidth', value: -1 },
    { property: 'pathDraw', value: 2 },
    { property: 'fill', value: '' },
    { property: 'stroke', value: 1 },
  ])('拒绝属性值域以外的外部数据 %j', ({ property, value }) => {
    expect(AnimationTrackSchema.safeParse({ property, keyframes: [{ at: 0, value }], duration: 100 }).success).toBe(
      false,
    );
  });

  it.each([
    [-0.1, 0, 1, 1],
    [0, 0, 1.1, 1],
  ])('拒绝越界贝塞尔 x 控制点 %j', easing => {
    expect(AnimationTrackSchema.safeParse({ ...FADE, easing }).success).toBe(false);
  });

  it('虚线偏移允许负值，缩放允许反射，颜色复用非空约束', () => {
    for (const [property, value] of [
      ['dashOffset', -10],
      ['scaleX', -1],
      ['fill', '#ff0000'],
    ]) {
      expect(AnimationTrackSchema.safeParse({ property, keyframes: [{ at: 0, value }], duration: 100 }).success).toBe(
        true,
      );
    }
  });
  it.each(['blur', 'gradientStop', 'toString'])('外部 JSON 不接受未知属性 %s', property => {
    expect(AnimationTrackSchema.safeParse({ ...FADE, property }).success).toBe(false);
  });

  it.each(['spring', 'constructor', 'toString'])('外部 JSON 不接受未知缓动 %s', easing => {
    expect(AnimationTrackSchema.safeParse({ ...FADE, easing }).success).toBe(false);
    expect(AnimationTrackSchema.safeParse({ ...FADE, keyframes: [{ at: 0, value: 0, easing }] }).success).toBe(false);
  });

  it('保留轨道和关键帧的贝塞尔四元组', () => {
    expect(
      AnimationTrackSchema.safeParse({
        ...FADE,
        easing: [0.34, 1.56, 0.64, 1],
        keyframes: [
          { at: 0, value: 0, easing: [0, 0, 1, 1] },
          { at: 1, value: 1 },
        ],
      }).success,
    ).toBe(true);
  });
  it('node track → 平铺 shape 图元带 animations', () => {
    const prims = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], animations: [FADE] }]), silent).scene
      .primitives;
    const rects = allOfType(prims, 'rect');

    expect(rects.length).toBeGreaterThanOrEqual(1);

    for (const rect of rects) expect(rect.animations).toEqual([FADE]);
  });

  it('text node track → 单层 GroupPrimitive 带 animations，子图元不带', () => {
    const prims = compileToScene(
      scene([{ type: 'node', id: 'n', position: [0, 0], text: 'A', animations: [FADE, SPIN] }]),
      silent,
    ).scene.primitives;
    if (prims[0].type !== 'group') throw new Error('expected group');

    expect(prims[0].animations).toEqual([FADE, SPIN]);

    for (const child of prims[0].children) expect(child.animations).toBeUndefined();
  });

  it('path track → PathPrimitive 带 animations', () => {
    const prims = compileToScene(
      scene([
        {
          type: 'path',
          id: 'p',
          animations: [FADE],
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
      ]),
      silent,
    ).scene.primitives;
    const paths = allOfType(prims, 'path');

    expect(paths.length).toBeGreaterThanOrEqual(1);

    for (const path of paths) expect(path.animations).toEqual([FADE]);
  });

  it('scope track → GroupPrimitive 带 animations，子元素不继承', () => {
    const prims = compileToScene(
      scene([{ type: 'scope', id: 's', animations: [FADE], children: [{ type: 'node', id: 'a', position: [0, 0] }] }]),
      silent,
    ).scene.primitives;
    const groups = prims.filter(p => p.type === 'group');

    expect(groups).toHaveLength(1);
    expect(groups[0].animations).toEqual([FADE]);

    for (const rect of allOfType(prims, 'rect')) expect(rect.animations).toBeUndefined();
  });

  it('scene 根 viewBox track → Scene.animations', () => {
    const built = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0] }], { animations: [CAMERA] }),
      silent,
    ).scene;

    expect(built.animations).toEqual([CAMERA]);
  });
});

describe('非均匀缩放 scaleX / scaleY + origin 支点', () => {
  it('scaleY + origin:"bottom" track → 图元原样透传（含 origin）', () => {
    const prims = compileToScene(scene([{ type: 'node', id: 'bar', position: [0, 0], animations: [GROW_UP] }]), silent)
      .scene.primitives;
    const rects = allOfType(prims, 'rect');

    expect(rects.length).toBeGreaterThanOrEqual(1);

    for (const rect of rects) expect(rect.animations).toEqual([GROW_UP]);
  });

  it('scaleX / scaleY value 须 number；origin 接受命名 anchor 或 [x,y]，拒非法', () => {
    expect(
      AnimationTrackSchema.safeParse({
        property: 'scaleX',
        keyframes: [
          { at: 0, value: 0 },
          { at: 1, value: 1 },
        ],
        duration: 1,
      }).success,
    ).toBe(true);
    expect(
      AnimationTrackSchema.safeParse({ property: 'scaleY', keyframes: [{ at: 0, value: 'x' }], duration: 1 }).success,
    ).toBe(false);
    expect(AnimationTrackSchema.safeParse({ ...GROW_UP, origin: [2, 3] }).success).toBe(true);
    expect(AnimationTrackSchema.safeParse({ ...GROW_UP, origin: '' }).success).toBe(false);
    expect(AnimationTrackSchema.safeParse({ ...GROW_UP, origin: 'south' }).success).toBe(false);
    expect(AnimationTrackSchema.safeParse({ ...GROW_UP, origin: [1, 2, 3] }).success).toBe(false);
  });

  it('origin 在非 transform 通道上合法（语义由 renderer 忽略，schema 不拒）', () => {
    expect(AnimationTrackSchema.safeParse({ ...FADE, origin: 'center' }).success).toBe(true);
  });
});

describe('边界', () => {
  it('省略 animations → 图元无 animations 键（settled 等价现状）', () => {
    const rects = allOfType(
      compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0] }]), silent).scene.primitives,
      'rect',
    );

    for (const rect of rects) expect('animations' in rect).toBe(false);
  });

  it('iterations infinite / 小数 合法', () => {
    expect(AnimationTrackSchema.safeParse({ ...FADE, iterations: 'infinite' }).success).toBe(true);
    expect(AnimationTrackSchema.safeParse({ ...FADE, iterations: 2.5 }).success).toBe(true);
  });
});

describe('错误路径：zod reject', () => {
  const bad = (over: Record<string, unknown>) => AnimationTrackSchema.safeParse({ ...FADE, ...over }).success;
  it('非法 value / at / duration / iterations → reject', () => {
    expect(AnimationTrackSchema.safeParse({ ...FADE, keyframes: [{ at: 0, value: () => 1 }] }).success).toBe(false);
    expect(AnimationTrackSchema.safeParse({ ...FADE, keyframes: [{ at: 0, value: undefined }] }).success).toBe(false);
    expect(AnimationTrackSchema.safeParse({ ...FADE, keyframes: [{ at: 1.5, value: 1 }] }).success).toBe(false);
    expect(
      AnimationTrackSchema.safeParse({
        ...FADE,
        keyframes: [
          { at: 1, value: 1 },
          { at: 0, value: 0 },
        ],
      }).success,
    ).toBe(false);
    expect(bad({ duration: 0 })).toBe(false);
    expect(bad({ iterations: 0 })).toBe(false);
    expect(bad({ iterations: -1 })).toBe(false);
  });

  it('property↔value 类型校验（内置通道）', () => {
    expect(
      AnimationTrackSchema.safeParse({ property: 'viewBox', keyframes: [{ at: 0, value: [0, 0, 1] }], duration: 1 })
        .success,
    ).toBe(false);
    expect(
      AnimationTrackSchema.safeParse({ property: 'viewBox', keyframes: [{ at: 0, value: [0, 0, 1, 1] }], duration: 1 })
        .success,
    ).toBe(true);
    expect(
      AnimationTrackSchema.safeParse({ property: 'opacity', keyframes: [{ at: 0, value: 'x' }], duration: 1 }).success,
    ).toBe(false);
    expect(
      AnimationTrackSchema.safeParse({ property: 'fill', keyframes: [{ at: 0, value: 1 }], duration: 1 }).success,
    ).toBe(false);
    expect(
      AnimationTrackSchema.safeParse({ property: 'fill', keyframes: [{ at: 0, value: 'red' }], duration: 1 }).success,
    ).toBe(true);
  });

  it('animations 进 nodeDefault / pathDefault → strict 拒', () => {
    expect(NodeDefaultSchema.safeParse({ animations: [FADE] }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ animations: [FADE] }).success).toBe(false);
  });
});

describe('compile 校验：viewBox ⇔ 根', () => {
  it('元素级 viewBox track → warn(ANIMATION_INVALID_PROPERTY) + drop', () => {
    const c = collector();
    const prims = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], animations: [CAMERA] }]), c).scene
      .primitives;

    expect(c.warnings.some(w => w.code === BuiltinCompileWarningCode.AnimationInvalidProperty)).toBe(true);

    for (const rect of allOfType(prims, 'rect')) expect(rect.animations).toBeUndefined();
  });

  it('元素级混合：viewBox 被 drop、其余 track 保留', () => {
    const c = collector();
    const prims = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], animations: [CAMERA, FADE] }]), c)
      .scene.primitives;

    for (const rect of allOfType(prims, 'rect')) expect(rect.animations).toEqual([FADE]);

    expect(c.warnings.filter(w => w.code === BuiltinCompileWarningCode.AnimationInvalidProperty)).toHaveLength(1);
  });

  it('scene 根非 viewBox track → warn + drop（Scene.animations 省略）', () => {
    const c = collector();
    const built = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0] }], { animations: [FADE] }), c).scene;

    expect(c.warnings.some(w => w.code === BuiltinCompileWarningCode.AnimationInvalidProperty)).toBe(true);
    expect(built.animations).toBeUndefined();
  });
});

describe('交互', () => {
  it('id + meta + animations 共存互不影响', () => {
    const prims = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0], meta: { s: 'plot' }, animations: [FADE] }]),
      silent,
    ).scene.primitives;

    for (const rect of allOfType(prims, 'rect')) {
      expect(rect.id).toBe('a');
      expect(rect.meta).toEqual({ s: 'plot' });
      expect(rect.animations).toEqual([FADE]);
    }
  });

  it('layout 中立：加 / 删 animations 不改 layout / 几何', () => {
    const without = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], text: 'A' }]), silent).scene;
    const withAnim = compileToScene(
      scene([{ type: 'node', id: 'a', position: [0, 0], text: 'A', animations: [FADE, SPIN] }]),
      silent,
    ).scene;

    expect(withAnim.layout).toEqual(without.layout);

    const strip = (prims: ReadonlyArray<ScenePrimitive>): Array<Record<string, unknown>> =>
      flattenPrims(prims).map(p => {
        const clone: Record<string, unknown> = { ...p };
        delete clone.animations;
        return clone;
      });

    expect(strip(withAnim.primitives)).toEqual(strip(without.primitives));
  });

  it('round-trip：含三载体 + scene 根 animations 的 IR → JSON → parse → 等价', () => {
    const ir = scene(
      [
        { type: 'node', id: 'a', position: [0, 0], animations: [FADE, GROW_UP] },
        {
          type: 'path',
          id: 'p',
          animations: [
            {
              property: 'pathDraw',
              keyframes: [
                { at: 0, value: 0 },
                { at: 1, value: 1 },
              ],
              duration: 600,
            },
          ],
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
        { type: 'scope', animations: [SPIN], children: [{ type: 'node', id: 'b', position: [5, 5] }] },
      ],
      { animations: [CAMERA] },
    );

    expect(SceneSchema.parse(JSON.parse(JSON.stringify(ir)))).toEqual(SceneSchema.parse(ir));
  });
});
