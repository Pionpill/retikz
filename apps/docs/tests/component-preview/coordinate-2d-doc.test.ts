import type { FC, ReactNode } from 'react';

import { PlotSchema } from '@retikz/plot';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlsDefinition } from '../../src/modules/docs/components/component-preview/types';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import { buildPreviewIR } from '../../src/modules/docs/components/component-preview/utils';
import {
  coordinateCartesianControls,
  previewControlContract as cartesianContract,
} from '../../src/modules/docs/contents/viz/plot/coordinate/2d/coordinate-cartesian.controls';
import { renderCoordinateCartesian } from '../../src/modules/docs/contents/viz/plot/coordinate/2d/coordinate-cartesian.demo';
import {
  coordinateCartesianControls as englishCoordinateCartesianControls,
  previewControlContract as englishCartesianContract,
} from '../../src/modules/docs/contents/viz/plot/coordinate/2d/coordinate-cartesian.en.controls';
import {
  coordinatePolarControls,
  previewControlContract as polarContract,
} from '../../src/modules/docs/contents/viz/plot/coordinate/2d/coordinate-polar.controls';
import { renderCoordinatePolar } from '../../src/modules/docs/contents/viz/plot/coordinate/2d/coordinate-polar.demo';
import {
  coordinatePolarControls as englishCoordinatePolarControls,
  previewControlContract as englishPolarContract,
} from '../../src/modules/docs/contents/viz/plot/coordinate/2d/coordinate-polar.en.controls';

type PreviewRender<TValues extends object> = (values: TValues) => ReactNode;

const cartesianCanonicalValues = {
  markType: 'point',
  marginTop: 24,
  marginRight: 24,
  marginBottom: 24,
  marginLeft: 24,
  showGrid: true,
} as const;

const fieldContractOf = (definition: PreviewControlsDefinition) =>
  getPreviewControlFields(definition).map(field => ({
    id: field.id,
    kind: field.kind,
    defaultValue: field.defaultValue,
    min: 'min' in field ? field.min : undefined,
    max: 'max' in field ? field.max : undefined,
    step: 'step' in field ? field.step : undefined,
    optionValues: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
  }));

const previewOf = <TValues extends object>(render: PreviewRender<TValues> | undefined, values: TValues) => {
  if (render === undefined) return undefined;
  const Preview: FC = () => render(values);
  return { Preview, ir: buildPreviewIR(Preview).ir };
};

const plotMarkOf = <TValues extends object>(render: PreviewRender<TValues> | undefined, values: TValues) => {
  const plot = PlotSchema.safeParse(previewOf(render, values)?.ir.children[0]);
  const mark = plot.success ? plot.data.marks[0] : undefined;
  return mark === undefined ? undefined : { type: mark.type, closed: mark.type === 'path' ? mark.closed : undefined };
};

const markupOf = <TValues extends object>(render: PreviewRender<TValues> | undefined, values: TValues) => {
  const preview = previewOf(render, values);
  return preview === undefined ? '' : renderToStaticMarkup(createElement(preview.Preview));
};

const horizontalAxisOf = (markup: string) =>
  Array.from(markup.matchAll(/<path d="M ([\d.-]+) ([\d.-]+) L ([\d.-]+) ([\d.-]+)"[^>]*\/?>/g), match =>
    match.slice(1).map(Number),
  ).find(points => points[0] !== points[2] && points[1] === points[3]);

