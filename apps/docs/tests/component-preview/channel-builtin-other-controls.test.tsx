import type { FC } from 'react';

import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '@/modules/docs/components/component-preview';

import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { previewControlContract as chineseContract } from '@/modules/docs/contents/viz/plot/channel/builtin/builtin-other.controls';
import BuiltinOtherDemo from '@/modules/docs/contents/viz/plot/channel/builtin/builtin-other.demo';
import { previewControlContract as englishContract } from '@/modules/docs/contents/viz/plot/channel/builtin/builtin-other.en.controls';

const renderWithValues = (Component: FC, values: Readonly<PreviewControlValues>): string =>
  renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues: chineseContract.canonicalValues,
        values,
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <Component />
    </PreviewControlStateContext.Provider>,
  );

describe('builtin other-channel controls', () => {
  it('exposes complete bilingual controls for zIndex, order, and series', () => {
    const writableFields = getPreviewControlFields(chineseContract.controls);

    expect(
      writableFields.map(field => ({
        kind: field.kind,
        id: field.id,
        defaultValue: field.defaultValue,
        ...('min' in field ? { min: field.min, max: field.max, step: field.step } : {}),
      })),
    ).toEqual([
      { kind: 'switch', id: 'orderEnabled', defaultValue: true },
      { kind: 'switch', id: 'seriesEnabled', defaultValue: true },
      { kind: 'range', id: 'pointZIndex', defaultValue: 2, min: -2, max: 3, step: 1 },
    ]);
    expect(chineseContract.canonicalValues).toEqual({
      orderEnabled: true,
      seriesEnabled: true,
      pointZIndex: 2,
    });
    expect(chineseContract.relatedApis).toEqual(['PointMark.zIndex', 'PathMark.order', 'PathMark.series']);
    expect(englishContract.canonicalValues).toEqual(chineseContract.canonicalValues);
    expect(englishContract.relatedApis).toEqual(chineseContract.relatedApis);
  });

  it('changes the rendered plot when each channel control changes', () => {
    const baseline = renderWithValues(BuiltinOtherDemo, chineseContract.canonicalValues);

    expect(
      renderWithValues(BuiltinOtherDemo, {
        ...chineseContract.canonicalValues,
        orderEnabled: false,
      }),
    ).not.toBe(baseline);
    expect(
      renderWithValues(BuiltinOtherDemo, {
        ...chineseContract.canonicalValues,
        seriesEnabled: false,
      }),
    ).not.toBe(baseline);
    expect(
      renderWithValues(BuiltinOtherDemo, {
        ...chineseContract.canonicalValues,
        pointZIndex: -1,
      }),
    ).not.toBe(baseline);
  });
});
