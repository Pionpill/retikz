/**
 * 时间轴动画 IR：AnimationTrack schema 校验 + compile 沿 id/meta-stamp 同款通路透传进 Scene + viewBox⇔根 校验
 * @description 覆盖：三载体 + scene 根 track stamp 落点；自定义 property 宽松透传（扩展口）；省略等价现状（settled）；
 *   zod 拒（非法 value / at / duration / iterations / property↔value 类型）；compile viewBox⇔根 warn+drop；
 *   id+meta+animations 共存；layout 中立；round-trip。
 */
import { describe, expect, it } from 'vitest';
import { compileToScene } from '../../src/compile/compile';
import { AnimationTrackSchema, NodeDefaultSchema, PathDefaultSchema, SceneSchema } from '../../src';
import type { CompileWarning, IR, IRAnimationTrack, ScenePrimitive } from '../../src';
import { flattenPrims } from '../helpers/flatten';

const scene = (children: IR['children'], extra: Partial<IR> = {}): IR => ({
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
const FADE: IRAnimationTrack = { property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 400, trigger: 'load' };
const SPIN: IRAnimationTrack = { property: 'rotate', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 360 }], duration: 1000, iterations: 'infinite', easing: 'linear' };
const CAMERA: IRAnimationTrack = { property: 'viewBox', keyframes: [{ at: 0, value: [0, 0, 100, 100] }, { at: 1, value: [10, 10, 50, 50] }], duration: 500, easing: 'ease-in-out' };
/** 柱子从基线长出：scaleY 0→1，支点底边中点 */
const GROW_UP: IRAnimationTrack = { property: 'scaleY', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 500, origin: 'south', easing: 'ease-out' };

describe('Happy path：三载体 + scene 根 stamp + 自定义透传', () => {
  it('node track → 平铺 shape 图元带 animations', () => {
    const prims = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], animations: [FADE] }]), silent).primitives;
    const rects = allOfType(prims, 'rect');
    expect(rects.length).toBeGreaterThanOrEqual(1);
    for (const rect of rects) expect(rect.animations).toEqual([FADE]);
  });

  it('text node track → 单层 GroupPrim 带 animations，子图元不带', () => {
    const prims = compileToScene(scene([{ type: 'node', id: 'n', position: [0, 0], text: 'A', animations: [FADE, SPIN] }]), silent).primitives;
    if (prims[0].type !== 'group') throw new Error('expected group');
    expect(prims[0].animations).toEqual([FADE, SPIN]);
    for (const child of prims[0].children) expect(child.animations).toBeUndefined();
  });

  it('path track → PathPrim 带 animations', () => {
    const prims = compileToScene(
      scene([{ type: 'path', id: 'p', animations: [FADE], children: [{ type: 'step', kind: 'move', to: [0, 0] }, { type: 'step', kind: 'line', to: [10, 0] }] }]),
      silent,
    ).primitives;
    const paths = allOfType(prims, 'path');
    expect(paths.length).toBeGreaterThanOrEqual(1);
    for (const path of paths) expect(path.animations).toEqual([FADE]);
  });

  it('scope track → GroupPrim 带 animations，子元素不继承', () => {
    const prims = compileToScene(scene([{ type: 'scope', id: 's', animations: [FADE], children: [{ type: 'node', id: 'a', position: [0, 0] }] }]), silent).primitives;
    const groups = prims.filter(p => p.type === 'group');
    expect(groups).toHaveLength(1);
    expect(groups[0].animations).toEqual([FADE]);
    for (const rect of allOfType(prims, 'rect')) expect(rect.animations).toBeUndefined();
  });

  it('scene 根 viewBox track → Scene.animations', () => {
    const built = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0] }], { animations: [CAMERA] }), silent);
    expect(built.animations).toEqual([CAMERA]);
  });

  it('自定义 property（blur）+ 任意 value（含对象）→ 通过并原样透传（扩展口）', () => {
    const custom: IRAnimationTrack = { property: 'blur', keyframes: [{ at: 0, value: 4 }, { at: 1, value: 0 }], duration: 300 };
    // 自定义通道允许任意 JSON value（含嵌套对象），供 renderer 注册插值器解释
    const objectValued: IRAnimationTrack = { property: 'gradientStop', keyframes: [{ at: 0, value: { offset: 0, color: 'red' } }, { at: 1, value: { offset: 1, color: 'blue' } }], duration: 300 };
    expect(AnimationTrackSchema.safeParse(objectValued).success).toBe(true);
    const prims = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], animations: [custom, objectValued] }]), silent).primitives;
    for (const rect of allOfType(prims, 'rect')) expect(rect.animations).toEqual([custom, objectValued]);
  });
});

