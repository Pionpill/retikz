import type { ComponentType } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '@/modules/docs/components/component-preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';
import {
  getPreviewControlFields,
  resolveVisiblePreviewControlSections,
} from '@/modules/docs/components/component-preview/controls';
import { previewControlContract as basicContract } from '@/modules/docs/contents/viz/plot/mark/interval/bar-basic.controls';
import { previewControlContract as basicEnglishContract } from '@/modules/docs/contents/viz/plot/mark/interval/bar-basic.en.controls';
import { previewControlContract as seriesContract } from '@/modules/docs/contents/viz/plot/mark/interval/bar-grouped.controls';
import { previewControlContract as seriesEnglishContract } from '@/modules/docs/contents/viz/plot/mark/interval/bar-grouped.en.controls';
import BasicDemo from '@/modules/docs/contents/viz/plot/mark/interval/bar-position.demo';
import SeriesDemo from '@/modules/docs/contents/viz/plot/mark/interval/bar-series.demo';
import { previewControlContract as continuousContract } from '@/modules/docs/contents/viz/plot/mark/interval/interval-histogram.controls';
import ContinuousDemo from '@/modules/docs/contents/viz/plot/mark/interval/interval-histogram.demo';
import { previewControlContract as continuousEnglishContract } from '@/modules/docs/contents/viz/plot/mark/interval/interval-histogram.en.controls';
import { previewControlContract as sectorContract } from '@/modules/docs/contents/viz/plot/mark/interval/interval-sector.controls';
import { previewControlContract as cellContract } from '@/modules/docs/contents/viz/plot/mark/interval/rect-bounds.controls';
import CellDemo from '@/modules/docs/contents/viz/plot/mark/interval/rect-bounds.demo';
import { previewControlContract as cellEnglishContract } from '@/modules/docs/contents/viz/plot/mark/interval/rect-bounds.en.controls';

type CoordinateScenario = {
  name: string;
  Demo: ComponentType;
  contract: PreviewControlContract;
  englishContract: PreviewControlContract;
  coordinateId: string;
  width: number;
  height: number;
};

const scenarios: Array<CoordinateScenario> = [
  {
    name: '基础用法',
    Demo: BasicDemo,
    contract: basicContract,
    englishContract: basicEnglishContract,
    coordinateId: 'interval-basic-coordinate',
    width: 380,
    height: 280,
  },
  {
    name: '系列排列',
    Demo: SeriesDemo,
    contract: seriesContract,
    englishContract: seriesEnglishContract,
    coordinateId: 'interval-series-coordinate',
    width: 400,
    height: 280,
  },
  {
    name: '连续区间',
    Demo: ContinuousDemo,
    contract: continuousContract,
    englishContract: continuousEnglishContract,
    coordinateId: 'interval-continuous-coordinate',
    width: 360,
    height: 280,
  },
  {
    name: '二维 cell',
    Demo: CellDemo,
    contract: cellContract,
    englishContract: cellEnglishContract,
    coordinateId: 'interval-cell-coordinate',
    width: 380,
    height: 280,
  },
];

const alternateScenarios: Array<{ scenario: CoordinateScenario; overrides: PreviewControlValues }> = [
  { scenario: scenarios[0], overrides: { 'bar-position-direction': 'horizontal' } },
  { scenario: scenarios[1], overrides: { 'bar-series-mode': 'dodge' } },
  { scenario: scenarios[2], overrides: { 'interval-continuous-mode': 'proportional' } },
  { scenario: scenarios[3], overrides: { 'rect-bounds-mode': 'full' } },
];

const fieldContractOf = (contract: PreviewControlContract) =>
  getPreviewControlFields(contract.controls).map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    visibleWhen: field.visibleWhen,
    optionValues: 'options' in field ? field.options.map(option => option.value) : undefined,
  }));

type Point = {
  x: number;
  y: number;
};

const filledPathData = (markup: string): Array<string> =>
  Array.from(markup.matchAll(/<path d="([^"]+)" fill="(?!none)[^"]+"/g), match => match[1]);

const pointOf = (point: Point | undefined): Point => {
  if (point === undefined) throw new Error('Expected interval contour outer point');
  return point;
};

const linePointsOf = (pathData: string): Array<Point> =>
  Array.from(pathData.matchAll(/ L ([\d.-]+) ([\d.-]+)/g), match => ({
    x: Number(match[1]),
    y: Number(match[2]),
  }));

const outerStartOf = (pathData: string): Point => pointOf(linePointsOf(pathData).at(-1));

const outerEndOf = (pathData: string): Point => pointOf(linePointsOf(pathData).at(-2));

const angleOf = (center: Point, point: Point): number => Math.atan2(point.y - center.y, point.x - center.x);

const angularDistance = (a: number, b: number): number => Math.abs(Math.atan2(Math.sin(a - b), Math.cos(a - b)));

