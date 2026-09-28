import { StripChart, StripEncodings, StripProperties } from '@retikz/chart-react/point';
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
import { previewSource as stripDistributionSource } from '../../src/modules/docs/contents/viz/chart/points/strip/strip-distribution';
import StripEncodingsDemo from '../../src/modules/docs/contents/viz/chart/points/strip/strip-encodings';
import { createPreviewControlContract } from '../../src/modules/docs/contents/viz/chart/points/strip/strip-encodings.controls';
import StripMarksDemo from '../../src/modules/docs/contents/viz/chart/points/strip/strip-marks';
import { createPreviewControlContract as createStripMarksControlContract } from '../../src/modules/docs/contents/viz/chart/points/strip/strip-marks.controls';
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

const renderPolarSample = (scale: 'point' | 'band', role: 'x' | 'y', values: PreviewControlValues) => {
  const category = {
    field: 'site',
    scale: {
      operation:
        scale === 'band'
          ? { type: 'band', name: 'site', paddingInner: 0.1, paddingOuter: 0.05 }
          : { type: 'point', name: 'site' },
    },
  } as const;
  const value = { field: 'yield', scale: { operation: { type: 'linear', name: 'yield' } } } as const;
  return renderToStaticMarkup(
    <StripChart rows={stripVegaBarleyData} coordinate={{ type: 'polar2D' }}>
      <StripEncodings {...(role === 'x' ? { x: category, y: value } : { x: value, y: category })} />
      <StripProperties
        jitter={{
          span: { kind: 'ratio', value: Number(values[STRIP_BASIC_CONTROL_IDS.jitterSpan]) },
          seed: Number(values[STRIP_BASIC_CONTROL_IDS.seed]),
        }}
        size={Number(values[STRIP_BASIC_CONTROL_IDS.pointSize])}
      />
    </StripChart>,
  );
};

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
  it('扩展散布示例默认使用极坐标并能完整渲染', () => {
    const chart = stripDistributionSource.canonicalRender('zh');
    expect(isValidElement(chart)).toBe(true);
    if (isValidElement<{ coordinate?: { type: string } }>(chart)) {
      expect(chart.props.coordinate).toEqual({ type: 'polar2D' });
    }
    const markup = renderToStaticMarkup(chart);
    expect(markup).toContain('<svg');
    expect(markup).not.toMatch(/NaN|Infinity/);
  });

  it('条带图元固定替换，仅用形状与大小控件改变图形', () => {
    const zh = createStripMarksControlContract('zh');
    const en = createStripMarksControlContract('en');
    expect(getPreviewControlFields(zh.controls).map(control => control.id)).toEqual(['shape', 'size']);
    expect(getPreviewControlFields(en.controls).map(control => control.id)).toEqual(['shape', 'size']);
    expect(zh.canonicalValues).toEqual({ shape: 'diamond', size: 4 });
    expect(en.canonicalValues).toEqual(zh.canonicalValues);

    const canonical = zh.canonicalValues as PreviewControlValues;
    const baseline = renderDemo(StripMarksDemo, canonical, canonical);
    expect(renderDemo(StripMarksDemo, canonical, { ...canonical, shape: 'circle' })).not.toBe(baseline);
    expect(renderDemo(StripMarksDemo, canonical, { ...canonical, size: 8 })).not.toBe(baseline);
  });

  it('条带映射中每个可切换控件都改变实际图形', () => {
    const contract = createPreviewControlContract();
    const canonical = contract.canonicalValues as PreviewControlValues;
    const baseline = renderDemo(StripEncodingsDemo, canonical, canonical);

    for (const field of getPreviewControlFields(contract.controls)) {
      if (field.kind !== 'select') throw new Error(`Unexpected control kind: ${field.kind}`);
      const alternate = field.options.find(option => option.value !== field.defaultValue)?.value;
      if (alternate === undefined) throw new Error(`Missing alternate value: ${field.id}`);
      const changed = renderDemo(StripEncodingsDemo, canonical, { ...canonical, [field.id]: alternate });
      expect(changed, field.id).not.toBe(baseline);
    }
  });

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
      expect(markup).not.toContain('Vega Datasets');
      expect(markup).not.toContain('Palmer Penguins');
      expect(source.datasetImports['chart.data']).toEqual({
        name: 'stripVegaBarleyData',
        from: './strip-vega-barley.data',
      });
    }
  });

  it('中英文属性 controls 保持相同结构并覆盖散布与点外观', () => {
    const expectedIds = Object.values(STRIP_BASIC_CONTROL_IDS).sort();
    for (const contract of [zhContract, enContract]) {
      expect(
        getPreviewControlFields(contract.controls)
          .map(control => control.id)
          .sort(),
      ).toEqual(expectedIds);
      expect(contract.canonicalValues).toEqual({
        [STRIP_BASIC_CONTROL_IDS.coordinateSystem]: 'cartesian2D',
        [STRIP_BASIC_CONTROL_IDS.jitterSpan]: 0.3,
        [STRIP_BASIC_CONTROL_IDS.distribution]: 'uniform',
        [STRIP_BASIC_CONTROL_IDS.normalSigma]: 0.5,
        [STRIP_BASIC_CONTROL_IDS.seed]: 0,
        [STRIP_BASIC_CONTROL_IDS.pointSize]: 5,
        [STRIP_BASIC_CONTROL_IDS.pointOpacity]: 0.75,
      });
      expect(contract.relatedApis).toEqual([
        'StripChart.coordinate',
        'StripProperties.opacity',
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
      const polarAngle = renderPolarSample('point', 'x', {
        ...canonical,
        [STRIP_BASIC_CONTROL_IDS.jitterSpan]: 1,
        [STRIP_BASIC_CONTROL_IDS.seed]: 17,
        [STRIP_BASIC_CONTROL_IDS.pointSize]: 10,
      });
      const polarRadius = renderPolarSample('band', 'y', {
        ...canonical,
      });

      for (const markup of [cartesian, polarAngle, polarRadius]) {
        expect(markup).toContain('<svg');
        expect(markup).toContain('<ellipse');
        expect(markup).not.toMatch(/NaN|Infinity/);
      }
    }
  });

  it('极坐标下 Point 与 Band scale 保持相同的类别标签中心', () => {
    for (const contract of [zhContract, enContract]) {
      const canonical = contract.canonicalValues as PreviewControlValues;
      const polarPoint = renderPolarSample('point', 'x', canonical);
      const polarBand = renderPolarSample('band', 'x', canonical);
      const [pointX, pointY] = textVisualCenterOf(polarPoint, 'Waseca');
      const [bandX, bandY] = textVisualCenterOf(polarBand, 'Waseca');

      expect(bandX).toBeCloseTo(pointX, 6);
      expect(bandY).toBeCloseTo(pointY, 6);
    }
  });
});
