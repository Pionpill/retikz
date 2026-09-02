import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '@/modules/docs/components/component-preview';

import { PreviewControlStateContext } from '@/modules/docs/components/component-preview/context';
import { getPreviewControlFields } from '@/modules/docs/components/component-preview/controls';
import { previewControlContract as chineseContract } from '@/modules/docs/contents/viz/plot/mark/path/line-radar.controls';
import PolarInterpolationDemo from '@/modules/docs/contents/viz/plot/mark/path/line-radar.demo';
import { previewControlContract as englishContract } from '@/modules/docs/contents/viz/plot/mark/path/line-radar.en.controls';

const renderWithValues = (values: Readonly<PreviewControlValues>): string =>
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
      <PolarInterpolationDemo />
    </PreviewControlStateContext.Provider>,
  );

describe('PathMark polar interpolation controls', () => {
  it('gives each plot an independent coordinate interpolation with chord and polar as the canonical comparison', () => {
    const fields = getPreviewControlFields(chineseContract.controls);

    expect(fields.map(field => field.id)).toEqual([
      'line-radar-left-coordinate-interpolation',
      'line-radar-right-coordinate-interpolation',
      'line-radar-closed',
    ]);
    expect(chineseContract.canonicalValues).toEqual({
      'line-radar-left-coordinate-interpolation': 'chord',
      'line-radar-right-coordinate-interpolation': 'polar',
      'line-radar-closed': true,
    });
    expect(englishContract.canonicalValues).toEqual(chineseContract.canonicalValues);

    const canonical = renderWithValues(chineseContract.canonicalValues);
    expect(
      renderWithValues({
        ...chineseContract.canonicalValues,
        'line-radar-left-coordinate-interpolation': 'polar',
      }),
    ).not.toBe(canonical);
    expect(
      renderWithValues({
        ...chineseContract.canonicalValues,
        'line-radar-right-coordinate-interpolation': 'chord',
      }),
    ).not.toBe(canonical);
  });
});