const viewBoxOf = (markup: string): { x: number; y: number; width: number; height: number } => {
  const match = markup.match(/<svg viewBox="([^"]+)"/);
  if (match === null) throw new Error('Expected preview SVG viewBox');
  const [x, y, width, height] = match[1].split(' ').map(Number);
  return { x, y, width, height };
};

const renderScenario = (
  { Demo, contract, coordinateId }: CoordinateScenario,
  coordinate: string,
  overrides: PreviewControlValues = {},
): string => {
  const canonicalValues = contract.canonicalValues as PreviewControlValues;
  const values = { ...canonicalValues, ...overrides, [coordinateId]: coordinate };

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

describe('IntervalMark playground 坐标系切换', () => {
  it.each(scenarios)('$name 暴露同一份区间的笛卡尔与极坐标投影', scenario => {
    const coordinateField = getPreviewControlFields(scenario.contract.controls).find(
      field => field.id === scenario.coordinateId,
    );

    expect(coordinateField).toMatchObject({
      kind: 'select',
      defaultValue: 'cartesian2D',
      options: [{ value: 'cartesian2D' }, { value: 'polar2D' }],
    });
    expect(scenario.contract.canonicalValues[scenario.coordinateId]).toBe('cartesian2D');
    expect(scenario.contract.controls.presentation).toBe('panel');
    if (scenario.contract.controls.presentation !== 'panel') return;
    expect(scenario.contract.controls.sections[0].defaultCollapsed).toBe(true);
  });

  it.each(scenarios)('$name 在两种坐标系中都生成真实且不同的 SVG', scenario => {
    const cartesian = renderScenario(scenario, 'cartesian2D');
    const polar = renderScenario(scenario, 'polar2D');
    const cartesianViewBox = viewBoxOf(cartesian);
    const polarViewBox = viewBoxOf(polar);

    expect(cartesian).toContain('<svg');
    expect(polar).toContain('<svg');
    expect(polarViewBox).toEqual(cartesianViewBox);
    expect(polarViewBox.x).toBeLessThan(0);
    expect(polarViewBox.y).toBeLessThan(0);
    expect(polarViewBox.x + polarViewBox.width).toBeGreaterThan(scenario.width);
    expect(polarViewBox.y + polarViewBox.height).toBeGreaterThan(scenario.height);
    expect(polar).not.toBe(cartesian);
  });

  it('基础区间默认 chord contour 的分类间距在完整圆周首尾仍然可见', () => {
    const polar = renderScenario(scenarios[0], 'polar2D', {
      'bar-position-gap': 0.5,
      'bar-position-corner-radius': 0,
      'bar-position-show-labels': false,
    });
    const paths = filledPathData(polar);

    expect(paths).toHaveLength(4);

    const center = { x: 190, y: 140 };
    const seamAngularGap = angularDistance(
      angleOf(center, outerEndOf(paths.at(-1) ?? '')),
      angleOf(center, outerStartOf(paths[0])),
    );

    expect(seamAngularGap).toBeGreaterThan(0.1);
  });

  it.each(scenarios)('$name 的中英文 controls 保持同一运行时结构', scenario => {
    expect(fieldContractOf(scenario.englishContract)).toEqual(fieldContractOf(scenario.contract));
    expect(scenario.englishContract.canonicalValues).toEqual(scenario.contract.canonicalValues);
    expect(scenario.englishContract.relatedApis).toEqual(scenario.contract.relatedApis);
  });

  it.each(alternateScenarios)('$scenario.name 的其它语义分支也能切换到极坐标', ({ scenario, overrides }) => {
    const cartesian = renderScenario(scenario, 'cartesian2D', overrides);
    const polar = renderScenario(scenario, 'polar2D', overrides);

    expect(cartesian).toContain('<svg');
    expect(polar).toContain('<svg');
    expect(polar).not.toBe(cartesian);
  });

  it('极坐标下隐藏只对笛卡尔有效的横向柱方向', () => {
    const visibleIds = (coordinate: string) =>
      resolveVisiblePreviewControlSections(basicContract.controls.sections, {
        ...basicContract.canonicalValues,
        'interval-basic-coordinate': coordinate,
      }).flatMap(section => section.controls.map(control => control.id));

    expect(visibleIds('cartesian2D')).toContain('bar-position-direction');
    expect(visibleIds('polar2D')).not.toContain('bar-position-direction');
  });

  it('angle 扇区保持 polar-only，不暴露无效坐标切换', () => {
    const coordinateFields = getPreviewControlFields(sectorContract.controls).filter(field =>
      'options' in field
        ? field.options.some(option => option.value === 'cartesian2D' || option.value === 'polar2D')
        : false,
    );

    expect(coordinateFields).toEqual([]);
  });
});
