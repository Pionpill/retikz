import { StripChart } from '@retikz/chart-react/point';
import { isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '../../src/modules/docs/components/component-preview';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import {
  previewControlContract as zhContract,
  STRIP_BASIC_CONTROL_IDS,
} from '../../src/modules/docs/contents/viz/chart/points/strip/strip-basic.controls';
import { previewControlContract as enContract } from '../../src/modules/docs/contents/viz/chart/points/strip/strip-basic.en.controls';
import EnDemo, {
  previewSource as enSource,
} from '../../src/modules/docs/contents/viz/chart/points/strip/strip-basic.en.demo';
import ZhDemo, {
  previewSource as zhSource,
} from '../../src/modules/docs/contents/viz/chart/points/strip/strip-basic.zh.demo';
import { stripPalmerPenguinsData } from '../../src/modules/docs/contents/viz/chart/points/strip/strip-palmer-penguins.data';
import { stripVegaBarleyData } from '../../src/modules/docs/contents/viz/chart/points/strip/strip-vega-barley.data';

const renderDemo = (Demo: typeof ZhDemo, canonicalValues: PreviewControlValues, values: PreviewControlValues) =>
  renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues,
        values,
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <Demo />
    </PreviewControlStateContext.Provider>,
  );

const textVisualCenterOf = (markup: string, text: string): [number, number] => {
  const textElement = markup.match(/<text\b[^>]*>[\s\S]*?<\/text>/g)?.find(element => element.includes(`>${text}<`));
  expect(textElement).toBeDefined();
  const x = textElement?.match(/\bx="([^"]+)"/)?.[1];
  const y = textElement?.match(/\by="([^"]+)"/)?.[1];
  const fontSize = textElement?.match(/\bfont-size="([^"]+)"/)?.[1];
  const anchor = textElement?.match(/\btext-anchor="([^"]+)"/)?.[1];
  expect(x).toBeDefined();
  expect(y).toBeDefined();
  expect(fontSize).toBeDefined();
  expect(anchor).toBeDefined();
  const width = text.length * Number(fontSize) * 0.6;
  const centerX = anchor === 'start' ? Number(x) + width / 2 : anchor === 'end' ? Number(x) - width / 2 : Number(x);
  return [centerX, Number(y)];
};

