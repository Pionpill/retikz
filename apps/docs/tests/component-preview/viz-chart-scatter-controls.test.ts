import { ChartSource, ChartSubtitle, ChartTitle } from '@retikz/chart-react';
import { ScatterEncodings, ScatterProperties } from '@retikz/chart-react/point';
import type { ReactNode } from 'react';
import { Children, isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewSource as appearanceSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-appearance';
import { createPreviewControlContract } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-appearance.controls';
import { previewControlContract as fertilityWorkZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.controls';
import {
  fertilityWorkData,
  WORLD_BANK_FERTILITY_WORK_YEAR,
} from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.data';
import { previewControlContract as fertilityWorkEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.en.controls';
import { previewSource as fertilityWorkEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.en.demo';
import { previewSource as fertilityWorkZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.zh.demo';
import { previewControlContract as worldCupZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.controls';
import { previewControlContract as worldCupEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.en.controls';
import { previewSource as worldCupEnPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.en.demo';
import { previewSource as worldCupZhPreviewSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.zh.demo';
import type {
  PreviewControlContract,
  PreviewControlsDefinition,
  PreviewSourceConfig,
} from '../../src/modules/docs/preview';

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
      /^(?:ChartCoordinate|ChartExtension|Plot[A-Z]\w*|Plot|PointMark|Scatter[A-Z]\w*)(?:\.|$)/u.test(api),
    ),
  ).toBe(true);
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
      [createPreviewControlContract('zh'), createPreviewControlContract('en')],
      [worldCupZh, worldCupEn],
    ] as const) {
      expect(comparable(zh)).toEqual(comparable(en));
      expectCompletePanel(zh);
      expectCompletePanel(en);
    }
  });

  it('两个 Scatter 示例只暴露不会与字段 encoding 冲突的控件', () => {
    expect(fertilityWorkZh.canonicalValues).toEqual({
      'scatter-fertility-work-coordinate-system': 'cartesian2D',
      'scatter-fertility-work-color-by-category': true,
      'scatter-fertility-work-shape-by-category': true,
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

  it('映射与外观示例保持相同字段，外观控件只调整常量属性', () => {
    expect(canonicalDeclarationProps(appearanceSource, ScatterEncodings)).toEqual(
      canonicalDeclarationProps(fertilityWorkZhPreviewSource, ScatterEncodings),
    );
    expect(canonicalScatterPropertiesProps(appearanceSource)).not.toEqual(
      canonicalScatterPropertiesProps(fertilityWorkZhPreviewSource),
    );
    expect(
      createPreviewControlContract().relatedApis.every(
        api => api === 'ScatterChart.coordinate' || api.startsWith('ScatterProperties.'),
      ),
    ).toBe(true);
    expect(
      fertilityWorkZh.relatedApis.every(
        api => api === 'ScatterChart.coordinate' || api.startsWith('ScatterEncodings.'),
      ),
    ).toBe(true);
  });

  it('各 Scatter 示例使用互不重叠的 control id，避免切换示例时串用状态', () => {
    const ids = [fertilityWorkZh, worldCupZh].flatMap(contract =>
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
      expect(canonicalScatterProps(source)).not.toHaveProperty('plotExtension');
    }
  });

  it('分类编码示例用独立开关控制颜色与形状映射，并排除会被 encoding 覆盖的样式 controls', () => {
    expect(getPreviewControlFields(fertilityWorkZh.controls).map(control => control.id)).toEqual(
      expect.arrayContaining(['scatter-fertility-work-color-by-category', 'scatter-fertility-work-shape-by-category']),
    );
    expect(getPreviewControlFields(fertilityWorkEn.controls).map(control => control.id)).toEqual(
      expect.arrayContaining(['scatter-fertility-work-color-by-category', 'scatter-fertility-work-shape-by-category']),
    );
    expect(fertilityWorkZh.relatedApis).toEqual([
      'ScatterChart.coordinate',
      'ScatterEncodings.color',
      'ScatterEncodings.shape',
    ]);
    expect(fertilityWorkEn.relatedApis).toEqual(fertilityWorkZh.relatedApis);
    expect(fertilityWorkZh.relatedApis).not.toContain('Legend.channel');
    expect(fertilityWorkEn.relatedApis).not.toContain('Legend.channel');
  });

  it('世界杯射门示例仅在 Plot area 使用外部球场背景图', () => {
    for (const source of [worldCupZhPreviewSource, worldCupEnPreviewSource]) {
      expect(canonicalScatterProps(source)).toMatchObject({
        plotExtension: {
          plotDefaults: {
            plotArea: {
              fill: {
                kind: 'image',
                href: 'https://upload.wikimedia.org/wikipedia/commons/e/ea/Football_pitch_metric_tr.svg',
              },
            },
          },
        },
        recipe: { guides: { axis: false } },
      });
      expect(canonicalScatterProps(source)).not.toHaveProperty(['plotExtension', 'plotDefaults', 'plotArea', 'fit']);
      expect(canonicalScatterProps(source)).not.toHaveProperty('recipe.guides.axisGridEnabled');
      expect(canonicalScatterProps(source)).not.toHaveProperty('plotExtension.plotDefaults.chart.canvas.fill');
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
    expect(worldCupZh.relatedApis).not.toContain('ScatterChart.coordinate');

    for (const source of [worldCupZhPreviewSource, worldCupEnPreviewSource])
      expect(canonicalScatterProps(source)).not.toHaveProperty('coordinate');
  });

  it('基础用法 demo 不包含图内 presentation 内容', () => {
    for (const source of [fertilityWorkZhPreviewSource, fertilityWorkEnPreviewSource, appearanceSource]) {
      const props = canonicalScatterProps(source);
      expect(props).not.toHaveProperty('presentation');
      expect(props).not.toHaveProperty('plotExtension');
      const chart = source.canonicalRender?.();
      if (!isValidElement<{ children?: ReactNode }>(chart)) throw new Error('Missing chart');
      const types = Children.toArray(chart.props.children)
        .filter(isValidElement)
        .map(child => child.type);
      expect(types).not.toContain(ChartTitle);
      expect(types).not.toContain(ChartSubtitle);
      expect(types).not.toContain(ChartSource);
    }
  });
});
