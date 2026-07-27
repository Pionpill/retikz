import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import { PreviewControlStateContext } from '../../src/modules/docs/components/component-preview/context';
import Demo from '../../src/modules/docs/contents/viz/plot/mark/interval/bar-radial.demo';

type Point = {
  x: number;
  y: number;
};

const radialBarMarkup = (gap: number): string =>
  renderToStaticMarkup(
    <PreviewControlStateContext.Provider
      value={{
        canonicalValues: { 'bar-radial-inner-radius': 0, 'bar-radial-gap': 0 },
        values: { 'bar-radial-inner-radius': 0.4, 'bar-radial-gap': gap },
        setValue: () => undefined,
        applyValues: () => undefined,
        reset: () => undefined,
      }}
    >
      <Demo />
    </PreviewControlStateContext.Provider>,
  );

const sectorPathData = (markup: string): Array<string> =>
  Array.from(markup.matchAll(/<path d="([^"]+)"/g), match => match[1]);

const pointOf = (match: RegExpMatchArray | null): Point => {
  if (match === null) throw new Error('Expected sector path point');
  return { x: Number(match[1]), y: Number(match[2]) };
};

const innerStartOf = (pathData: string): Point => pointOf(pathData.match(/^M ([\d.-]+) ([\d.-]+)/));

const innerEndOf = (pathData: string): Point => {
  const linePoints = Array.from(pathData.matchAll(/ L ([\d.-]+) ([\d.-]+)/g));
  return pointOf(linePoints.at(-1) ?? null);
};

const distanceBetween = (a: Point, b: Point): number => Math.hypot(a.x - b.x, a.y - b.y);

describe('IntervalMark 径向柱 demo', () => {
  it('柱间距在完整圆周的首尾接缝处仍然可见', () => {
    const paths = sectorPathData(radialBarMarkup(0.3));
    expect(paths).toHaveLength(6);

    const seamDistance = distanceBetween(innerEndOf(paths[5]), innerStartOf(paths[0]));
    expect(seamDistance).toBeGreaterThan(10);
  });
});