describe('Strip Chart controls', () => {
  it('基础数据保留 90 条 Palmer Penguins 观测', () => {
    expect(stripPalmerPenguinsData).toHaveLength(90);
    expect(Object.keys(stripPalmerPenguinsData[0] ?? {}).sort()).toEqual(['flipperLengthMm', 'species']);
  });

  it('进阶示例使用独立且按六个地点均衡分组的 120 条 Vega barley 观测', () => {
    expect(stripVegaBarleyData).toHaveLength(120);
    expect(Object.keys(stripVegaBarleyData[0] ?? {}).sort()).toEqual(['site', 'variety', 'year', 'yield']);
    expect(
      Object.fromEntries(
        Object.entries(Object.groupBy(stripVegaBarleyData, datum => datum.site)).map(([site, rows]) => [
          site,
          rows.length,
        ]),
      ),
    ).toEqual({
      Crookston: 20,
      Duluth: 20,
      'Grand Rapids': 20,
      Morris: 20,
      'University Farm': 20,
      Waseca: 20,
    });

    for (const [Demo, contract, source] of [
      [ZhDemo, zhContract, zhSource],
      [EnDemo, enContract, enSource],
    ] as const) {
      const canonical = contract.canonicalValues as PreviewControlValues;
      const markup = renderDemo(Demo, canonical, canonical);

      expect(markup.match(/<ellipse/g)).toHaveLength(120);
      expect(markup).toContain('Vega Datasets');
      expect(markup).not.toContain('Palmer Penguins');
      expect(source.datasetImports['chart.data']).toEqual({
        name: 'stripVegaBarleyData',
        from: './strip-vega-barley.data',
      });
    }
  });

  it('中英文 controls 保持相同结构并覆盖离散角色、scale、坐标、宽度、分布、种子和点尺寸', () => {
    const expectedIds = Object.values(STRIP_BASIC_CONTROL_IDS);
    for (const contract of [zhContract, enContract]) {
      expect(getPreviewControlFields(contract.controls).map(control => control.id)).toEqual(expectedIds);
      expect(contract.canonicalValues).toEqual({
        [STRIP_BASIC_CONTROL_IDS.discreteRole]: 'x',
        [STRIP_BASIC_CONTROL_IDS.discreteScale]: 'point',
        [STRIP_BASIC_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
        [STRIP_BASIC_CONTROL_IDS.jitterSpan]: 0.3,
        [STRIP_BASIC_CONTROL_IDS.distribution]: 'uniform',
        [STRIP_BASIC_CONTROL_IDS.normalSigma]: 0.5,
        [STRIP_BASIC_CONTROL_IDS.seed]: 0,
        [STRIP_BASIC_CONTROL_IDS.pointSize]: 5,
      });
      expect(contract.relatedApis).toEqual([
        'StripEncodings.x',
        'StripEncodings.y',
        'StripChart.coordinate',
        'StripProperties.jitter',
        'StripProperties.size',
      ]);
    }
  });

  it('normal 分布下显示 sigma 并改变 Strip 的确定性位置', () => {
    for (const [Demo, contract] of [
      [ZhDemo, zhContract],
      [EnDemo, enContract],
    ] as const) {
      const canonical = contract.canonicalValues as PreviewControlValues;
      const normalValues = {
        ...canonical,
        [STRIP_BASIC_CONTROL_IDS.distribution]: 'normal',
        [STRIP_BASIC_CONTROL_IDS.normalSigma]: 1,
      };
      const uniform = renderDemo(Demo, canonical, canonical);
      const normal = renderDemo(Demo, canonical, normalValues);

      expect(getPreviewControlFields(contract.controls).map(control => control.id)).toContain(
        STRIP_BASIC_CONTROL_IDS.normalSigma,
      );
      expect(normal).not.toBe(uniform);
      expect(normal).not.toMatch(/NaN|Infinity/);
    }
  });

  it('canonical source 使用精确 Strip Chart，并在笛卡尔与两种极坐标角色下稳定渲染', () => {
    for (const source of [zhSource, enSource]) {
      const chart = source.canonicalRender?.();
      expect(isValidElement(chart)).toBe(true);
      if (isValidElement(chart)) expect(chart.type).toBe(StripChart);
    }

    for (const [Demo, contract] of [
      [ZhDemo, zhContract],
      [EnDemo, enContract],
    ] as const) {
      const canonical = contract.canonicalValues as PreviewControlValues;
      const cartesian = renderDemo(Demo, canonical, canonical);
      const polarAngle = renderDemo(Demo, canonical, {
        ...canonical,
        [STRIP_BASIC_CONTROL_IDS.coordinateSystem]: 'polar2D',
        [STRIP_BASIC_CONTROL_IDS.discreteRole]: 'x',
        [STRIP_BASIC_CONTROL_IDS.jitterSpan]: 1,
        [STRIP_BASIC_CONTROL_IDS.seed]: 17,
        [STRIP_BASIC_CONTROL_IDS.pointSize]: 10,
      });
      const polarRadius = renderDemo(Demo, canonical, {
        ...canonical,
        [STRIP_BASIC_CONTROL_IDS.coordinateSystem]: 'polar2D',
        [STRIP_BASIC_CONTROL_IDS.discreteRole]: 'y',
        [STRIP_BASIC_CONTROL_IDS.discreteScale]: 'band',
      });

      for (const markup of [cartesian, polarAngle, polarRadius]) {
        expect(markup).toContain('<svg');
        expect(markup).toContain('<ellipse');
        expect(markup).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it('极坐标下 Point 与 Band scale 保持相同的类别标签中心', () => {
    for (const [Demo, contract] of [
      [ZhDemo, zhContract],
      [EnDemo, enContract],
    ] as const) {
      const canonical = contract.canonicalValues as PreviewControlValues;
      const polarPoint = renderDemo(Demo, canonical, {
        ...canonical,
        [STRIP_BASIC_CONTROL_IDS.coordinateSystem]: 'polar2D',
        [STRIP_BASIC_CONTROL_IDS.discreteScale]: 'point',
      });
      const polarBand = renderDemo(Demo, canonical, {
        ...canonical,
        [STRIP_BASIC_CONTROL_IDS.coordinateSystem]: 'polar2D',
        [STRIP_BASIC_CONTROL_IDS.discreteScale]: 'band',
      });
      const [pointX, pointY] = textVisualCenterOf(polarPoint, 'Waseca');
      const [bandX, bandY] = textVisualCenterOf(polarBand, 'Waseca');

      expect(bandX).toBeCloseTo(pointX, 6);
      expect(bandY).toBeCloseTo(pointY, 6);
    }
  });
});
