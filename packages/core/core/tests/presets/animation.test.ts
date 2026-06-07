/**
 * ADR-05 具名动画 preset：Sugar=Kernel 等价（preset 输出逐字段 = 手写 track）+ opts 覆盖 + 必填校验 + loop/stagger
 */
import { describe, expect, it } from 'vitest';
import {
  AnimationTrackSchema,
  cameraTo,
  colorShift,
  drawOn,
  fadeIn,
  grow,
  growUp,
  loop,
  pulse,
  scaleIn,
  slideIn,
  spin,
  stagger,
} from '../../src';

describe('Sugar=Kernel 等价（默认参数）', () => {
  it('fadeIn / drawOn / scaleIn / grow', () => {
    expect(fadeIn()).toEqual({ property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 400, easing: 'ease-out' });
    expect(drawOn()).toEqual({ property: 'pathDraw', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 600, easing: 'ease-in-out' });
    expect(scaleIn()).toEqual({ property: 'scale', keyframes: [{ at: 0, value: 0.8 }, { at: 1, value: 1 }], duration: 400, easing: 'ease-out' });
    expect(grow()).toEqual({ property: 'scale', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 400, easing: 'ease-out' });
  });

  it('growUp / slideIn / colorShift', () => {
    expect(growUp()).toEqual({ property: 'scaleY', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], origin: 'south', duration: 500, easing: 'ease-out' });
    expect(slideIn()).toEqual({ property: 'translateX', keyframes: [{ at: 0, value: -20 }, { at: 1, value: 0 }], duration: 400, easing: 'ease-out' });
    expect(colorShift({ from: '#ff0000', to: '#0000ff' })).toEqual({ property: 'fill', keyframes: [{ at: 0, value: '#ff0000' }, { at: 1, value: '#0000ff' }], duration: 400, easing: 'ease-in-out' });
  });

  it('cameraTo / pulse / spin', () => {
    expect(cameraTo({ from: [0, 0, 100, 100], to: [10, 10, 50, 50] })).toEqual({ property: 'viewBox', keyframes: [{ at: 0, value: [0, 0, 100, 100] }, { at: 1, value: [10, 10, 50, 50] }], duration: 800, easing: 'ease-in-out' });
    expect(pulse()).toEqual({ property: 'scale', keyframes: [{ at: 0, value: 1 }, { at: 0.5, value: 1.1 }, { at: 1, value: 1 }], iterations: 'infinite', duration: 1000, easing: 'ease-in-out' });
    expect(spin()).toEqual({ property: 'rotate', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 360 }], iterations: 'infinite', duration: 1000, easing: 'linear' });
  });

  it('每个 preset 产出都通过 AnimationTrackSchema（合法 IR）', () => {
    for (const track of [fadeIn(), drawOn(), scaleIn(), grow(), growUp(), slideIn(), colorShift({ from: '#000', to: '#fff' }), cameraTo({ from: [0, 0, 1, 1], to: [0, 0, 2, 2] }), pulse(), spin()]) {
      expect(AnimationTrackSchema.safeParse(track).success).toBe(true);
    }
  });
});

describe('opts 覆盖', () => {
  it('base opts（duration/delay/easing/trigger）透传', () => {
    expect(fadeIn({ duration: 1000, delay: 100, easing: 'linear', trigger: 'visible' })).toEqual({ property: 'opacity', keyframes: [{ at: 0, value: 0 }, { at: 1, value: 1 }], duration: 1000, easing: 'linear', delay: 100, trigger: 'visible' });
  });

  it('scaleIn from/origin、slideIn axis/offset', () => {
    expect(scaleIn({ from: 0.5, origin: [2, 3] })).toEqual({ property: 'scale', keyframes: [{ at: 0, value: 0.5 }, { at: 1, value: 1 }], origin: [2, 3], duration: 400, easing: 'ease-out' });
    expect(slideIn({ axis: 'y', offset: 50 })).toEqual({ property: 'translateY', keyframes: [{ at: 0, value: 50 }, { at: 1, value: 0 }], duration: 400, easing: 'ease-out' });
  });
});

describe('必填校验', () => {
  it('colorShift 缺 from/to → throw', () => {
    expect(() => colorShift({ to: '#fff' } as never)).toThrow();
    expect(() => colorShift({ from: '#000' } as never)).toThrow();
  });
  it('cameraTo 缺 from/to → throw', () => {
    expect(() => cameraTo({ to: [0, 0, 1, 1] } as never)).toThrow();
    expect(() => cameraTo({ from: [0, 0, 1, 1] } as never)).toThrow();
  });
});

describe('loop / stagger', () => {
  it('loop 叠加 iterations:infinite（+ direction）', () => {
    expect(loop(fadeIn())).toEqual({ ...fadeIn(), iterations: 'infinite' });
    expect(loop(fadeIn(), { iterations: 3, direction: 'alternate' })).toEqual({ ...fadeIn(), iterations: 3, direction: 'alternate' });
  });
  it('stagger 给 track 依次叠加 delay', () => {
    const out = stagger([fadeIn(), fadeIn(), fadeIn()], 100);
    expect(out.map(t => t.delay)).toEqual([0, 100, 200]);
    expect(stagger([fadeIn()], 100, 50)[0].delay).toBe(50);
  });
});
