import type { ComponentType } from 'react';

import { createElement, isValidElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '../../src/modules/docs/components/component-preview';
import type { PreviewControlContract, PreviewSourceConfig } from '../../src/modules/docs/preview';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewControlContract as bubbleZh } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.controls';
import { previewControlContract as bubbleEn } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.controls';
import BubbleEnDemo from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.demo';
import { previewSource as bubbleEnSource } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.demo';
import BubbleZhDemo from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.zh.demo';
import { previewSource as bubbleZhSource } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.zh.demo';
import { previewControlContract as connectedZh } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.controls';
import { previewControlContract as connectedEn } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.en.controls';
import ConnectedEnDemo from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.en.demo';
import { previewSource as connectedEnSource } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.en.demo';
import ConnectedZhDemo from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.zh.demo';
import { previewSource as connectedZhSource } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.zh.demo';
import { previewControlContract as rangedDotZh } from '../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.controls';
import { previewControlContract as rangedDotEn } from '../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.en.controls';
import RangedDotEnDemo from '../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.en.demo';
import { previewSource as rangedDotEnSource } from '../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.en.demo';
import RangedDotZhDemo from '../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.zh.demo';
import { previewSource as rangedDotZhSource } from '../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.zh.demo';
import { previewControlContract as regressionZh } from '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.controls';
import { previewControlContract as regressionEn } from '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.en.controls';
import RegressionEnDemo from '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.en.demo';
import { previewSource as regressionEnSource } from '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.en.demo';
import RegressionZhDemo from '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.zh.demo';
import { previewSource as regressionZhSource } from '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.zh.demo';
import { previewControlContract as fertilityZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.controls';
import { previewControlContract as fertilityEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.en.controls';
import FertilityEnDemo from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.en.demo';
import { previewSource as fertilityEnSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.en.demo';
import FertilityZhDemo from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.zh.demo';
import { previewSource as fertilityZhSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.zh.demo';
import { previewControlContract as penguinZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.controls';
import { previewControlContract as penguinEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.en.controls';
import PenguinEnDemo from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.en.demo';
import { previewSource as penguinEnSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.en.demo';
import PenguinZhDemo from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.zh.demo';
import { previewSource as penguinZhSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-penguins-facet-jitter.zh.demo';
import { previewControlContract as worldCupZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.controls';

type PointCoordinateScenario = Readonly<{
  coordinateId: string;
  relatedApi: string;
  zh: PreviewControlContract;
  en: PreviewControlContract;
  demos: readonly [ComponentType, ComponentType];
  sources: readonly [PreviewSourceConfig, PreviewSourceConfig];
  hasFacet?: boolean;
}>;

const scenarios: ReadonlyArray<PointCoordinateScenario> = [
  {
    coordinateId: 'bubble-basic-coordinate-system',
    relatedApi: 'BubbleChart.coordinate',
    zh: bubbleZh,
    en: bubbleEn,
    demos: [BubbleZhDemo, BubbleEnDemo],
    sources: [bubbleZhSource, bubbleEnSource],
  },
  {
    coordinateId: 'regression-basic-coordinate-system',
    relatedApi: 'RegressionChart.coordinate',
    zh: regressionZh,
    en: regressionEn,
    demos: [RegressionZhDemo, RegressionEnDemo],
    sources: [regressionZhSource, regressionEnSource],
  },
  {
    coordinateId: 'connected-scatter-coordinate-system',
    relatedApi: 'ConnectedScatterChart.coordinate',
    zh: connectedZh,
    en: connectedEn,
    demos: [ConnectedZhDemo, ConnectedEnDemo],
    sources: [connectedZhSource, connectedEnSource],
  },
  {
    coordinateId: 'ranged-dot-coordinate-system',
    relatedApi: 'RangedDotChart.coordinate',
    zh: rangedDotZh,
    en: rangedDotEn,
    demos: [RangedDotZhDemo, RangedDotEnDemo],
    sources: [rangedDotZhSource, rangedDotEnSource],
  },
  {
    coordinateId: 'scatter-fertility-work-coordinate-system',
    relatedApi: 'ScatterChart.coordinate',
    zh: fertilityZh,
    en: fertilityEn,
    demos: [FertilityZhDemo, FertilityEnDemo],
    sources: [fertilityZhSource, fertilityEnSource],
  },
  {
    coordinateId: 'scatter-penguins-facet-jitter-coordinate-system',
    relatedApi: 'ScatterChart.coordinate',
    zh: penguinZh,
    en: penguinEn,
    demos: [PenguinZhDemo, PenguinEnDemo],
    sources: [penguinZhSource, penguinEnSource],
    hasFacet: true,
  },
];

const svgSizeOf = (markup: string): { width: number; height: number } => {
  const svg = markup.match(/<svg\b[^>]*>/)?.[0];
  const width = svg?.match(/\bwidth="([\d.]+)"/)?.[1];
  const height = svg?.match(/\bheight="([\d.]+)"/)?.[1];
  if (width === undefined || height === undefined) {
    throw new Error('Point Chart preview must render an explicitly sized SVG');
  }
  return { width: Number(width), height: Number(height) };
};

const renderDemo = (
  Demo: ComponentType,
  contract: PreviewControlContract,
  coordinateId: string,
  coordinate: 'cartesian2D' | 'polar2D',
): string => {
  const canonicalValues = contract.canonicalValues as PreviewControlValues;
  const values = { ...canonicalValues, [coordinateId]: coordinate };

  return renderToStaticMarkup(
    createElement(
      PreviewControlStateContext.Provider,
      {
        value: {
          canonicalValues,
          values,
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        },
      },
      createElement(Demo),
    ),
  );
};

const canonicalCoordinateProps = (source: PreviewSourceConfig): Record<string, unknown> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<Record<string, unknown>>(chart)) {
    throw new Error('Point Chart preview must provide a canonical element');
  }
  return chart.props;
};

describe('Viz Chart Point family coordinate controls', () => {
  it('六个通用 Point demos 共享 Cartesian / Polar control，并以 Cartesian 为 canonical', () => {
    for (const scenario of scenarios) {
      for (const contract of [scenario.zh, scenario.en]) {
        const coordinateControl = getPreviewControlFields(contract.controls).find(
          control => control.id === scenario.coordinateId,
        );
        expect(coordinateControl).toMatchObject({ kind: 'select', defaultValue: 'cartesian2D' });
        if (coordinateControl?.kind === 'select') {
          expect(coordinateControl.options.map(option => option.value)).toEqual(['cartesian2D', 'polar2D']);
        }
        expect(contract.canonicalValues[scenario.coordinateId]).toBe('cartesian2D');
        expect(contract.relatedApis).toContain(scenario.relatedApi);
      }

      for (const source of scenario.sources) {
        expect(canonicalCoordinateProps(source)).toMatchObject({ coordinate: { type: 'cartesian2D' } });
      }
    }
  });

  it('世界杯射门 demo 保持固定笛卡尔球场，不加入 Point family 坐标 control', () => {
    expect(getPreviewControlFields(worldCupZh.controls).map(control => control.id)).not.toContain(
      'scatter-world-cup-shots-coordinate-system',
    );
    expect(worldCupZh.relatedApis).not.toContain('ScatterChart.coordinate');
  });

  it.each(scenarios)('$coordinateId 按坐标系与分面状态选择预览尺寸', scenario => {
    for (const [index, Demo] of scenario.demos.entries()) {
      const contract = index === 0 ? scenario.zh : scenario.en;
      const cartesian = renderDemo(Demo, contract, scenario.coordinateId, 'cartesian2D');
      const polar = renderDemo(Demo, contract, scenario.coordinateId, 'polar2D');

      expect(svgSizeOf(cartesian)).toEqual({ width: 800, height: 500 });
      expect(svgSizeOf(polar)).toEqual(scenario.hasFacet ? { width: 800, height: 400 } : { width: 400, height: 500 });
    }
  });
});
