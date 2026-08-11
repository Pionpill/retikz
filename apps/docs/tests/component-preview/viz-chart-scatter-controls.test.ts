import type { ReactNode } from 'react';

import { Children, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewSourceConfig,
} from '../../src/modules/docs/preview';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewControlContract as bubbleZh } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.controls';
import { previewControlContract as bubbleEn } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.controls';
import { previewSource as bubbleEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.demo';
import { previewSource as bubbleZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.zh.demo';
import { previewControlContract as basicZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.controls';
import {
  countryScatterData,
  WORLD_BANK_SCATTER_YEAR,
} from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.data';
import { previewControlContract as basicEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.en.controls';
import { previewSource as basicEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.en.demo';
import { previewSource as basicZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-basic.zh.demo';
import { previewControlContract as incomeLifeExpectancyZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.controls';
import {
  countryScatterData as incomeLifeExpectancyData,
  GAPMINDER_SCATTER_YEAR,
} from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.data';
import { previewControlContract as incomeLifeExpectancyEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.en.controls';
import { previewSource as incomeLifeExpectancyEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.en.demo';
import { previewSource as incomeLifeExpectancyZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-income-life-expectancy.zh.demo';

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
  expect(contract.relatedApis.every(api => /^(Plot|PointMark|Axis|Legend)\./u.test(api))).toBe(true);
};

const canonicalChartSize = (source: PreviewSourceConfig): { width?: number; height?: number } => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ width?: number; height?: number }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }

  return { width: chart.props.width, height: chart.props.height };
};

const canonicalAxisTitles = (source: PreviewSourceConfig): Array<string | undefined> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }

  return Children.toArray(chart.props.children).flatMap(child =>
    isValidElement<{ dimension?: string; title?: string }>(child) && child.props.dimension !== undefined
      ? [child.props.title]
      : [],
  );
};

const canonicalAxisGrids = (source: PreviewSourceConfig): Array<unknown> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }

  return Children.toArray(chart.props.children).flatMap(child =>
    isValidElement<{ dimension?: string; grid?: unknown }>(child) && child.props.dimension !== undefined
      ? [child.props.grid]
      : [],
  );
};

const canonicalAxisScales = (source: PreviewSourceConfig): Array<unknown> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }

  return Children.toArray(chart.props.children).flatMap(child =>
    isValidElement<{ dimension?: string; scale?: unknown }>(child) && child.props.dimension !== undefined
      ? [child.props.scale]
      : [],
  );
};

const canonicalLegends = (
  source: PreviewSourceConfig,
): Array<{ channel?: string; title?: string; position?: string }> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }

  return Children.toArray(chart.props.children).flatMap(child =>
    isValidElement<{ channel?: string; title?: string; position?: string }>(child) && child.props.channel !== undefined
      ? [{ channel: child.props.channel, title: child.props.title, position: child.props.position }]
      : [],
  );
};

describe('Viz Chart scatter controls', () => {
  it('保持各组 controls 的双语结构与 canonical 状态一致', () => {
    for (const [zh, en] of [
      [basicZh, basicEn],
      [incomeLifeExpectancyZh, incomeLifeExpectancyEn],
      [bubbleZh, bubbleEn],
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

  it('基础 Scatter 不显式覆盖 Axis grid 主题规则', () => {
    expect(canonicalAxisGrids(basicZhPreviewSource)).toEqual([undefined, undefined]);
    expect(canonicalAxisGrids(basicEnPreviewSource)).toEqual([undefined, undefined]);
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

  it('基础 Scatter 使用默认线性比例尺且不添加颜色图例', () => {
    expect(canonicalAxisScales(basicZhPreviewSource)).toEqual([undefined, undefined]);
    expect(canonicalAxisScales(basicEnPreviewSource)).toEqual([undefined, undefined]);
    expect(canonicalLegends(basicZhPreviewSource)).toEqual([]);
    expect(canonicalLegends(basicEnPreviewSource)).toEqual([]);
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

  it('收入与寿命示例的人均 GDP 使用对数比例尺', () => {
    expect(canonicalAxisScales(incomeLifeExpectancyZhPreviewSource)).toEqual(['log', undefined]);
    expect(canonicalAxisScales(incomeLifeExpectancyEnPreviewSource)).toEqual(['log', undefined]);
  });

  it('收入与寿命示例使用本地化的大洲颜色图例', () => {
    expect(canonicalLegends(incomeLifeExpectancyZhPreviewSource)).toEqual([
      { channel: 'color', title: '大洲', position: 'right' },
    ]);
    expect(canonicalLegends(incomeLifeExpectancyEnPreviewSource)).toEqual([
      { channel: 'color', title: 'Continent', position: 'right' },
    ]);
    expect(incomeLifeExpectancyZh.relatedApis).toContain('Legend.channel');
    expect(incomeLifeExpectancyEn.relatedApis).toContain('Legend.channel');
  });

  it('Bubble 只在两个定量字段尺寸编码之间切换，不提供固定尺寸', () => {
    expect(bubbleZh.canonicalValues).toEqual({ sizeEncoding: 'power', colorByGroup: true });
    expect(JSON.stringify(bubbleZh.controls)).not.toContain('fixed');
    expect(bubbleZh.relatedApis).toContain('PointMark.size');
  });

  it('为 Chart Showcase 使用 800 × 400 的默认图表尺寸', () => {
    for (const source of [
      basicZhPreviewSource,
      basicEnPreviewSource,
      incomeLifeExpectancyZhPreviewSource,
      incomeLifeExpectancyEnPreviewSource,
      bubbleZhPreviewSource,
      bubbleEnPreviewSource,
    ]) {
      expect(canonicalChartSize(source)).toEqual({ width: 800, height: 400 });
    }
  });

  it('双语 demo 使用本地化轴标题', () => {
    expect(canonicalAxisTitles(basicZhPreviewSource)).toEqual(['城镇人口占比（%）', '互联网使用人口占比（%）']);
    expect(canonicalAxisTitles(basicEnPreviewSource)).toEqual([
      'Urban population (% of total)',
      'Individuals using the Internet (% of population)',
    ]);
    expect(canonicalAxisTitles(incomeLifeExpectancyZhPreviewSource)).toEqual([
      '人均 GDP（经通胀调整美元）',
      '出生时预期寿命（年）',
    ]);
    expect(canonicalAxisTitles(incomeLifeExpectancyEnPreviewSource)).toEqual([
      'GDP per capita (inflation-adjusted US$)',
      'Life expectancy at birth (years)',
    ]);
    expect(canonicalAxisTitles(bubbleZhPreviewSource)).toEqual(['重量 (kg)', '效率 (km/L)']);
    expect(canonicalAxisTitles(bubbleEnPreviewSource)).toEqual(['Weight (kg)', 'Efficiency (km/L)']);
  });
});
