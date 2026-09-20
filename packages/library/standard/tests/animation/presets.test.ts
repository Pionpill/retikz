import type { AnimationPresetOptions } from '@retikz/core';
import { AnimationTrackSchema, compileToScene, loop, stagger } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { grow, growUp, pulse, spin, flash, blink, wiggle } from '../../src';

describe('动画效果的轨道契约', () => {
  it('grow 的默认轨道', () => {
    expect(grow()).toEqual({
      property: 'scale',
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
      duration: 400,
      easing: 'ease-out',
    });
  });
  it('growUp 的默认轨道', () => {
    expect(growUp()).toEqual({
      property: 'scaleY',
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
      origin: 'bottom',
      duration: 500,
      easing: 'ease-out',
    });
  });
  it('pulse 的默认轨道', () => {
    expect(pulse()).toEqual({
      property: 'scale',
      keyframes: [
        { at: 0, value: 1 },
        { at: 0.5, value: 1.1 },
        { at: 1, value: 1 },
      ],
      iterations: 'infinite',
      duration: 1000,
      easing: 'ease-in-out',
    });
  });
  it('spin 的默认轨道', () => {
    expect(spin()).toEqual({
      property: 'rotate',
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 360 },
      ],
      iterations: 'infinite',
      duration: 1000,
      easing: 'linear',
    });
  });
  it('flash 的默认轨道', () => {
    expect(flash()).toEqual({
      property: 'opacity',
      keyframes: [
        { at: 0, value: 1 },
        { at: 0.5, value: 0 },
        { at: 1, value: 1 },
      ],
      iterations: 2,
      duration: 300,
      easing: 'ease-in-out',
    });
  });
  it('blink 的默认轨道', () => {
    expect(blink()).toEqual({
      property: 'opacity',
      keyframes: [
        { at: 0, value: 1 },
        { at: 0.5, value: 0 },
        { at: 1, value: 1 },
      ],
      iterations: 'infinite',
      duration: 800,
      easing: 'ease-in-out',
    });
  });
  it('wiggle 的默认轨道', () => {
    expect(wiggle()).toEqual({
      property: 'rotate',
      keyframes: [
        { at: 0, value: 0 },
        { at: 0.25, value: 5 },
        { at: 0.5, value: -5 },
        { at: 0.75, value: 5 },
        { at: 1, value: 0 },
      ],
      iterations: 3,
      duration: 400,
      easing: 'ease-in-out',
    });
  });
  it.each([grow, growUp, pulse, spin, flash, blink, wiggle])('%s 保留公共参数、可序列化并复用 Core 编译', factory => {
    const options: AnimationPresetOptions = { duration: 1234, delay: 0, easing: 'linear', trigger: 'manual' };
    const track = factory(options);
    expect(track).toMatchObject(options);
    expect(factory()).not.toHaveProperty('delay');
    expect(factory()).not.toHaveProperty('trigger');
    const decoded = AnimationTrackSchema.parse(JSON.parse(JSON.stringify(track)));
    expect(decoded).toEqual(track);
    const scene = compileToScene({
      type: 'scene',
      version: 1,
      children: [{ type: 'node', id: 'target', position: [0, 0], animations: [decoded] }],
    });
    expect(scene).toEqual(
      compileToScene({
        type: 'scene',
        version: 1,
        children: [{ type: 'node', id: 'target', position: [0, 0], animations: [track] }],
      }),
    );
    expect(options).toEqual({ duration: 1234, delay: 0, easing: 'linear', trigger: 'manual' });
  });
  it('效果参数决定峰值、支点与重复次数', () => {
    expect(grow({ origin: 'left' }).origin).toBe('left');
    expect(growUp({ origin: 'top' }).origin).toBe('top');
    expect(pulse({ peak: 1.4, origin: [2, 3] })).toMatchObject({
      origin: [2, 3],
      keyframes: [
        { at: 0, value: 1 },
        { at: 0.5, value: 1.4 },
        { at: 1, value: 1 },
      ],
    });
    expect(spin({ origin: 'bottom' }).origin).toBe('bottom');
    expect(flash({ dim: 0.3, iterations: 4 })).toMatchObject({
      iterations: 4,
      keyframes: [
        { at: 0, value: 1 },
        { at: 0.5, value: 0.3 },
        { at: 1, value: 1 },
      ],
    });
    expect(blink({ dim: 0.2, iterations: 5 })).toMatchObject({
      iterations: 5,
      keyframes: [
        { at: 0, value: 1 },
        { at: 0.5, value: 0.2 },
        { at: 1, value: 1 },
      ],
    });
    expect(wiggle({ angle: 10, origin: 'bottom', iterations: 2 })).toMatchObject({
      origin: 'bottom',
      iterations: 2,
      keyframes: [
        { at: 0, value: 0 },
        { at: 0.25, value: 10 },
        { at: 0.5, value: -10 },
        { at: 0.75, value: 10 },
        { at: 1, value: 0 },
      ],
    });
  });
  it('Core 编排接收效果轨道且不修改原始轨道', () => {
    const track = wiggle({ delay: 25 });
    const before = structuredClone(track);
    expect(loop(track, { iterations: 2, direction: 'alternate' })).toEqual({
      ...track,
      iterations: 2,
      direction: 'alternate',
    });
    expect(stagger([track, track], 100, 50)).toEqual([
      { ...track, delay: 50 },
      { ...track, delay: 150 },
    ]);
    expect(track).toEqual(before);
  });
});
