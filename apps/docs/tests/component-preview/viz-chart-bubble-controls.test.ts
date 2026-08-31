import type { ChartExtensionProps } from '@retikz/chart-react';
import type { ReactNode } from 'react';

import { ChartExtension, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { BubbleEncodings, BubbleProperties } from '@retikz/chart-react/point';
import { PlotAxis } from '@retikz/plot-react';
import { Children, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import type {
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewSourceConfig,
} from '../../src/modules/docs/preview';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewControlContract as basicZh } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.controls';
import {
  GAPMINDER_BUBBLE_SOURCE_DOI,
  GAPMINDER_BUBBLE_SOURCE_URL,
  GAPMINDER_BUBBLE_YEAR,
  gapminderBubbleData,
} from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.data';
import { previewControlContract as basicEn } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.controls';
import { previewSource as basicEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.demo';
import { previewSource as basicZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.zh.demo';

const comparable = (contract: PreviewControlContract) => ({
  controls: JSON.parse(
    JSON.stringify(contract.controls, (key, value) =>
      ['title', 'label', 'help', 'customLabel'].includes(key) ? undefined : value,
    ),
  ) as PreviewControlsDefinition,
  canonicalValues: contract.canonicalValues,
  relatedApis: contract.relatedApis,
});

const canonicalDeclarationProps = <TProps extends object = Record<string, unknown>>(
  source: PreviewSourceConfig,
  component: unknown,
): TProps => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Bubble preview must provide a canonical element');
  }
  const declaration = Children.toArray(chart.props.children).find(
    child => isValidElement(child) && child.type === component,
  );
  if (!isValidElement<TProps>(declaration)) {
    throw new Error('Bubble preview is missing a required declaration');
  }
  return declaration.props;
};

const canonicalPresentation = (source: PreviewSourceConfig): Record<'title' | 'subtitle' | 'source', ReactNode> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Bubble preview must provide a canonical element');
  }
  const children = Children.toArray(chart.props.children);
  const textOf = (marker: typeof ChartTitle | typeof ChartSubtitle | typeof ChartSource): ReactNode => {
    const child = children.find(candidate => isValidElement(candidate) && candidate.type === marker);
    if (!isValidElement<{ children?: ReactNode }>(child)) {
      throw new Error('Bubble preview is missing presentation text');
    }
    return child.props.children;
  };
  return {
    title: textOf(ChartTitle),
    subtitle: textOf(ChartSubtitle),
    source: textOf(ChartSource),
  };
};

const canonicalAxisProps = (source: PreviewSourceConfig): Array<Record<string, unknown>> => {
  const extension = canonicalDeclarationProps<ChartExtensionProps>(source, ChartExtension);
  const axes: Array<Record<string, unknown>> = [];
  for (const child of Children.toArray(extension.children)) {
    if (isValidElement<Record<string, unknown>>(child) && child.type === PlotAxis) axes.push(child.props);
  }
  return axes;
};