describe('非均匀缩放 scaleX / scaleY + origin 支点', () => {
  it('scaleY + origin:"south" track → 图元原样透传（含 origin）', () => {
    const prims = compileToScene(scene([{ type: 'node', id: 'bar', position: [0, 0], animations: [GROW_UP] }]), silent).primitives;
    const rects = allOfType(prims, 'rect');
    expect(rects.length).toBeGreaterThanOrEqual(1);
    for (const rect of rects) expect(rect.animations).toEqual([GROW_UP]);
  });

  it('scaleX / scaleY value 须 number；origin 接受命名 anchor 或 [x,y]，拒非法', () => {
    expect(AnimationTrackSchema.safeParse({ property: 'scaleX', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 1 }).success).toBe(true);
    expect(AnimationTrackSchema.safeParse({ property: 'scaleY', keyframes: [{ at: 0, value: 'x' }], duration: 1 }).success).toBe(false);
    expect(AnimationTrackSchema.safeParse({ ...GROW_UP, origin: [2, 3] }).success).toBe(true);
    expect(AnimationTrackSchema.safeParse({ ...GROW_UP, origin: '' }).success).toBe(false);
    expect(AnimationTrackSchema.safeParse({ ...GROW_UP, origin: [1, 2, 3] }).success).toBe(false);
  });

  it('origin 在非 transform 通道上合法（语义由 renderer 忽略，schema 不拒）', () => {
    expect(AnimationTrackSchema.safeParse({ ...FADE, origin: 'center' }).success).toBe(true);
  });
});

describe('边界', () => {
  it('省略 animations → 图元无 animations 键（settled 等价现状）', () => {
    const rects = allOfType(compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0] }]), silent).primitives, 'rect');
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
    expect(AnimationTrackSchema.safeParse({ ...FADE, keyframes: [{ at: 1, value: 1 }, { at: 0, value: 0 }] }).success).toBe(false);
    expect(bad({ duration: 0 })).toBe(false);
    expect(bad({ iterations: 0 })).toBe(false);
    expect(bad({ iterations: -1 })).toBe(false);
  });

  it('property↔value 类型校验（内置通道）', () => {
    expect(AnimationTrackSchema.safeParse({ property: 'viewBox', keyframes: [{ at: 0, value: [0, 0, 1] }], duration: 1 }).success).toBe(false);
    expect(AnimationTrackSchema.safeParse({ property: 'viewBox', keyframes: [{ at: 0, value: [0, 0, 1, 1] }], duration: 1 }).success).toBe(true);
    expect(AnimationTrackSchema.safeParse({ property: 'opacity', keyframes: [{ at: 0, value: 'x' }], duration: 1 }).success).toBe(false);
    expect(AnimationTrackSchema.safeParse({ property: 'fill', keyframes: [{ at: 0, value: 1 }], duration: 1 }).success).toBe(false);
    expect(AnimationTrackSchema.safeParse({ property: 'fill', keyframes: [{ at: 0, value: 'red' }], duration: 1 }).success).toBe(true);
  });

  it('animations 进 nodeDefault / pathDefault → strict 拒', () => {
    expect(NodeDefaultSchema.safeParse({ animations: [FADE] }).success).toBe(false);
    expect(PathDefaultSchema.safeParse({ animations: [FADE] }).success).toBe(false);
  });
});

describe('compile 校验：viewBox ⇔ 根', () => {
  it('元素级 viewBox track → warn(ANIMATION_INVALID_PROPERTY) + drop', () => {
    const c = collector();
    const prims = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], animations: [CAMERA] }]), c).primitives;
    expect(c.warnings.some(w => w.code === 'ANIMATION_INVALID_PROPERTY')).toBe(true);
    for (const rect of allOfType(prims, 'rect')) expect(rect.animations).toBeUndefined();
  });

  it('元素级混合：viewBox 被 drop、其余 track 保留', () => {
    const c = collector();
    const prims = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], animations: [CAMERA, FADE] }]), c).primitives;
    for (const rect of allOfType(prims, 'rect')) expect(rect.animations).toEqual([FADE]);
    expect(c.warnings.filter(w => w.code === 'ANIMATION_INVALID_PROPERTY')).toHaveLength(1);
  });

  it('scene 根非 viewBox track → warn + drop（Scene.animations 省略）', () => {
    const c = collector();
    const built = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0] }], { animations: [FADE] }), c);
    expect(c.warnings.some(w => w.code === 'ANIMATION_INVALID_PROPERTY')).toBe(true);
    expect(built.animations).toBeUndefined();
  });
});

describe('交互', () => {
  it('id + meta + animations 共存互不影响', () => {
    const prims = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], meta: { s: 'plot' }, animations: [FADE] }]), silent).primitives;
    for (const rect of allOfType(prims, 'rect')) {
      expect(rect.id).toBe('a');
      expect(rect.meta).toEqual({ s: 'plot' });
      expect(rect.animations).toEqual([FADE]);
    }
  });

  it('layout 中立：加 / 删 animations 不改 layout / 几何', () => {
    const without = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], text: 'A' }]), silent);
    const withAnim = compileToScene(scene([{ type: 'node', id: 'a', position: [0, 0], text: 'A', animations: [FADE, SPIN] }]), silent);
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
        { type: 'path', id: 'p', animations: [{ property: 'pathDraw', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 600 }], children: [{ type: 'step', kind: 'move', to: [0, 0] }, { type: 'step', kind: 'line', to: [10, 0] }] },
        { type: 'scope', animations: [SPIN], children: [{ type: 'node', id: 'b', position: [5, 5] }] },
      ],
      { animations: [CAMERA] },
    );
    expect(SceneSchema.parse(JSON.parse(JSON.stringify(ir)))).toEqual(ir);
  });
});
