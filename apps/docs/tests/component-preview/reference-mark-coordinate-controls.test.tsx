import type { ComponentType } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '@/modules/docs/components/component-preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { previewControlContract as bandContract } from '@/modules/docs/contents/viz/plot/mark/reference/rule-band.controls';
import BandDemo from '@/modules/docs/contents/viz/plot/mark/reference/rule-band.demo';
import { previewControlContract as extentContract } from '@/modules/docs/contents/viz/plot/mark/reference/rule-extent.controls';
import ExtentDemo from '@/modules/docs/contents/viz/plot/mark/reference/rule-extent.demo';
import { previewControlContract as perDatumContract } from '@/modules/docs/contents/viz/plot/mark/reference/rule-per-datum.controls';
import PerDatumDemo from '@/modules/docs/contents/viz/plot/mark/reference/rule-per-datum.demo';
import { previewControlContract as regionContract } from '@/modules/docs/contents/viz/plot/mark/reference/rule-region.controls';
import RegionDemo from '@/modules/docs/contents/viz/plot/mark/reference/rule-region.demo';
import { previewControlContract as thresholdContract } from '@/modules/docs/contents/viz/plot/mark/reference/rule-threshold.controls';
import ThresholdDemo from '@/modules/docs/contents/viz/plot/mark/reference/rule-threshold.demo';

type CoordinateScenario = {
  name: string;
  Demo: ComponentType;
  contract: PreviewControlContract;
  coordinateId: string;
};

const scenarios: Array<CoordinateScenario> = [
  {
    name: '基础参考线',
    Demo: ThresholdDemo,
    contract: thresholdContract,
    coordinateId: 'rule-threshold-coordinate',
  },
  {
    name: '参考带',
    Demo: BandDemo,
    contract: bandContract,
    coordinateId: 'rule-band-coordinate',
  },
  {
    name: '二维参考区域',
    Demo: RegionDemo,
    contract: regionContract,
    coordinateId: 'rule-region-coordinate',
  },
  {
    name: '逐行参考',
    Demo: PerDatumDemo,
    contract: perDatumContract,
    coordinateId: 'rule-per-datum-coordinate',
  },
  {
    name: '局部覆盖',
    Demo: ExtentDemo,
    contract: extentContract,
    coordinateId: 'rule-extent-coordinate',
  },
];

const renderScenario = ({ Demo, contract, coordinateId }: CoordinateScenario, coordinate: string): string => {
  const canonicalValues = contract.canonicalValues as PreviewControlValues;
  const values = { ...canonicalValues, [coordinateId]: coordinate };

  return renderToStaticMarkup(
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
};

describe('ReferenceMark playground 坐标系切换', () => {
  it.each(scenarios)('$name 暴露笛卡尔与极坐标选项，并以笛卡尔为稳定基线', scenario => {
    const field = getPreviewControlFields(scenario.contract.controls).find(
      candidate => candidate.id === scenario.coordinateId,
    );

    expect(field).toMatchObject({
      kind: 'select',
      defaultValue: 'cartesian2D',
      options: [{ value: 'cartesian2D' }, { value: 'polar2D' }],
    });
    expect(scenario.contract.canonicalValues[scenario.coordinateId]).toBe('cartesian2D');
  });

  it.each(scenarios)('$name 用同一个 demo 在两种坐标系间切换，而不是同时绘制两份图表', scenario => {
    const cartesian = renderScenario(scenario, 'cartesian2D');
    const polar = renderScenario(scenario, 'polar2D');

    expect(cartesian).toContain('<svg');
    expect(polar).toContain('<svg');
    expect(polar).not.toBe(cartesian);
  });

  it('五个 playground 的数据区默认收起', () => {
    for (const scenario of scenarios) {
      const controls = scenario.contract.controls;

      expect(controls.presentation, scenario.name).toBe('panel');
      if (controls.presentation !== 'panel') continue;

      expect(controls.sections[0].defaultCollapsed, scenario.name).toBe(true);
    }
  });
});
