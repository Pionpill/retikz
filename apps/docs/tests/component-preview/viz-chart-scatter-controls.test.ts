import type { ReactElement, ReactNode } from 'react';

import { ChartFacet, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterMark } from '@retikz/chart-react/point';
import { PlotAxis, PlotTransform } from '@retikz/plot-react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { Children, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewSourceConfig,
} from '../../src/modules/docs/preview';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewControlContract as basicZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.controls';
import {
  countryScatterData,
  WORLD_BANK_SCATTER_YEAR,
} from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.data';
import { previewControlContract as basicEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.en.controls';
import { previewSource as basicEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.en.demo';
import { previewSource as basicZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.zh.demo';
import {
  fertilityWorkData,
  WORLD_BANK_FERTILITY_WORK_YEAR,
} from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.data';
import { previewControlContract as incomeLifeExpectancyZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.controls';
import {
  countryScatterData as incomeLifeExpectancyData,
  GAPMINDER_SCATTER_YEAR,
} from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.data';
import { previewControlContract as incomeLifeExpectancyEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.en.controls';
import { previewSource as incomeLifeExpectancyEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.en.demo';
import { previewSource as incomeLifeExpectancyZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.zh.demo';
import { previewSource as penguinFacetEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.en.demo';
import { previewSource as penguinFacetZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.zh.demo';

const comparable = (contract: PreviewControlContract) => ({
  controls: JSON.parse(
    JSON.stringify(contract.controls, (key, value) =>
      ['title', 'label', 'help', 'customLabel'].includes(key) ? undefined : value,
    ),
  ) as PreviewControlsDefinition,
  canonicalValues: contract.canonicalValues,
  relatedApis: contract.relatedApis,
});

const expectCompletePanel = (contract: PreviewControlContract): void => {
  expect(contract.controls.presentation).toBe('panel');
  if (contract.controls.presentation !== 'panel') return;
  expect(contract.controls.sections[0]?.controls[0]?.kind).toBe('table');
  expect(Object.keys(contract.canonicalValues).sort()).toEqual(
    getPreviewControlFields(contract.controls)
      .map(control => control.id)
      .sort(),
  );
  expect(contract.relatedApis.length).toBeGreaterThan(0);
  expect(
    contract.relatedApis.every(api => /^(Plot[A-Z]\w*|Plot|PointMark|ScatterChart|ScatterMark)\./u.test(api)),
  ).toBe(true);
};

const canonicalChartSize = (source: PreviewSourceConfig): { width?: number; height?: number } => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ width?: number; height?: number }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }

  return { width: chart.props.width, height: chart.props.height };
};

const canonicalScatterProps = (source: PreviewSourceConfig): Record<string, unknown> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<Record<string, unknown>>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }

  return chart.props;
};

const canonicalScatterMarkProps = (source: PreviewSourceConfig): Record<string, unknown> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }
  const mark = Children.toArray(chart.props.children).find(
    child => isValidElement(child) && child.type === ScatterMark,
  );
  if (!isValidElement<Record<string, unknown>>(mark)) {
    throw new Error('Scatter preview must provide a direct ScatterMark child');
  }

  return mark.props;
};

const canonicalScatterChildren = (source: PreviewSourceConfig): Array<ReactElement<Record<string, unknown>>> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }

  return Children.toArray(chart.props.children).filter(isValidElement<Record<string, unknown>>);
};

const canonicalPresentation = (source: PreviewSourceConfig): Record<'title' | 'subtitle' | 'source', ReactNode> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }
  const children = Children.toArray(chart.props.children);
  const textOf = (marker: typeof ChartTitle | typeof ChartSubtitle | typeof ChartSource): ReactNode => {
    const child = children.find(candidate => isValidElement(candidate) && candidate.type === marker);
    if (!isValidElement<{ children?: ReactNode }>(child)) throw new Error('Chart preview is missing presentation text');
    return child.props.children;
  };
  return {
    title: textOf(ChartTitle),
    subtitle: textOf(ChartSubtitle),
    source: textOf(ChartSource),
  };
};

