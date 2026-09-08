import type { FC } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import CustomChannelDemo from '../../src/modules/docs/contents/viz/plot/channel/custom-channel/custom-channel.demo';
import CustomCoordinateDemo from '../../src/modules/docs/contents/viz/plot/coordinate/custom-coordinate/coordinate-custom-bridge.demo';
import CustomMarkDemo from '../../src/modules/docs/contents/viz/plot/mark/custom-mark/mark-custom.demo';
import CustomScaleDemo from '../../src/modules/docs/contents/viz/plot/scale/custom-scale/scale-custom.demo';

const renderWithValues = (
  Component: FC,
  canonicalValues: Readonly<Record<string, string | number | boolean>>,
  values: Readonly<Record<string, string | number | boolean>>,
) =>
  renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues,
        values: { ...canonicalValues, ...values },
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <Component />
    </PreviewControlStateContext.Provider>,
  );

/** 默认输出尺寸始终等于内容视框 */
const expectNaturalSize = (markup: string): void => {
  const root = markup.match(/^<svg\b[^>]*>/)?.[0] ?? '';
  const bounds = root
    .match(/viewBox="([^"]+)"/)?.[1]
    .split(' ')
    .map(Number);
  expect(bounds).toBeDefined();
  expect(Number(root.match(/\swidth="([^"]+)"/)?.[1])).toBe(bounds?.[2]);
  expect(Number(root.match(/\sheight="([^"]+)"/)?.[1])).toBe(bounds?.[3]);
};

describe('custom extension demo controls', () => {
  it('切换自定义通道的字段绑定与常量绑定会改变输出', () => {
    const canonical = {
      'custom-channel-binding-mode': 'field',
      'custom-channel-constant-intensity': 0.65,
    };
    const fieldMarkup = renderWithValues(CustomChannelDemo, canonical, {});
    const constantMarkup = renderWithValues(CustomChannelDemo, canonical, {
      'custom-channel-binding-mode': 'constant',
    });

    expect(fieldMarkup).not.toBe(constantMarkup);
    expect(fieldMarkup).toContain('<linearGradient');
    expect(constantMarkup).not.toContain('<linearGradient');
    expectNaturalSize(fieldMarkup);
  });

  it('调整自定义坐标系的拱高会在固定相机下改变投影结果', () => {
    const canonical = { 'custom-coordinate-arch-height': 60 };
    const flatMarkup = renderWithValues(CustomCoordinateDemo, canonical, { 'custom-coordinate-arch-height': 0 });
    const archedMarkup = renderWithValues(CustomCoordinateDemo, canonical, { 'custom-coordinate-arch-height': 100 });

    expect(flatMarkup).not.toBe(archedMarkup);
    expect(flatMarkup).toContain('viewBox="-30 -80 480 340"');
    expect(archedMarkup).toContain('viewBox="-30 -80 480 340"');
    expectNaturalSize(flatMarkup);
  });

  it('调整自定义图元的最小尺寸会改变输出', () => {
    const canonical = { 'custom-mark-size': 16, 'custom-mark-fill': '#f59e0b' };
    const minimumMarkup = renderWithValues(CustomMarkDemo, canonical, { 'custom-mark-size': 10 });
    const maximumMarkup = renderWithValues(CustomMarkDemo, canonical, { 'custom-mark-size': 28 });

    expect(minimumMarkup).not.toBe(maximumMarkup);
    expect(minimumMarkup).toContain('viewBox="-15 -15 450 290"');
    expect(maximumMarkup).toContain('viewBox="-15 -15 450 290"');
    expectNaturalSize(minimumMarkup);
  });

  it('调整自定义图元的填充颜色会改变输出', () => {
    const canonical = { 'custom-mark-size': 16, 'custom-mark-fill': '#f59e0b' };

    expect(renderWithValues(CustomMarkDemo, canonical, {})).not.toBe(
      renderWithValues(CustomMarkDemo, canonical, { 'custom-mark-fill': '#0f766e' }),
    );
  });

  it('调整自定义位置比例尺的指数会改变坐标分布', () => {
    const canonical = { 'custom-scale-exponent': 1.8 };
    const expandedMarkup = renderWithValues(CustomScaleDemo, canonical, { 'custom-scale-exponent': 0.6 });
    const compactMarkup = renderWithValues(CustomScaleDemo, canonical, { 'custom-scale-exponent': 3 });

    expect(expandedMarkup).not.toBe(compactMarkup);
    expectNaturalSize(expandedMarkup);
  });
});
