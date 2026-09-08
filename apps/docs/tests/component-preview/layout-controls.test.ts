import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlValues } from '../../src/modules/docs/components/component-preview';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import LayoutViewboxDemo from '../../src/modules/docs/contents/kernel/components/layout/overview/layout-viewbox.demo';

const renderLayoutViewboxDemo = (values: PreviewControlValues): string =>
  renderToStaticMarkup(
    createElement(
      PreviewControlStateContext.Provider,
      {
        value: {
          canonicalValues: values,
          values,
          setValue: () => undefined,
          applyValues: () => undefined,
          reset: () => undefined,
        },
      },
      createElement(LayoutViewboxDemo),
    ),
  );

const extractLightgrayGuidePath = (markup: string): string => {
  const tag = markup.match(/<path\b[^>]*stroke="lightgray"[^>]*>/)?.[0];
  const path = tag?.match(/\sd="([^"]+)"/)?.[1];
  if (!path) throw new Error('Missing lightgray viewBox guide path');
  return path;
};

describe('Layout controls', () => {
  it('changing viewBox keeps display dimensions equal to the frame', () => {
    const canonical = renderLayoutViewboxDemo({
      viewBoxX: -120,
      viewBoxY: -120,
      viewBoxWidth: 240,
      viewBoxHeight: 240,
    });
    const widerViewBox = renderLayoutViewboxDemo({
      viewBoxX: -120,
      viewBoxY: -120,
      viewBoxWidth: 400,
      viewBoxHeight: 240,
    });

    expect(canonical).toMatch(/^<svg[^>]*style="[^"]*outline:1px dashed gray/);
    expect(canonical).toContain('width="240"');
    expect(canonical).toContain('height="240"');
    expect(widerViewBox).toContain('width="400"');
    expect(widerViewBox).toContain('height="240"');
    expect(extractLightgrayGuidePath(widerViewBox)).not.toBe(extractLightgrayGuidePath(canonical));
  });
});