describe('二维坐标系文档 playground', () => {
  it('笛卡尔 controls 提供点线面、四边留白和网格且双语同构', () => {
    const chineseFields = fieldContractOf(coordinateCartesianControls);
    const englishFields = fieldContractOf(englishCoordinateCartesianControls);

    expect(coordinateCartesianControls.sections[0].defaultCollapsed).toBe(true);
    expect(englishCoordinateCartesianControls.sections[0].defaultCollapsed).toBe(true);
    expect(chineseFields).toEqual([
      {
        id: 'markType',
        kind: 'select',
        defaultValue: 'point',
        min: undefined,
        max: undefined,
        step: undefined,
        optionValues: ['point', 'line', 'interval'],
      },
      {
        id: 'marginTop',
        kind: 'range',
        defaultValue: 24,
        min: 8,
        max: 64,
        step: 4,
        optionValues: undefined,
      },
      {
        id: 'marginRight',
        kind: 'range',
        defaultValue: 24,
        min: 8,
        max: 64,
        step: 4,
        optionValues: undefined,
      },
      {
        id: 'marginBottom',
        kind: 'range',
        defaultValue: 24,
        min: 8,
        max: 64,
        step: 4,
        optionValues: undefined,
      },
      {
        id: 'marginLeft',
        kind: 'range',
        defaultValue: 24,
        min: 8,
        max: 64,
        step: 4,
        optionValues: undefined,
      },
      {
        id: 'showGrid',
        kind: 'switch',
        defaultValue: true,
        min: undefined,
        max: undefined,
        step: undefined,
        optionValues: undefined,
      },
    ]);
    expect(englishFields).toEqual(chineseFields);
    expect(cartesianContract.canonicalValues).toEqual(cartesianCanonicalValues);
    expect(englishCartesianContract.canonicalValues).toEqual(cartesianContract.canonicalValues);
  });

  it('极坐标 controls 提供点线面、内半径与角度控制且双语同构', () => {
    const chineseFields = fieldContractOf(coordinatePolarControls);
    const englishFields = fieldContractOf(englishCoordinatePolarControls);

    expect(coordinatePolarControls.sections[0].defaultCollapsed).toBe(true);
    expect(englishCoordinatePolarControls.sections[0].defaultCollapsed).toBe(true);
    expect(chineseFields).toEqual([
      {
        id: 'markType',
        kind: 'select',
        defaultValue: 'point',
        min: undefined,
        max: undefined,
        step: undefined,
        optionValues: ['point', 'line', 'interval'],
      },
      {
        id: 'innerRadius',
        kind: 'range',
        defaultValue: 0,
        min: 0,
        max: 0.75,
        step: 0.05,
        optionValues: undefined,
      },
      {
        id: 'startAngle',
        kind: 'range',
        defaultValue: -90,
        min: -180,
        max: 180,
        step: 15,
        optionValues: undefined,
      },
      {
        id: 'sweepAngle',
        kind: 'range',
        defaultValue: 360,
        min: 90,
        max: 360,
        step: 15,
        optionValues: undefined,
      },
    ]);
    expect(englishFields).toEqual(chineseFields);
    expect(polarContract.canonicalValues).toEqual({
      markType: 'point',
      innerRadius: 0,
      startAngle: -90,
      sweepAngle: 360,
    });
    expect(englishPolarContract.canonicalValues).toEqual(polarContract.canonicalValues);
  });

  it.each([
    ['point', 'point'],
    ['line', 'path'],
    ['interval', 'interval'],
  ] as const)('笛卡尔 %s control 渲染 %s mark', (markType, expectedType) => {
    expect(plotMarkOf(renderCoordinateCartesian, { ...cartesianCanonicalValues, markType })?.type).toBe(expectedType);
  });

  it.each([
    ['point', 'point'],
    ['line', 'path'],
    ['interval', 'interval'],
  ] as const)('极坐标 %s control 渲染 %s mark', (markType, expectedType) => {
    expect(
      plotMarkOf(renderCoordinatePolar, { markType, innerRadius: 0, startAngle: -90, sweepAngle: 360 })?.type,
    ).toBe(expectedType);
  });

  it('笛卡尔折线开放且极坐标折线闭合', () => {
    expect(plotMarkOf(renderCoordinateCartesian, { ...cartesianCanonicalValues, markType: 'line' })?.closed).toBe(
      false,
    );
    expect(
      plotMarkOf(renderCoordinatePolar, {
        markType: 'line',
        innerRadius: 0,
        startAngle: -90,
        sweepAngle: 360,
      })?.closed,
    ).toBe(true);
  });

  it('笛卡尔绘图区 controls 改变轴位置并关闭 y 网格', () => {
    const canonicalMarkup = markupOf(renderCoordinateCartesian, cartesianCanonicalValues);
    const adjustedMarkup = markupOf(renderCoordinateCartesian, {
      ...cartesianCanonicalValues,
      marginTop: 8,
      marginRight: 16,
      marginBottom: 32,
      marginLeft: 64,
      showGrid: false,
    });
    const canonicalAxis = horizontalAxisOf(canonicalMarkup);
    const adjustedAxis = horizontalAxisOf(adjustedMarkup);

    expect(canonicalAxis).toBeDefined();
    expect(adjustedAxis).toBeDefined();
    expect(adjustedAxis?.[0]).toBeGreaterThan(canonicalAxis?.[0] ?? Number.POSITIVE_INFINITY);
    expect(adjustedAxis?.[2]).toBeGreaterThan(canonicalAxis?.[2] ?? Number.POSITIVE_INFINITY);
    expect(adjustedAxis?.[1]).toBeLessThan(canonicalAxis?.[1] ?? Number.NEGATIVE_INFINITY);
    expect(adjustedMarkup.match(/<path\b/g)?.length ?? 0).toBeLessThan(canonicalMarkup.match(/<path\b/g)?.length ?? 0);
  });

  it('笛卡尔柱形基线与 x 轴重合', () => {
    const markup = markupOf(renderCoordinateCartesian, {
      ...cartesianCanonicalValues,
      markType: 'interval',
    });
    const horizontalAxis = horizontalAxisOf(markup);
    const barBottoms = Array.from(
      markup.matchAll(
        /<rect x="[\d.-]+" y="([\d.-]+)" width="[\d.-]+" height="([\d.-]+)" fill="[^"]+" stroke="[^"]+" stroke-width="0"\s*\/?>/g,
      ),
      match => Number(match[1]) + Number(match[2]),
    );

    expect(horizontalAxis).toBeDefined();
    expect(barBottoms).toHaveLength(6);
    for (const bottom of barBottoms) expect(bottom).toBeCloseTo(horizontalAxis?.[1] ?? Number.NaN, 5);
  });
});
