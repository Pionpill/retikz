import type { ComponentType } from 'react';

import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '@/modules/docs/components/component-preview';
import type { PreviewControlContract } from '@/modules/docs/preview';

import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
import {
  curveSegmentsControls,
  previewControlContract as curveSegmentsContract,
} from '../../src/modules/docs/contents/kernel/packages/base/math-algorithms/curve-segments.controls';
import CurveSegmentsDemo from '../../src/modules/docs/contents/kernel/packages/base/math-algorithms/curve-segments.demo';
import {
  curveSegmentsControls as englishCurveSegmentsControls,
  previewControlContract as englishCurveSegmentsContract,
} from '../../src/modules/docs/contents/kernel/packages/base/math-algorithms/curve-segments.en.controls';
import { previewControlContract as intersectionContract } from '../../src/modules/docs/contents/kernel/packages/base/math-algorithms/intersection-playground.controls';
import {
  circleCircleCenters,
  intersectionViewBox,
} from '../../src/modules/docs/contents/kernel/packages/base/math-algorithms/intersection-playground.data';

describe('@retikz/math package controls', () => {
  it('circle-circle control extremes remain inside the fixed viewport', () => {
    const fields = getPreviewControlFields(intersectionContract.controls);
    const offset = fields.find(field => field.id === 'offset');
    const radius = fields.find(field => field.id === 'radius');

    expect(offset).toMatchObject({ kind: 'range', min: -100, max: 100 });
    expect(radius).toMatchObject({ kind: 'range', max: 90 });
    if (!offset || offset.kind !== 'range' || !radius || radius.kind !== 'range') {
      throw new Error('intersection controls must expose numeric offset and radius limits');
    }

    const viewBoxRight = intersectionViewBox.x + intersectionViewBox.width;
    const viewBoxBottom = intersectionViewBox.y + intersectionViewBox.height;

    for (const offsetValue of [offset.min, offset.max]) {
      for (const center of circleCircleCenters(offsetValue)) {
        expect(center[0] - radius.max).toBeGreaterThanOrEqual(intersectionViewBox.x);
        expect(center[0] + radius.max).toBeLessThanOrEqual(viewBoxRight);
        expect(center[1] - radius.max).toBeGreaterThanOrEqual(intersectionViewBox.y);
        expect(center[1] + radius.max).toBeLessThanOrEqual(viewBoxBottom);
      }
    }
  });
});

type CurveSegmentsScenario = {
  Demo: ComponentType;
  contract: PreviewControlContract;
};

/** 在给定 controls 状态下渲染真实曲线段 playground */
const renderCurveSegments = (scenario: CurveSegmentsScenario, valuesOverride: PreviewControlValues): string => {
  const canonicalValues = scenario.contract.canonicalValues as PreviewControlValues;

  return renderToStaticMarkup(
    createElement(
      PreviewControlStateContext.Provider,
      {
        value: {
          canonicalValues,
          values: { ...canonicalValues, ...valuesOverride },
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        },
      },
      createElement(scenario.Demo),
    ),
  );
};

/** 提取固定 SVG 取景，防止 controls 切换时相机漂移 */
const viewBoxOf = (markup: string): string | undefined => markup.match(/<svg[^>]*viewBox="([^"]+)"/)?.[1];

describe('CurveSegment playground', () => {
  const chineseScenario: CurveSegmentsScenario = { Demo: CurveSegmentsDemo, contract: curveSegmentsContract };

  it('exposes the same bilingual controls for every supported CurveSegment kind', () => {
    const chineseFields = getPreviewControlFields(curveSegmentsControls);
    const englishFields = getPreviewControlFields(englishCurveSegmentsControls);

    expect(
      englishFields.map(field => ({
        id: field.id,
        kind: field.kind,
        defaultValue: field.defaultValue,
        min: field.kind === 'range' ? field.min : undefined,
        max: field.kind === 'range' ? field.max : undefined,
        step: field.kind === 'range' ? field.step : undefined,
        options: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
      })),
    ).toEqual(
      chineseFields.map(field => ({
        id: field.id,
        kind: field.kind,
        defaultValue: field.defaultValue,
        min: field.kind === 'range' ? field.min : undefined,
        max: field.kind === 'range' ? field.max : undefined,
        step: field.kind === 'range' ? field.step : undefined,
        options: field.kind === 'select' ? field.options.map(option => option.value) : undefined,
      })),
    );
    expect(englishCurveSegmentsContract.canonicalValues).toEqual(curveSegmentsContract.canonicalValues);
    expect(englishCurveSegmentsContract.relatedApis).toEqual(curveSegmentsContract.relatedApis);
    expect(chineseFields.find(field => field.id === 'kind')).toMatchObject({
      kind: 'select',
      options: [
        { value: 'line' },
        { value: 'quadraticBezier' },
        { value: 'cubicBezier' },
        { value: 'arc' },
        { value: 'ellipseArc' },
      ],
    });
    expect(chineseFields.find(field => field.id === 'sampleParameter')).toMatchObject({
      kind: 'range',
      min: 0,
      max: 1,
      step: 0.05,
    });
    expect(chineseFields.find(field => field.id === 'sliceStart')).toMatchObject({
      kind: 'range',
      min: 0,
      max: 1,
      step: 0.05,
    });
    expect(chineseFields.find(field => field.id === 'sliceEnd')).toMatchObject({
      kind: 'range',
      min: 0,
      max: 1,
      step: 0.05,
    });
  });

  it('renders every segment kind in a fixed viewport and responds to sampling and slicing', () => {
    const kindValues = ['line', 'quadraticBezier', 'cubicBezier', 'arc', 'ellipseArc'] as const;
    const markups = kindValues.map(kind =>
      renderCurveSegments(chineseScenario, { kind, sampleParameter: 0.5, sliceStart: 0.28, sliceEnd: 0.74 }),
    );

    expect(markups.every(markup => markup.includes('<svg'))).toBe(true);
    expect(markups.map(viewBoxOf)).toEqual([
      viewBoxOf(markups[0]),
      viewBoxOf(markups[0]),
      viewBoxOf(markups[0]),
      viewBoxOf(markups[0]),
      viewBoxOf(markups[0]),
    ]);
    expect(new Set(markups).size).toBe(kindValues.length);

    const earlySample = renderCurveSegments(chineseScenario, {
      kind: 'cubicBezier',
      sampleParameter: 0.2,
      sliceStart: 0.28,
      sliceEnd: 0.74,
    });
    const lateSample = renderCurveSegments(chineseScenario, {
      kind: 'cubicBezier',
      sampleParameter: 0.8,
      sliceStart: 0.28,
      sliceEnd: 0.74,
    });
    const shortSlice = renderCurveSegments(chineseScenario, {
      kind: 'cubicBezier',
      sampleParameter: 0.5,
      sliceStart: 0.42,
      sliceEnd: 0.58,
    });

    expect(lateSample).not.toBe(earlySample);
    expect(shortSlice).not.toBe(lateSample);
  });
});
