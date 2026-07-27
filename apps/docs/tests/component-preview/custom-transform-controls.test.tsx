import type { FC } from 'react';

import { DEFAULT_TRANSFORM_CONTEXT } from '@retikz/data';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import { waterfallRows } from '../../src/modules/docs/contents/viz/plot/transform/custom-transform/waterfall.data';
import { waterfallTransform } from '../../src/modules/docs/contents/viz/plot/transform/custom-transform/waterfall.definition';
import WaterfallDemo from '../../src/modules/docs/contents/viz/plot/transform/custom-transform/waterfall.demo';

const renderWithInitialValue = (Component: FC, initialValue: number) =>
  renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues: { 'custom-transform-initial-value': 60 },
        values: { 'custom-transform-initial-value': initialValue },
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <Component />
    </PreviewControlStateContext.Provider>,
  );

describe('Plot custom transform documentation', () => {
  it('waterfall Definition derives cumulative interval fields for IntervalMark', () => {
    const rows = waterfallTransform.apply(
      waterfallRows,
      { kind: 'waterfall', field: 'delta', initialValue: 60 },
      DEFAULT_TRANSFORM_CONTEXT,
    );

    expect(rows[0]).toMatchObject({ from: 60, to: 95, direction: 'increase' });
    expect(rows[1]).toMatchObject({ from: 95, to: 75, direction: 'decrease' });
    expect(rows.at(-1)).toMatchObject({ from: 90, to: 110, direction: 'increase' });
  });

  it('initial value control changes the rendered waterfall without changing the camera', () => {
    const zeroMarkup = renderWithInitialValue(WaterfallDemo, 0);
    const hundredMarkup = renderWithInitialValue(WaterfallDemo, 100);

    expect(zeroMarkup).not.toBe(hundredMarkup);
    expect(zeroMarkup).toContain('viewBox="-15 -15 450 290"');
    expect(hundredMarkup).toContain('viewBox="-15 -15 450 290"');
    expect(zeroMarkup).toMatch(/^<svg[^>]*width="450" height="250"/);
  });
});
