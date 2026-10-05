import { isValidElement } from 'react';
import { describe, expect, it } from 'vitest';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { previewControlContract as bubbleZh } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.controls';
import { previewControlContract as bubbleEn } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.controls';
import { previewSource as bubbleEnSource } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.en.demo';
import { previewSource as bubbleZhSource } from '../../src/modules/docs/contents/viz/chart/points/bubble/bubble-basic.zh.demo';
import { previewControlContract as connectedZh } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.controls';
import { previewControlContract as connectedEn } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.en.controls';
import { previewSource as connectedEnSource } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.en.demo';
import { previewSource as connectedZhSource } from '../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-basic.zh.demo';
import { previewControlContract as rangedDotZh } from '../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.controls';
import { previewControlContract as rangedDotEn } from '../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.en.controls';
import { previewSource as rangedDotEnSource } from '../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.en.demo';
import { previewSource as rangedDotZhSource } from '../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-basic.zh.demo';
import { previewControlContract as regressionZh } from '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.controls';
import { previewControlContract as regressionEn } from '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.en.controls';
import { previewSource as regressionEnSource } from '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.en.demo';
import { previewSource as regressionZhSource } from '../../src/modules/docs/contents/viz/chart/points/regression/regression-basic.zh.demo';
import { previewControlContract as scatterZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.controls';
import { previewControlContract as scatterEn } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.en.controls';
import { previewSource as scatterEnSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.en.demo';
import { previewSource as scatterZhSource } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-fertility-work.zh.demo';
import { previewControlContract as worldCupZh } from '../../src/modules/docs/contents/viz/chart/points/scatter/scatter-world-cup-shots.controls';
import { previewControlContract as stripZh } from '../../src/modules/docs/contents/viz/chart/points/strip/strip-basic.controls';
import { previewControlContract as stripEn } from '../../src/modules/docs/contents/viz/chart/points/strip/strip-basic.en.controls';
import { previewSource as stripEnSource } from '../../src/modules/docs/contents/viz/chart/points/strip/strip-basic.en.demo';
import { previewSource as stripZhSource } from '../../src/modules/docs/contents/viz/chart/points/strip/strip-basic.zh.demo';
import type { PreviewControlContract, PreviewSourceConfig } from '../../src/modules/docs/preview';

type PointCoordinateScenario = Readonly<{
  coordinateId: string;
  relatedApi: string;
  zh: PreviewControlContract;
  en: PreviewControlContract;
  sources: readonly [PreviewSourceConfig, PreviewSourceConfig];
}>;

const scenarios: ReadonlyArray<PointCoordinateScenario> = [
  {
    coordinateId: 'scatter-fertility-work-coordinate-system',
    relatedApi: 'ScatterChart.coordinate',
    zh: scatterZh,
    en: scatterEn,
    sources: [scatterZhSource, scatterEnSource],
  },
  {
    coordinateId: 'bubble-basic-coordinate-system',
    relatedApi: 'BubbleChart.coordinate',
    zh: bubbleZh,
    en: bubbleEn,
    sources: [bubbleZhSource, bubbleEnSource],
  },
  {
    coordinateId: 'regression-basic-coordinate-system',
    relatedApi: 'RegressionChart.coordinate',
    zh: regressionZh,
    en: regressionEn,
    sources: [regressionZhSource, regressionEnSource],
  },
  {
    coordinateId: 'connected-scatter-coordinate-system',
    relatedApi: 'ConnectedScatterChart.coordinate',
    zh: connectedZh,
    en: connectedEn,
    sources: [connectedZhSource, connectedEnSource],
  },
  {
    coordinateId: 'ranged-dot-coordinate-system',
    relatedApi: 'RangedDotChart.coordinate',
    zh: rangedDotZh,
    en: rangedDotEn,
    sources: [rangedDotZhSource, rangedDotEnSource],
  },
  {
    coordinateId: 'strip-basic-coordinate-system',
    relatedApi: 'StripChart.coordinate',
    zh: stripZh,
    en: stripEn,
    sources: [stripZhSource, stripEnSource],
  },
];

const canonicalCoordinateProps = (source: PreviewSourceConfig): Record<string, unknown> => {
  const chart = source.canonicalRender?.();
  if (!isValidElement<Record<string, unknown>>(chart)) {
    throw new Error('Point Chart preview must provide a canonical element');
  }

  return chart.props;
};

describe('Viz Chart Point family coordinate controls', () => {
  it('双语示例在数据表后提供坐标切换，默认使用笛卡尔坐标', () => {
    for (const scenario of scenarios) {
      for (const contract of [scenario.zh, scenario.en]) {
        if (contract.controls.presentation !== 'panel') {
          throw new Error('Point Chart basic preview must use a controls panel');
        }

        const coordinateControl = getPreviewControlFields(contract.controls).find(
          control => control.id === scenario.coordinateId,
        );

        expect(coordinateControl).toMatchObject({ kind: 'select', defaultValue: 'cartesian2D' });

        if (coordinateControl?.kind === 'select') {
          expect(coordinateControl.options.map(option => option.value)).toEqual(['cartesian2D', 'polar2D']);
        }

        expect(contract.canonicalValues[scenario.coordinateId]).toBe('cartesian2D');
        expect(contract.relatedApis).toContain(scenario.relatedApi);
        expect(contract.controls.sections[0]?.controls[0]?.kind).toBe('table');
        expect(contract.controls.sections[1]?.controls[0]?.id).toBe(scenario.coordinateId);
      }

      for (const source of scenario.sources) {
        expect(canonicalCoordinateProps(source)).toMatchObject({ coordinate: { type: 'cartesian2D' } });
      }
    }
  });

  it('其余十二个基础用法 demo 也把坐标系放在数据表后的首个控件', async () => {
    const contractLoaders = [
      () => import('../../src/modules/docs/contents/viz/chart/points/scatter/scatter-appearance.controls'),
      () => import('../../src/modules/docs/contents/viz/chart/points/scatter/scatter-marks.controls'),
      () => import('../../src/modules/docs/contents/viz/chart/points/bubble/bubble-encodings.controls'),
      () => import('../../src/modules/docs/contents/viz/chart/points/bubble/bubble-appearance.controls'),
      () => import('../../src/modules/docs/contents/viz/chart/points/bubble/bubble-marks.controls'),
      () =>
        import('../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-encodings.controls'),
      () =>
        import('../../src/modules/docs/contents/viz/chart/points/connected-scatter/connected-scatter-marks.controls'),
      () => import('../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-encodings.controls'),
      () => import('../../src/modules/docs/contents/viz/chart/points/ranged-dot/ranged-dot-marks.controls'),
      () => import('../../src/modules/docs/contents/viz/chart/points/regression/regression-encodings.controls'),
      () => import('../../src/modules/docs/contents/viz/chart/points/regression/regression-marks.controls'),
      () => import('../../src/modules/docs/contents/viz/chart/points/strip/strip-encodings.controls'),
    ];

    for (const load of contractLoaders) {
      const { createPreviewControlContract } = await load();

      for (const lang of ['zh', 'en'] as const) {
        const contract = createPreviewControlContract(lang);

        expect(contract.controls.sections[0]?.controls[0]?.kind).toBe('table');

        const coordinateControl = contract.controls.sections[1]?.controls[0];

        expect(coordinateControl).toMatchObject({ kind: 'select', defaultValue: 'cartesian2D' });
        expect(contract.canonicalValues[coordinateControl.id]).toBe('cartesian2D');
        expect(contract.relatedApis).toContainEqual(expect.stringMatching(/Chart\.coordinate$/));
      }
    }
  });

  it('世界杯射门 demo 保持固定笛卡尔球场，不加入 Point family 坐标 control', () => {
    expect(getPreviewControlFields(worldCupZh.controls).map(control => control.id)).not.toContain(
      'scatter-world-cup-shots-coordinate-system',
    );
    expect(worldCupZh.relatedApis).not.toContain('ScatterChart.coordinate');
  });
});