describe('Viz Chart scatter controls', () => {
  it('生育率与女性劳动参与率示例使用完整的 World Bank 2022 有效快照', () => {
    expect(WORLD_BANK_FERTILITY_WORK_YEAR).toBe(2022);
    expect(fertilityWorkData).toHaveLength(186);
    expect(new Set(fertilityWorkData.map(datum => datum.incomeGroup))).toEqual(new Set(['HIC', 'UMC', 'LMC', 'LIC']));
    expect(
      fertilityWorkData.every(
        datum =>
          datum.country.length > 0 &&
          Number.isFinite(datum.fertilityRate) &&
          datum.fertilityRate > 0 &&
          Number.isFinite(datum.femaleLaborParticipation) &&
          datum.femaleLaborParticipation >= 0 &&
          datum.femaleLaborParticipation <= 100,
      ),
    ).toBe(true);
  });
  it('保持各组 controls 的双语结构与 canonical 状态一致', () => {
    for (const [zh, en] of [
      [basicZh, basicEn],
      [incomeLifeExpectancyZh, incomeLifeExpectancyEn],
    ] as const) {
      expect(comparable(zh)).toEqual(comparable(en));
      expectCompletePanel(zh);
      expectCompletePanel(en);
    }
  });

  it('基础 Scatter 只暴露位置不变量与清晰可见的外观变量', () => {
    expect(basicZh.canonicalValues).toEqual({
      pointSize: 10,
      pointOpacity: 0.82,
    });
    expect(JSON.stringify(basicZh.controls)).not.toContain('gridVisible');
    expect(JSON.stringify(basicZh.controls)).not.toContain('colorByGroup');
  });

  it('基础 Scatter 使用世界银行 2023 年的完整可连接国家截面', () => {
    expect(WORLD_BANK_SCATTER_YEAR).toBe(2023);
    expect(countryScatterData).toHaveLength(181);
    expect(new Set(countryScatterData.map(datum => datum.code)).size).toBe(181);
    expect(
      countryScatterData.every(
        datum =>
          datum.urbanPopulationShare >= 0 &&
          datum.urbanPopulationShare <= 100 &&
          datum.internetUseShare >= 0 &&
          datum.internetUseShare <= 100 &&
          Number(datum.urbanPopulationShare.toFixed(1)) === datum.urbanPopulationShare &&
          Number(datum.internetUseShare.toFixed(1)) === datum.internetUseShare,
      ),
    ).toBe(true);
  });

  it('基础 Scatter 将两个比例字段与受控 mark 常量交给 typed Chart', () => {
    for (const source of [basicZhPreviewSource, basicEnPreviewSource]) {
      expect(canonicalScatterProps(source)).toMatchObject({
        encodings: {
          x: 'urbanPopulationShare',
          y: 'internetUseShare',
        },
      });
      expect(canonicalScatterMarkProps(source)).toMatchObject({
        override: true,
        properties: { size: 10, opacity: 0.82 },
      });
    }
    expect(basicZh.relatedApis).not.toContain('Legend.channel');
    expect(basicEn.relatedApis).not.toContain('Legend.channel');
  });

  it('收入与寿命示例保留 Gapminder 2007 的完整国家截面', () => {
    expect(GAPMINDER_SCATTER_YEAR).toBe(2007);
    expect(incomeLifeExpectancyData).toHaveLength(142);
    expect(new Set(incomeLifeExpectancyData.map(datum => datum.continent))).toEqual(
      new Set(['Africa', 'Americas', 'Asia', 'Europe', 'Oceania']),
    );
    expect(incomeLifeExpectancyData.every(datum => datum.gdpPerCapita > 0)).toBe(true);
  });

  it('收入与寿命示例通过 typed color encoding 绑定大洲', () => {
    for (const source of [incomeLifeExpectancyZhPreviewSource, incomeLifeExpectancyEnPreviewSource]) {
      expect(canonicalScatterProps(source)).toMatchObject({
        encodings: {
          x: 'gdpPerCapita',
          y: 'lifeExpectancy',
          color: 'continent',
        },
      });
      expect(canonicalScatterMarkProps(source)).toMatchObject({
        override: true,
        properties: { size: 10, opacity: 0.82 },
      });
    }
  });

  it('收入与寿命示例保留 recipe 的 color encoding 语义', () => {
    expect(incomeLifeExpectancyZh.relatedApis).not.toContain('Legend.channel');
    expect(incomeLifeExpectancyEn.relatedApis).not.toContain('Legend.channel');
  });

  it('企鹅示例按 owner 声明 Chart 分面、Plot 抖动与坐标轴', () => {
    for (const source of [penguinFacetZhPreviewSource, penguinFacetEnPreviewSource]) {
      expect(canonicalScatterMarkProps(source)).toMatchObject({ override: true });
      expect(canonicalScatterProps(source)).not.toHaveProperty('plotExtension');

      const children = canonicalScatterChildren(source);
      const facet = children.find(child => child.type === ChartFacet);
      const transform = children.find(child => child.type === PlotTransform);
      const axes = children.filter(child => child.type === PlotAxis);

      expect(facet?.props).toMatchObject({
        id: 'species',
        column: { field: 'species', order: ['Adelie', 'Chinstrap', 'Gentoo'] },
        header: { column: true },
        resolve: { scale: { x: 'shared', y: 'shared' } },
        spacing: { panelGap: 20 },
      });
      expect(transform?.props).toMatchObject({
        kind: 'jitter',
        axis: 'x',
        xField: 'billLengthMm',
        amount: 0.35,
        seed: 42,
      });
      expect(axes.map(axis => axis.props)).toMatchObject([
        { dimension: 'x', grid: true },
        { dimension: 'y', grid: true },
      ]);
    }
  });

  it('企鹅示例源码直接传数据并省略大型 Plot extension 配置', () => {
    for (const locale of ['zh', 'en']) {
      const source = readFileSync(
        resolve(`src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.${locale}.demo.tsx`),
        'utf8',
      );

      expect(source).toContain('data={penguinScatterData}');
      expect(source).toContain('<ChartFacet');
      expect(source).toContain('<PlotTransform');
      expect(source.match(/<PlotAxis\b/gu)).toHaveLength(2);
      expect(source).not.toContain('dataModel');
      expect(source).not.toContain('plotExtension');
    }
  });

  it('区分预览宿主尺寸与 Source layout', () => {
    for (const source of [
      basicZhPreviewSource,
      basicEnPreviewSource,
      incomeLifeExpectancyZhPreviewSource,
      incomeLifeExpectancyEnPreviewSource,
    ]) {
      expect(canonicalChartSize(source)).toEqual({ width: 800, height: 400 });
    }
  });

  it('双语 demo 在 Chart-native metadata 中说明字段单位与数据来源', () => {
    expect(canonicalPresentation(basicZhPreviewSource)).toMatchObject({
      title: '城市化程度与互联网使用率',
      subtitle: expect.stringContaining('人口占比（%）'),
      source: expect.stringContaining('世界银行'),
    });
    expect(canonicalPresentation(basicEnPreviewSource)).toMatchObject({
      title: 'Urbanization and Internet use',
      subtitle: expect.stringContaining('share of population (%)'),
      source: expect.stringContaining('World Bank'),
    });
  });
});
