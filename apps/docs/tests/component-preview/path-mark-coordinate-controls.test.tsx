import type { ComponentType } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '@/modules/docs/components/component-preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { previewControlContract as basicContract } from '@/modules/docs/contents/viz/plot/mark/path/line-basic.controls';
import BasicDemo from '@/modules/docs/contents/viz/plot/mark/path/line-basic.demo';
import { previewControlContract as closureContract } from '@/modules/docs/contents/viz/plot/mark/path/line-closure.controls';
import ClosureDemo from '@/modules/docs/contents/viz/plot/mark/path/line-closure.demo';
import { previewControlContract as curveContract } from '@/modules/docs/contents/viz/plot/mark/path/line-curve.controls';
import CurveDemo from '@/modules/docs/contents/viz/plot/mark/path/line-curve.demo';
import { previewControlContract as interruptionContract } from '@/modules/docs/contents/viz/plot/mark/path/line-interruption.controls';
import InterruptionDemo from '@/modules/docs/contents/viz/plot/mark/path/line-interruption.demo';
import { previewControlContract as seriesContract } from '@/modules/docs/contents/viz/plot/mark/path/line-series.controls';
import SeriesDemo from '@/modules/docs/contents/viz/plot/mark/path/line-series.demo';

type CoordinateScenario = {
  name: string;
  Demo: ComponentType;
  contract: PreviewControlContract;
  coordinateId: string;
  closedId: string;
};

const scenarios: Array<CoordinateScenario> = [
  {
    name: '基础用法',
    Demo: BasicDemo,
    contract: basicContract,
    coordinateId: 'path-basic-coordinate',
    closedId: 'path-basic-closed',
  },
  {
    name: '系列与标签',
    Demo: SeriesDemo,
    contract: seriesContract,
    coordinateId: 'path-series-coordinate',
    closedId: 'path-series-closed',
  },
  {
    name: '连接与样式',
    Demo: CurveDemo,
    contract: curveContract,
    coordinateId: 'path-curve-coordinate',
    closedId: 'path-curve-closed',
  },
  {
    name: '闭合与填充',
    Demo: ClosureDemo,
    contract: closureContract,
    coordinateId: 'path-closure-coordinate',
    closedId: 'path-closure-closed',
  },
  {
    name: '缺失值处理',
    Demo: InterruptionDemo,
    contract: interruptionContract,
    coordinateId: 'path-interruption-coordinate',
    closedId: 'path-interruption-closed',
  },
];

const renderScenario = ({ Demo, contract }: CoordinateScenario, valuesOverride: PreviewControlValues): string => {
  const canonicalValues = contract.canonicalValues as PreviewControlValues;
  const values = { ...canonicalValues, ...valuesOverride };

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

const renderClosureScenario = (values: PreviewControlValues): string => {
  const canonicalValues = closureContract.canonicalValues as PreviewControlValues;

  return renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues,
        values: { ...canonicalValues, ...values },
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <ClosureDemo />
    </PreviewControlStateContext.Provider>,
  );
};

describe('PathMark playground 坐标系切换', () => {
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

  it.each(scenarios)('$name 将同一组 PathMark 从笛卡尔投影切换为极坐标投影', scenario => {
    const cartesian = renderScenario(scenario, { [scenario.coordinateId]: 'cartesian2D' });
    const polar = renderScenario(scenario, { [scenario.coordinateId]: 'polar2D' });

    expect(cartesian).toContain('<svg');
    expect(polar).toContain('<svg');
    expect(polar).not.toBe(cartesian);
  });

  it.each(scenarios)('$name 仅在极坐标分支暴露首尾闭合开关，并由关闭状态起步', scenario => {
    const field = getPreviewControlFields(scenario.contract.controls).find(
      candidate => candidate.id === scenario.closedId,
    );

    expect(field).toMatchObject({
      kind: 'switch',
      defaultValue: false,
      visibleWhen: { controlId: scenario.coordinateId, oneOf: ['polar2D'] },
    });
    expect(scenario.contract.canonicalValues[scenario.closedId]).toBe(false);
  });

  it.each(scenarios)('$name 的极坐标首尾闭合开关会改变 PathMark 几何', scenario => {
    const open = renderScenario(scenario, {
      [scenario.coordinateId]: 'polar2D',
      [scenario.closedId]: false,
    });
    const closed = renderScenario(scenario, {
      [scenario.coordinateId]: 'polar2D',
      [scenario.closedId]: true,
    });

    expect(closed).not.toBe(open);
  });

  it('连接与样式开关数据点时保持固定取景，避免右侧路径被裁切', () => {
    const curveScenario = scenarios.find(scenario => scenario.name === '连接与样式');
    expect(curveScenario).toBeDefined();
    if (!curveScenario) return;

    const withPoints = renderScenario(curveScenario, { 'path-curve-show-points': true });
    const withoutPoints = renderScenario(curveScenario, { 'path-curve-show-points': false });
    const viewBoxOf = (markup: string): string | undefined => markup.match(/<svg[^>]*viewBox="([^"]+)"/)?.[1];

    expect(viewBoxOf(withPoints)).toBeDefined();
    expect(viewBoxOf(withoutPoints)).toBe(viewBoxOf(withPoints));
  });

  it('闭合填充的透明度不削弱路径描边', () => {
    const markup = renderClosureScenario({
      'line-closure-mode': 'cycle',
      'line-closure-fill-opacity': 0.24,
    });

    expect(markup).toContain('rgba(56, 189, 248, 0.24)');
    expect(markup).not.toContain('opacity="0.24"');
  });
});
