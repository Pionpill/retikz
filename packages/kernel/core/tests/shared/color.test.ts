import { describe, expect, it } from 'vitest';

import * as core from '../../src';

type CompositeOpaqueColor = (foreground: string, backdrop: string, weight: number) => `#${string}`;

/** 读取待实现的公开颜色预合成原子，并让缺失导出表现为明确断言失败 */
const compositor = (): CompositeOpaqueColor => {
  const candidate = (core as Record<string, unknown>).compositeOpaqueColor;
  expect(candidate).toEqual(expect.any(Function));
  return candidate as CompositeOpaqueColor;
};

describe('opaque static CSS color composition', () => {
  it('composites one foreground over fixed white and black backdrops into lowercase hex', () => {
    const compositeOpaqueColor = compositor();

    expect(compositeOpaqueColor('#336699', '#ffffff', 0.6)).toBe('#85a3c2');
    expect(compositeOpaqueColor('#336699', '#000000', 0.4)).toBe('#14293d');
  });

  it('multiplies foreground alpha by the requested weight before source-over composition', () => {
    const compositeOpaqueColor = compositor();

    expect(compositeOpaqueColor('rgb(255 0 0 / 50%)', '#ffffff', 0.4)).toBe('#ffcccc');
  });

  it('accepts the static HSL syntax used by Core theme palettes', () => {
    const compositeOpaqueColor = compositor();

    expect(compositeOpaqueColor('hsl(120 100% 50%)', '#000000', 0.5)).toBe('#008000');
  });

  it.each([
    ['dynamic foreground', 'currentColor', '#ffffff', 0.4],
    ['translucent backdrop', '#336699', 'rgb(255 255 255 / 50%)', 0.4],
    ['negative weight', '#336699', '#ffffff', -0.1],
    ['weight above one', '#336699', '#ffffff', 1.1],
    ['non-finite weight', '#336699', '#ffffff', Number.NaN],
  ])('fails loudly for %s', (_name, foreground, backdrop, weight) => {
    expect(() => compositor()(foreground, backdrop, weight)).toThrow(/compositeOpaqueColor/i);
  });
});
