import type { ReactElement, ReactNode } from 'react';

import { ChartExtension, ChartLayout, ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';
import { PlotAxis } from '@retikz/plot-react';
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
import { previewControlContract as fertilityWorkZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.controls';
import {
  fertilityWorkData,
  WORLD_BANK_FERTILITY_WORK_YEAR,
} from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.data';
import { previewControlContract as fertilityWorkEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.en.controls';
import { previewSource as fertilityWorkEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.en.demo';
import { previewSource as fertilityWorkZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.zh.demo';
import { previewControlContract as penguinFacetZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.controls';
import { previewControlContract as penguinFacetEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.en.controls';
import { previewSource as penguinFacetEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.en.demo';
import { previewSource as penguinFacetZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.zh.demo';
import { previewControlContract as worldCupZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.controls';
import { previewControlContract as worldCupEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.en.controls';
import { previewSource as worldCupEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.en.demo';
import { previewSource as worldCupZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.zh.demo';

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
    contract.relatedApis.every(api =>
      /^(?:ChartExtension|Plot[A-Z]\w*|Plot|PointMark|Scatter[A-Z]\w*)(?:\.|$)/u.test(api),
    ),
  ).toBe(true);
};

const canonicalChartSize = (source: PreviewSourceConfig): { width?: number; height?: number } => {
  const layout = canonicalDeclarationProps(source, ChartLayout);
  return { width: layout.width as number | undefined, height: layout.height as number | undefined };
};

const canonicalChartLayout = (source: PreviewSourceConfig): { width?: number; height?: number } => {
  const layout = canonicalDeclarationProps(source, ChartLayout);
  const explicit = layout.layout as { width?: number; height?: number } | undefined;
  return explicit ?? { width: layout.width as number | undefined, height: layout.height as number | undefined };
};

const canonicalScatterProps = (source: PreviewSourceConfig): Record<string, unknown> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<Record<string, unknown>>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }

  return chart.props;
};

const canonicalScatterPropertiesProps = (source: PreviewSourceConfig): Record<string, unknown> => {
  return canonicalDeclarationProps(source, ScatterProperties);
};

const canonicalDeclarationProps = (source: PreviewSourceConfig, component: unknown): Record<string, unknown> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<{ children?: ReactNode }>(chart)) {
    throw new Error('Chart preview must provide a canonical element');
  }
  const declaration = Children.toArray(chart.props.children).find(
    child => isValidElement(child) && child.type === component,
  );
  if (!isValidElement<Record<string, unknown>>(declaration)) {
    throw new Error('Scatter preview is missing a required declaration');
  }

  return declaration.props;
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
      [fertilityWorkZh, fertilityWorkEn],
      [penguinFacetZh, penguinFacetEn],
      [worldCupZh, worldCupEn],
    ] as const) {
      expect(comparable(zh)).toEqual(comparable(en));
      expectCompletePanel(zh);
      expectCompletePanel(en);
    }
  });

  it('三个 Scatter 示例只暴露不会与字段 encoding 冲突的公共图元控件', () => {
    expect(fertilityWorkZh.canonicalValues).toEqual({
      'scatter-fertility-work-coordinate-system': 'cartesian2D',
      'scatter-fertility-work-color-by-category': true,
      'scatter-fertility-work-shape-by-category': true,
      'scatter-fertility-work-point-size': 5,
      'scatter-fertility-work-point-stroke-enabled': false,
      'scatter-fertility-work-point-stroke': 'currentColor',
      'scatter-fertility-work-point-opacity': 0.65,
    });
    expect(penguinFacetZh.canonicalValues).toEqual({
      'scatter-penguins-facet-jitter-coordinate-system': 'cartesian2D',
      'scatter-penguins-facet-jitter-point-size': 5,
      'scatter-penguins-facet-jitter-point-fill-enabled': false,
      'scatter-penguins-facet-jitter-point-fill': 'currentColor',
      'scatter-penguins-facet-jitter-point-stroke-enabled': false,
      'scatter-penguins-facet-jitter-point-stroke': 'currentColor',
      'scatter-penguins-facet-jitter-point-shape': 'circle',
      'scatter-penguins-facet-jitter-point-opacity': 0.72,
    });
    expect(worldCupZh.canonicalValues).toEqual({
      'scatter-world-cup-shots-point-size': 5,
      'scatter-world-cup-shots-point-stroke-enabled': false,
      'scatter-world-cup-shots-point-stroke': '#f8fafc',
      'scatter-world-cup-shots-point-shape': 'circle',
      'scatter-world-cup-shots-point-opacity': 0.9,
    });
    expect(getPreviewControlFields(fertilityWorkZh.controls).map(control => control.id)).toEqual([
      'scatter-fertility-work-coordinate-system',
      'scatter-fertility-work-color-by-category',
      'scatter-fertility-work-shape-by-category',
      'scatter-fertility-work-point-size',
      'scatter-fertility-work-point-stroke-enabled',
      'scatter-fertility-work-point-stroke',
      'scatter-fertility-work-point-opacity',
    ]);
    expect(getPreviewControlFields(penguinFacetZh.controls).map(control => control.id)).toEqual([
      'scatter-penguins-facet-jitter-coordinate-system',
      'scatter-penguins-facet-jitter-point-size',
      'scatter-penguins-facet-jitter-point-fill-enabled',
      'scatter-penguins-facet-jitter-point-fill',
      'scatter-penguins-facet-jitter-point-stroke-enabled',
      'scatter-penguins-facet-jitter-point-stroke',
      'scatter-penguins-facet-jitter-point-shape',
      'scatter-penguins-facet-jitter-point-opacity',
    ]);
    expect(getPreviewControlFields(worldCupZh.controls).map(control => control.id)).toEqual([
      'scatter-world-cup-shots-point-size',
      'scatter-world-cup-shots-point-stroke-enabled',
      'scatter-world-cup-shots-point-stroke',
      'scatter-world-cup-shots-point-shape',
      'scatter-world-cup-shots-point-opacity',
    ]);
  });

  it('常量形状下拉只提供视觉上可区分的点形状', () => {
    for (const [contract, controlId] of [
      [penguinFacetZh, 'scatter-penguins-facet-jitter-point-shape'],
      [penguinFacetEn, 'scatter-penguins-facet-jitter-point-shape'],
      [worldCupZh, 'scatter-world-cup-shots-point-shape'],
      [worldCupEn, 'scatter-world-cup-shots-point-shape'],
    ] as const) {
      const shapeControl = getPreviewControlFields(contract.controls).find(control => control.id === controlId);
      expect(shapeControl).toMatchObject({ kind: 'select' });
      if (shapeControl?.kind === 'select') {
        expect(shapeControl.options.map(option => option.value)).toEqual(['circle', 'rectangle', 'diamond']);
      }
    }
  });

  it('两个通用 Scatter 示例以笛卡尔为 canonical，并通过 ChartExtension 切换 Polar', () => {
    for (const source of [
      fertilityWorkZhPreviewSource,
      fertilityWorkEnPreviewSource,
      penguinFacetZhPreviewSource,
      penguinFacetEnPreviewSource,
    ]) {
      expect(canonicalDeclarationProps(source, ChartExtension)).toMatchObject({
        coordinate: { type: 'cartesian2D' },
      });
    }

    for (const locale of ['zh', 'en']) {
      for (const demo of ['scatter-fertility-work', 'scatter-penguins-facet-jitter']) {
        const source = readFileSync(
          resolve(`src/modules/docs/contents/viz/chart/points/scatter/${demo}.${locale}.demo.tsx`),
          'utf8',
        );
        expect(source).toContain("type: 'polar2D'");
        expect(source).toContain('<ChartExtension');
      }
    }
  });

  it('各 Scatter 示例使用互不重叠的 control id，避免切换示例时串用状态', () => {
    const ids = [fertilityWorkZh, penguinFacetZh, worldCupZh].flatMap(contract =>
      getPreviewControlFields(contract.controls).map(control => control.id),
    );

    expect(new Set(ids).size).toBe(ids.length);
  });

  it('生育率与女性劳动参与率示例通过 typed color 与 shape encoding 同时区分收入组', () => {
    for (const source of [fertilityWorkZhPreviewSource, fertilityWorkEnPreviewSource]) {
      expect(canonicalDeclarationProps(source, ScatterEncodings)).toMatchObject({
        x: 'fertilityRate',
        y: 'femaleLaborParticipation',
        color: 'incomeGroup',
        shape: 'incomeGroup',
      });
      expect(canonicalScatterPropertiesProps(source)).toMatchObject({
        size: 5,
        opacity: 0.65,
      });
      expect(canonicalScatterPropertiesProps(source)).not.toHaveProperty('fill');
      expect(canonicalScatterPropertiesProps(source)).not.toHaveProperty('shape');
      expect(canonicalScatterPropertiesProps(source)).not.toHaveProperty('stroke');
      expect(canonicalScatterProps(source)).toMatchObject({
        theme: {
          tokens: {
            plot: {
              'plot.palette.shape': [
                'circle',
                'rectangle',
                'diamond',
                { type: 'polygon', params: { sides: 3, rotate: -90 } },
              ],
            },
          },
        },
      });
    }
  });

  it('分类编码示例用独立开关控制颜色与形状映射，并排除会被 encoding 覆盖的样式 controls', () => {
    expect(getPreviewControlFields(fertilityWorkZh.controls).map(control => control.id)).toEqual(
      expect.arrayContaining(['scatter-fertility-work-color-by-category', 'scatter-fertility-work-shape-by-category']),
    );
    expect(getPreviewControlFields(fertilityWorkEn.controls).map(control => control.id)).toEqual(
      expect.arrayContaining(['scatter-fertility-work-color-by-category', 'scatter-fertility-work-shape-by-category']),
    );
    expect(getPreviewControlFields(fertilityWorkZh.controls).map(control => control.id)).not.toContain(
      'scatter-fertility-work-point-fill',
    );
    expect(getPreviewControlFields(fertilityWorkZh.controls).map(control => control.id)).not.toContain(
      'scatter-fertility-work-point-shape',
    );
    expect(getPreviewControlFields(fertilityWorkEn.controls).map(control => control.id)).not.toContain(
      'scatter-fertility-work-point-fill',
    );
    expect(getPreviewControlFields(fertilityWorkEn.controls).map(control => control.id)).not.toContain(
      'scatter-fertility-work-point-shape',
    );
    expect(fertilityWorkZh.relatedApis).toEqual([
      'ChartExtension.coordinate',
      'ScatterEncodings.color',
      'ScatterEncodings.shape',
      'ScatterProperties.size',
      'ScatterProperties.stroke',
      'ScatterProperties.opacity',
    ]);
    expect(fertilityWorkEn.relatedApis).toEqual(fertilityWorkZh.relatedApis);
    expect(fertilityWorkZh.relatedApis).not.toContain('Legend.channel');
    expect(fertilityWorkEn.relatedApis).not.toContain('Legend.channel');
  });

  it('企鹅示例通过 rich encodings 声明分面、抖动与坐标轴', () => {
    for (const source of [penguinFacetZhPreviewSource, penguinFacetEnPreviewSource]) {
      expect(canonicalScatterPropertiesProps(source)).toMatchObject({
        size: 5,
        shape: 'circle',
        opacity: 0.72,
      });
      expect(canonicalScatterPropertiesProps(source)).not.toHaveProperty('fill');
      expect(canonicalScatterPropertiesProps(source)).not.toHaveProperty('stroke');
      expect(canonicalScatterProps(source)).not.toHaveProperty('plotExtension');
      const encodings = canonicalDeclarationProps(source, ScatterEncodings);
      expect(encodings).toMatchObject({
        x: {
          transform: {
            kind: 'jitter',
            xField: 'billLengthMm',
          },
          output: 'billLengthMm',
        },
        y: 'flipperLengthMm',
        column: 'species',
        facet: {
          header: { column: true },
          spacing: { panelGap: 20, labelGap: 52 },
        },
      });
      expect(encodings).not.toHaveProperty('color');
      expect(encodings).not.toHaveProperty('x.transform.amount');
      expect(encodings).not.toHaveProperty('x.transform.seed');
      expect(encodings).not.toHaveProperty('x.transform.axis');
      expect(encodings).not.toHaveProperty('facet.resolve');

      const extension = canonicalDeclarationProps(source, ChartExtension);
      const axes = Children.toArray(extension.children as ReactNode).filter(
        child => isValidElement<Record<string, unknown>>(child) && child.type === PlotAxis,
      );

      expect(axes.map(axis => (axis as ReactElement<Record<string, unknown>>).props)).toMatchObject([
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
      expect(source).toContain("kind: 'jitter'");
      expect(source).toContain('column="species"');
      expect(source).toContain('facet={{');
      expect(source).not.toContain('color="species"');
      expect(source).not.toContain('amount:');
      expect(source).not.toContain('seed:');
      expect(source.match(/<PlotAxis\b/gu)).toHaveLength(2);
      expect(source).toContain('<ChartExtension');
      expect(source).not.toContain('<ChartFacet');
      expect(source).not.toContain('<PlotTransform');
      expect(source).not.toContain('dataModel');
      expect(source).not.toContain('plotExtension');
    }
  });

  it('世界杯射门示例仅在 Plot area 使用外部球场背景图', () => {
    for (const source of [worldCupZhPreviewSource, worldCupEnPreviewSource]) {
      expect(canonicalScatterProps(source)).toMatchObject({
        theme: {
          tokens: {
            plot: {
              'plot.area.fill': {
                kind: 'image',
                href: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Football_pitch_metric_tr.svg',
              },
            },
            recipe: { axisEnabled: false },
          },
        },
      });
      expect(canonicalScatterProps(source)).not.toHaveProperty(['theme', 'tokens', 'plot', 'plot.area.fill', 'fit']);
      expect(canonicalScatterProps(source)).not.toHaveProperty('theme.tokens.recipe.axisGridEnabled');
      expect(canonicalScatterProps(source)).not.toHaveProperty('theme.tokens.chart.chart.canvas.fill');
      expect(canonicalScatterPropertiesProps(source)).toMatchObject({
        size: 5,
        shape: 'circle',
        opacity: 0.9,
      });
      expect(canonicalScatterPropertiesProps(source)).not.toHaveProperty('fill');
      expect(canonicalScatterPropertiesProps(source)).not.toHaveProperty('stroke');
      expect(canonicalScatterPropertiesProps(source)).not.toHaveProperty('strokeWidth');
    }
  });

  it('世界杯射门示例固定使用 StatsBomb 笛卡尔球场且不暴露坐标系切换', () => {
    expect(getPreviewControlFields(worldCupZh.controls).map(control => control.id)).not.toContain(
      'scatter-world-cup-shots-coordinate-system',
    );
    expect(worldCupZh.relatedApis).not.toContain('ChartExtension.coordinate');

    for (const locale of ['zh', 'en']) {
      const source = readFileSync(
        resolve(`src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.${locale}.demo.tsx`),
        'utf8',
      );
      expect(source).not.toContain('isPolar');
      expect(source).not.toContain("type: 'polar2D'");
      expect(source).not.toContain('<ChartExtension');
      expect(source).toContain('Football_pitch_metric_tr.svg');
    }
  });

  it('为预览宿主与 Source layout 同时声明 800x500 画布', () => {
    for (const source of [
      fertilityWorkZhPreviewSource,
      fertilityWorkEnPreviewSource,
      penguinFacetZhPreviewSource,
      penguinFacetEnPreviewSource,
    ]) {
      expect(canonicalChartSize(source)).toEqual({ width: 800, height: 500 });
      expect(canonicalChartLayout(source)).toEqual({ width: 800, height: 500 });
    }
  });

  it('双语 demo 在 Chart-native metadata 中说明字段单位与数据来源', () => {
    expect(canonicalPresentation(fertilityWorkZhPreviewSource)).toMatchObject({
      title: '生育率与女性劳动参与率',
      subtitle: expect.stringContaining('女性劳动参与率（%）'),
      source: expect.stringContaining('世界银行'),
    });
    expect(canonicalPresentation(fertilityWorkEnPreviewSource)).toMatchObject({
      title: 'Fertility and female labor participation',
      subtitle: expect.stringContaining('labor-force participation'),
      source: expect.stringContaining('World Bank'),
    });
  });
});
