import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import AxisCoordinateBasicsDemo from '../../src/modules/docs/contents/viz/plot/guide/axis/axis-coordinate-basics.demo';

type ViewBox = {
  x: number;
  y: number;
  width: number;
  height: number;
};

const renderedCartesianGeometry = (): { pathYCoordinates: Array<number>; viewBox: ViewBox } => {
  const markup = renderToStaticMarkup(createElement(AxisCoordinateBasicsDemo));
  const viewBoxMatch = markup.match(/<svg viewBox="([^"]+)"/);
  const pathMatch = markup.match(/<path d="([^"]+)" fill="none" stroke="#2563eb" stroke-width="2"/);

  if (viewBoxMatch === null) throw new Error('Expected the axis demo SVG viewBox');
  if (pathMatch === null) throw new Error('Expected the axis demo line path');

  const [x, y, width, height] = viewBoxMatch[1].split(' ').map(Number);
  const pathYCoordinates = Array.from(pathMatch[1].matchAll(/[ML] [\d.-]+ ([\d.-]+)/g), match => Number(match[1]));

  return { pathYCoordinates, viewBox: { x, y, width, height } };
};

describe('坐标轴文档示例', () => {
  it('笛卡尔折线的尖角完整落在 SVG 取景范围内', () => {
    const { pathYCoordinates, viewBox } = renderedCartesianGeometry();
    const halfStrokeWidth = 1;

    expect(Math.min(...pathYCoordinates) - halfStrokeWidth).toBeGreaterThanOrEqual(viewBox.y);
    expect(Math.max(...pathYCoordinates) + halfStrokeWidth).toBeLessThanOrEqual(viewBox.y + viewBox.height);
  });
});
