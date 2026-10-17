import type { ComponentType } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '@/modules/docs/components/component-preview';
import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import JitterDemo from '@/modules/docs/contents/viz/plot/mark/point/point-jitter';
import NodeShapeDemo from '@/modules/docs/contents/viz/plot/mark/point/point-node-shape';
import {
  POINT_NODE_SHAPE_CONTROL_IDS,
  previewControlContract as nodeShapeContract,
} from '@/modules/docs/contents/viz/plot/mark/point/point-node-shape.controls';
import PositionDemo from '@/modules/docs/contents/viz/plot/mark/point/point-position';
import {
  POINT_POSITION_CONTROL_IDS,
  previewControlContract as positionContract,
} from '@/modules/docs/contents/viz/plot/mark/point/point-position.controls';
import StyleDemo from '@/modules/docs/contents/viz/plot/mark/point/point-style';
import {
  POINT_STYLE_CONTROL_IDS,
  previewControlContract as styleContract,
} from '@/modules/docs/contents/viz/plot/mark/point/point-style.controls';
import TextDemo from '@/modules/docs/contents/viz/plot/mark/point/point-text';
import {
  POINT_TEXT_CONTROL_IDS,
  previewControlContract as textContract,
} from '@/modules/docs/contents/viz/plot/mark/point/point-text.controls';
import type { PreviewControlContract } from '@/modules/docs/preview';

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
    const withoutJitter = renderControlledDemo(JitterDemo, {
      'point-jitter-span-kind': 'ratio',
      'point-jitter-ratio': 0,
      'point-jitter-range': 80,
      'point-jitter-distribution': 'uniform',
      'point-jitter-sigma': 0.5,
      'point-jitter-seed': 7,
    });
    const ratioJitter = renderControlledDemo(JitterDemo, {
      'point-jitter-span-kind': 'ratio',
      'point-jitter-ratio': 0.8,
      'point-jitter-range': 80,
      'point-jitter-distribution': 'uniform',
      'point-jitter-sigma': 0.5,
      'point-jitter-seed': 7,
    });
    const numericJitter = renderControlledDemo(JitterDemo, {
      'point-jitter-span-kind': 'range',
      'point-jitter-ratio': 0.8,
      'point-jitter-range': 80,
      'point-jitter-distribution': 'uniform',
      'point-jitter-sigma': 0.5,
      'point-jitter-seed': 7,
    });
    const anotherSeed = renderControlledDemo(JitterDemo, {
      'point-jitter-span-kind': 'ratio',
      'point-jitter-ratio': 0.8,
      'point-jitter-range': 80,
      'point-jitter-distribution': 'uniform',
      'point-jitter-sigma': 0.5,
      'point-jitter-seed': 8,
    });

    expect(ratioJitter).not.toBe(withoutJitter);
    expect(numericJitter).not.toBe(ratioJitter);
    expect(anotherSeed).not.toBe(ratioJitter);
  });

  it('极坐标消费角度类型、散布宽度与随机种子', () => {
    const withoutJitter = renderControlledDemo(JitterDemo, {
      'point-jitter-coordinate': 'polar2D',
      'point-jitter-span-kind': 'ratio',
      'point-jitter-ratio': 0,
      'point-jitter-range': 48,
      'point-jitter-distribution': 'uniform',
      'point-jitter-sigma': 0.5,
      'point-jitter-seed': 7,
    });
    const discrete = renderControlledDemo(JitterDemo, {
      'point-jitter-coordinate': 'polar2D',
      'point-jitter-span-kind': 'ratio',
      'point-jitter-ratio': 0.8,
      'point-jitter-range': 48,
      'point-jitter-distribution': 'uniform',
      'point-jitter-sigma': 0.5,
      'point-jitter-seed': 7,
    });
    const continuous = renderControlledDemo(JitterDemo, {
      'point-jitter-coordinate': 'polar2D',
      'point-jitter-span-kind': 'range',
      'point-jitter-ratio': 0.8,
      'point-jitter-range': 48,
      'point-jitter-distribution': 'uniform',
      'point-jitter-sigma': 0.5,
      'point-jitter-seed': 7,
    });
    const anotherSeed = renderControlledDemo(JitterDemo, {
      'point-jitter-coordinate': 'polar2D',
      'point-jitter-span-kind': 'ratio',
      'point-jitter-ratio': 0.8,
      'point-jitter-range': 48,
      'point-jitter-distribution': 'uniform',
      'point-jitter-sigma': 0.5,
      'point-jitter-seed': 8,
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

describe('PointMark 外观与标签控件', () => {
  it('填充与描边透明度传入实际 SVG', () => {
    const markup = renderControlledDemo(StyleDemo, {
      ...styleContract.canonicalValues,
      'point-opacity': 1,
      'point-fill-opacity': 0.2,
      'point-stroke-opacity': 0.4,
    });
    expect(markup).toContain('fill-opacity="0.2"');
    expect(markup).toContain('stroke-opacity="0.4"');
  });

  it('标签距离改变实际文字位置', () => {
    const near = renderControlledDemo(TextDemo, {
      ...textContract.canonicalValues,
      'point-text-mode': 'label',
      'point-label-distance': 0,
    });
    const far = renderControlledDemo(TextDemo, {
      ...textContract.canonicalValues,
      'point-text-mode': 'label',
      'point-label-distance': 30,
    });
    expect(near).toContain('<text');
    expect(far).not.toBe(near);
  });
});

describe('PointMark 星形渲染', () => {
  it('星形可实际渲染，角数变化改变绘制结果', () => {
    const values = { ...nodeShapeContract.canonicalValues, [POINT_NODE_SHAPE_CONTROL_IDS.shape]: 'star' };
    const five = renderControlledDemo(NodeShapeDemo, { ...values, [POINT_NODE_SHAPE_CONTROL_IDS.starPoints]: 5 });
    const seven = renderControlledDemo(NodeShapeDemo, { ...values, [POINT_NODE_SHAPE_CONTROL_IDS.starPoints]: 7 });
    const diamond = renderControlledDemo(NodeShapeDemo, { ...values, [POINT_NODE_SHAPE_CONTROL_IDS.shape]: 'diamond' });
    expect(five).toContain('<svg');
    expect(seven).toContain('<svg');
    const pathsOf = (svg: string) => Array.from(svg.matchAll(/\sd="([^"]+)"/g), match => match[1]);
    expect(pathsOf(five).length).toBeGreaterThan(0);
    expect(pathsOf(five)).not.toEqual(pathsOf(seven));
    expect(pathsOf(five)).not.toEqual(pathsOf(diamond));
  });
});
