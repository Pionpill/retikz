import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import type { PreviewControlState } from '../../src/modules/docs/components/component-preview/types';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import ShadowPlayground from '../../src/modules/docs/contents/kernel/components/effects/shadow/shadow-playground.demo';

const renderAtOffset = (offsetX: number, offsetY: number) => {
  const values = {
    offsetX,
    offsetY,
    blur: 40,
    color: '#0f172a',
    opacity: 0.35,
  };
  const state: PreviewControlState = {
    canonicalValues: values,
    values,
    setValue: () => undefined,
    applyValues: () => undefined,
    reset: () => undefined,
  };

  return renderToStaticMarkup(
    <PreviewControlStateContext.Provider value={state}>
      <ShadowPlayground />
    </PreviewControlStateContext.Provider>,
  );
};

const viewBoxOf = (markup: string) => markup.match(/viewBox="([^"]+)"/)?.[1];

const nodeBoundsOf = (markup: string) => {
  const rect = markup.match(/<rect\b[^>]*>/)?.[0];

  if (!rect) {
    return undefined;
  }

  const attribute = (name: string) => {
    const value = rect.match(new RegExp(`\\b${name}="([^"]+)"`))?.[1];
    return value === undefined ? undefined : Number(value);
  };

  const x = attribute('x');
  const y = attribute('y');
  const width = attribute('width');
  const height = attribute('height');

  if (x === undefined || y === undefined || width === undefined || height === undefined) {
    return undefined;
  }

  return { x, y, width, height };
};

const VIEW_BOX = { x: -140, y: -115, width: 280, height: 230 } as const;
const BLUR = 40;
const OFFSET_CORNERS = [
  [-20, -20],
  [-20, 30],
  [20, -20],
  [20, 30],
] as const;

describe('shadow playground positioning', () => {
  it('调整 shadow offset 时保持固定 viewBox，避免 Node 在预览中移动', () => {
    const rendered = OFFSET_CORNERS.map(([offsetX, offsetY]) => {
      const markup = renderAtOffset(offsetX, offsetY);

      return {
        bounds: nodeBoundsOf(markup),
        offsetX,
        offsetY,
        viewBox: viewBoxOf(markup),
      };
    });
    const [baseline] = rendered;

    expect(baseline.bounds).toBeDefined();
    expect(baseline.viewBox).toBe('-140 -115 280 230');

    for (const { bounds, offsetX, offsetY, viewBox } of rendered) {
      expect(viewBox).toBe(baseline.viewBox);
      expect(bounds).toEqual(baseline.bounds);

      if (!bounds) {
        continue;
      }

      const shadowBounds = {
        left: bounds.x + Math.min(0, offsetX) - BLUR,
        right: bounds.x + bounds.width + Math.max(0, offsetX) + BLUR,
        top: bounds.y + Math.min(0, offsetY) - BLUR,
        bottom: bounds.y + bounds.height + Math.max(0, offsetY) + BLUR,
      };

      expect(shadowBounds.left).toBeGreaterThanOrEqual(VIEW_BOX.x);
      expect(shadowBounds.right).toBeLessThanOrEqual(VIEW_BOX.x + VIEW_BOX.width);
      expect(shadowBounds.top).toBeGreaterThanOrEqual(VIEW_BOX.y);
      expect(shadowBounds.bottom).toBeLessThanOrEqual(VIEW_BOX.y + VIEW_BOX.height);
    }
  });
});