describe('Viz Chart Bubble controls', () => {
  it('保留可追溯的 Gapminder 2007 完整国家截面', () => {
    expect(GAPMINDER_BUBBLE_YEAR).toBe(2007);
    expect(GAPMINDER_BUBBLE_SOURCE_URL).toContain('jennybc/gapminder');
    expect(GAPMINDER_BUBBLE_SOURCE_DOI).toBe('10.5281/zenodo.594018');
    expect(gapminderBubbleData).toHaveLength(142);
    expect(new Set(gapminderBubbleData.map(datum => datum.continent))).toEqual(
      new Set(['Africa', 'Americas', 'Asia', 'Europe', 'Oceania']),
    );
    expect(
      gapminderBubbleData.every(
        datum => datum.country.length > 0 && datum.gdpPerCapita > 0 && datum.lifeExpectancy > 0 && datum.population > 0,
      ),
    ).toBe(true);
  });

  it('双语 controls 保持相同结构，且不提供会被分类色编码覆盖的固定填充', () => {
    expect(comparable(basicZh)).toEqual(comparable(basicEn));
    expect(basicZh.canonicalValues).toEqual({
      'bubble-basic-coordinate-system': 'cartesian2D',
      'bubble-basic-x-domain-padding': 0.04,
      'bubble-basic-y-domain-padding': 0.04,
      'bubble-basic-color-by-continent': true,
      'bubble-basic-x-scale': 'log',
      'bubble-basic-x-tick-count': 10,
      'bubble-basic-x-tick-marks': true,
      'bubble-basic-x-tick-labels': true,
      'bubble-basic-x-grid': true,
      'bubble-basic-point-stroke-enabled': false,
      'bubble-basic-point-stroke': 'currentColor',
      'bubble-basic-point-shape': 'circle',
      'bubble-basic-point-fill-opacity': 0.7,
    });
    const controlFields = getPreviewControlFields(basicZh.controls);
    expect(controlFields.map(control => control.id)).toEqual([
      'bubble-basic-coordinate-system',
      'bubble-basic-x-domain-padding',
      'bubble-basic-y-domain-padding',
      'bubble-basic-color-by-continent',
      'bubble-basic-x-scale',
      'bubble-basic-x-tick-count',
      'bubble-basic-x-tick-marks',
      'bubble-basic-x-tick-labels',
      'bubble-basic-x-grid',
      'bubble-basic-point-stroke-enabled',
      'bubble-basic-point-stroke',
      'bubble-basic-point-shape',
      'bubble-basic-point-fill-opacity',
    ]);
    expect(controlFields.find(control => control.id === 'bubble-basic-x-domain-padding')).toMatchObject({
      kind: 'range',
      defaultValue: 0.04,
      min: 0,
      max: 0.2,
      step: 0.01,
    });
    expect(controlFields.find(control => control.id === 'bubble-basic-y-domain-padding')).toMatchObject({
      kind: 'range',
      defaultValue: 0.04,
      min: 0,
      max: 0.2,
      step: 0.01,
    });
    expect(controlFields.find(control => control.id === 'bubble-basic-x-tick-count')).toMatchObject({
      kind: 'range',
      defaultValue: 10,
      min: 5,
      max: 20,
      step: 1,
    });
    const shapeControl = controlFields.find(control => control.id === 'bubble-basic-point-shape');
    expect(shapeControl).toMatchObject({ kind: 'select' });
    if (shapeControl?.kind === 'select') {
      expect(shapeControl.options.map(option => option.value)).toEqual(['circle', 'rectangle', 'diamond']);
    }
    expect(Object.keys(basicZh.canonicalValues).sort()).toEqual(
      getPreviewControlFields(basicZh.controls)
        .map(control => control.id)
        .sort(),
    );
    expect(basicZh.relatedApis).toContain('BubbleEncodings.size');
    expect(basicZh.relatedApis).toContain('ChartExtension.coordinate');
    expect(basicZh.relatedApis).toContain('BubbleEncodings.color');
    expect(basicZh.relatedApis).not.toContain('BubbleProperties.size');
    expect(basicZh.relatedApis).toContain('BubbleProperties.domainPadding');
    expect(basicZh.relatedApis).not.toContain('BubbleProperties.fill');
    expect(basicZh.relatedApis).toContain('BubbleProperties.fillOpacity');
    expect(basicZh.relatedApis).not.toContain('BubbleProperties.opacity');
  });

  it('双语 demo 固定必需 size mapping，默认按洲分类着色并沿用默认 sqrt 尺度', () => {
    for (const source of [basicZhPreviewSource, basicEnPreviewSource]) {
      expect(canonicalDeclarationProps(source, BubbleEncodings)).toMatchObject({
        x: {
          field: 'gdpPerCapita',
          scale: { operation: { type: 'log', name: 'gdpPerCapitaScale' } },
        },
        y: 'lifeExpectancy',
        size: 'population',
        color: 'continent',
      });
      expect(canonicalDeclarationProps(source, BubbleEncodings)).not.toHaveProperty('size.scale');
      expect(canonicalDeclarationProps(source, BubbleProperties)).toMatchObject({
        domainPadding: { x: 0.04, y: 0.04 },
        shape: 'circle',
      });
      expect(canonicalDeclarationProps(source, BubbleProperties)).not.toHaveProperty('size');
      expect(canonicalDeclarationProps(source, BubbleProperties)).not.toHaveProperty('fill');
      expect(canonicalDeclarationProps(source, BubbleProperties)).not.toHaveProperty('stroke');
      expect(canonicalDeclarationProps(source, BubbleProperties)).not.toHaveProperty('fillOpacity');
      expect(canonicalDeclarationProps(source, BubbleProperties)).not.toHaveProperty('opacity');
      expect(canonicalDeclarationProps(source, ChartLayout)).toMatchObject({ width: 800, height: 500 });
      expect(source.datasetImports).toEqual({
        'chart.data': { name: 'gapminderBubbleData', from: './bubble-basic.data' },
      });
      expect(canonicalAxisProps(source)).toMatchObject([
        {
          dimension: 'x',
          ticks: { count: 10 },
          grid: true,
        },
        {
          dimension: 'y',
          grid: true,
        },
      ]);
    }
  });

  it('双语 demo 在 Chart presentation 中说明尺寸语义、年份与来源', () => {
    expect(canonicalPresentation(basicZhPreviewSource)).toMatchObject({
      title: '收入、寿命与人口规模',
      subtitle: expect.stringContaining('气泡面积由人口字段驱动'),
      source: expect.stringContaining('Gapminder'),
    });
    expect(canonicalPresentation(basicEnPreviewSource)).toMatchObject({
      title: 'Income, life expectancy, and population',
      subtitle: expect.stringContaining('bubble area is driven by population'),
      source: expect.stringContaining('Gapminder'),
    });
  });
});
