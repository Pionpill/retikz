import type { ComponentType } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '@/modules/docs/components/component-preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import CartesianJitterDemo from '@/modules/docs/contents/viz/plot/mark/point/point-jitter-cartesian.demo';
import PolarJitterDemo from '@/modules/docs/contents/viz/plot/mark/point/point-jitter-polar.demo';
import {
  POINT_NODE_SHAPE_CONTROL_IDS,
  previewControlContract as nodeShapeContract,
} from '@/modules/docs/contents/viz/plot/mark/point/point-node-shape.controls';
import NodeShapeDemo from '@/modules/docs/contents/viz/plot/mark/point/point-node-shape.demo';
import {
  POINT_POSITION_CONTROL_IDS,
  previewControlContract as positionContract,
} from '@/modules/docs/contents/viz/plot/mark/point/point-position.controls';
import PositionDemo from '@/modules/docs/contents/viz/plot/mark/point/point-position.demo';
import {
  POINT_STYLE_CONTROL_IDS,
  previewControlContract as styleContract,
} from '@/modules/docs/contents/viz/plot/mark/point/point-style.controls';
import StyleDemo from '@/modules/docs/contents/viz/plot/mark/point/point-style.demo';
import {
  POINT_TEXT_CONTROL_IDS,
  previewControlContract as textContract,
} from '@/modules/docs/contents/viz/plot/mark/point/point-text.controls';
import TextDemo from '@/modules/docs/contents/viz/plot/mark/point/point-text.demo';

type CoordinateScenario = {
  name: string;
  Demo: ComponentType;
  contract: PreviewControlContract;
  coordinateId: string;
};

const scenarios: Array<CoordinateScenario> = [
  {
    name: '基础用法',
    Demo: PositionDemo,
    contract: positionContract,
    coordinateId: POINT_POSITION_CONTROL_IDS.coordinate,
  },
  {
    name: '样式变换',
    Demo: StyleDemo,
    contract: styleContract,
    coordinateId: POINT_STYLE_CONTROL_IDS.coordinate,
  },
  {
    name: '文本标签',
    Demo: TextDemo,
    contract: textContract,
    coordinateId: POINT_TEXT_CONTROL_IDS.coordinate,
  },
  {
    name: '节点形态',
    Demo: NodeShapeDemo,
    contract: nodeShapeContract,
    coordinateId: POINT_NODE_SHAPE_CONTROL_IDS.coordinate,
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

const renderControlledDemo = (Demo: ComponentType, values: PreviewControlValues): string =>
  renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues: values,
        values,
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <Demo />
    </PreviewControlStateContext.Provider>,
  );

describe('PointMark playground 坐标系切换', () => {
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

  it.each(scenarios)('$name 将同一组 PointMark 从笛卡尔投影切换为极坐标投影', scenario => {
    const cartesian = renderScenario(scenario, 'cartesian2D');
    const polar = renderScenario(scenario, 'polar2D');

    expect(cartesian).toContain('<svg');
    expect(polar).toContain('<svg');
    expect(polar).not.toBe(cartesian);
  });
});

describe('PointMark 位置散布 playground', () => {
  it('直角坐标消费散布单位、宽度与随机种子', () => {
    const withoutJitter = renderControlledDemo(CartesianJitterDemo, {
      'point-jitter-cartesian-span-kind': 'ratio',
      'point-jitter-cartesian-ratio': 0,
      'point-jitter-cartesian-range': 80,
      'point-jitter-cartesian-distribution': 'uniform',
      'point-jitter-cartesian-sigma': 0.5,
      'point-jitter-cartesian-seed': 7,
    });
    const ratioJitter = renderControlledDemo(CartesianJitterDemo, {
      'point-jitter-cartesian-span-kind': 'ratio',
      'point-jitter-cartesian-ratio': 0.8,
      'point-jitter-cartesian-range': 80,
      'point-jitter-cartesian-distribution': 'uniform',
      'point-jitter-cartesian-sigma': 0.5,
      'point-jitter-cartesian-seed': 7,
    });
    const numericJitter = renderControlledDemo(CartesianJitterDemo, {
      'point-jitter-cartesian-span-kind': 'range',
      'point-jitter-cartesian-ratio': 0.8,
      'point-jitter-cartesian-range': 80,
      'point-jitter-cartesian-distribution': 'uniform',
      'point-jitter-cartesian-sigma': 0.5,
      'point-jitter-cartesian-seed': 7,
    });
    const anotherSeed = renderControlledDemo(CartesianJitterDemo, {
      'point-jitter-cartesian-span-kind': 'ratio',
      'point-jitter-cartesian-ratio': 0.8,
      'point-jitter-cartesian-range': 80,
      'point-jitter-cartesian-distribution': 'uniform',
      'point-jitter-cartesian-sigma': 0.5,
      'point-jitter-cartesian-seed': 8,
    });

    expect(ratioJitter).not.toBe(withoutJitter);
    expect(numericJitter).not.toBe(ratioJitter);
    expect(anotherSeed).not.toBe(ratioJitter);
  });

  it('极坐标消费角度类型、散布宽度与随机种子', () => {
    const withoutJitter = renderControlledDemo(PolarJitterDemo, {
      'point-jitter-polar-scale': 'discrete',
      'point-jitter-polar-ratio': 0,
      'point-jitter-polar-range': 48,
      'point-jitter-polar-distribution': 'uniform',
      'point-jitter-polar-sigma': 0.5,
      'point-jitter-polar-seed': 7,
    });
    const discrete = renderControlledDemo(PolarJitterDemo, {
      'point-jitter-polar-scale': 'discrete',
      'point-jitter-polar-ratio': 0.8,
      'point-jitter-polar-range': 48,
      'point-jitter-polar-distribution': 'uniform',
      'point-jitter-polar-sigma': 0.5,
      'point-jitter-polar-seed': 7,
    });
    const continuous = renderControlledDemo(PolarJitterDemo, {
      'point-jitter-polar-scale': 'continuous',
      'point-jitter-polar-ratio': 0.8,
      'point-jitter-polar-range': 48,
      'point-jitter-polar-distribution': 'uniform',
      'point-jitter-polar-sigma': 0.5,
      'point-jitter-polar-seed': 7,
    });
    const anotherSeed = renderControlledDemo(PolarJitterDemo, {
      'point-jitter-polar-scale': 'discrete',
      'point-jitter-polar-ratio': 0.8,
      'point-jitter-polar-range': 48,
      'point-jitter-polar-distribution': 'uniform',
      'point-jitter-polar-sigma': 0.5,
      'point-jitter-polar-seed': 8,
    });

    expect(discrete).toContain('<svg');
    expect(continuous).toContain('<svg');
    expect(discrete).not.toMatch(/d="[^"]* A /);
    expect(continuous).toMatch(/d="[^"]* A /);
    expect(discrete).not.toBe(withoutJitter);
    expect(continuous).not.toBe(discrete);
    expect(anotherSeed).not.toBe(discrete);
  });
});
