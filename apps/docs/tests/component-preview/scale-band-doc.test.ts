import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';

import {
  previewControlContract,
  scaleBandControls,
} from '../../src/modules/docs/contents/viz/plot/scale/position/scale-band.controls';
import Demo from '../../src/modules/docs/contents/viz/plot/scale/position/scale-band.demo';
import {
  previewControlContract as englishPreviewControlContract,
  scaleBandControls as englishScaleBandControls,
} from '../../src/modules/docs/contents/viz/plot/scale/position/scale-band.en.controls';

const scaleBandRoot = resolve('src/modules/docs/contents/viz/plot/scale/position');
const demoSource = readFileSync(resolve(scaleBandRoot, 'scale-band.demo.tsx'), 'utf8');
const chinesePage = readFileSync(resolve(scaleBandRoot, 'index.zh.mdx'), 'utf8');
const englishPage = readFileSync(resolve(scaleBandRoot, 'index.en.mdx'), 'utf8');

const fieldIdsOf = (controls: typeof scaleBandControls | typeof englishScaleBandControls) =>
  controls.sections.flatMap(section => section.controls.map(control => control.id));

const renderedBandGeometry = (): { barBottoms: Array<number>; xAxisBaseline: number } => {
  const markup = renderToStaticMarkup(createElement(Demo));
  const barBottoms = Array.from(
    markup.matchAll(/<rect x="[\d.-]+" y="([\d.-]+)" width="[\d.-]+" height="([\d.-]+)" fill="(?!none)[^"]+"/g),
    match => Number(match[1]) + Number(match[2]),
  );
  const horizontalAxis = Array.from(markup.matchAll(/<path d="([^"]+)"/g), match => match[1])
    .map(pathData => pathData.match(/^M [\d.-]+ ([\d.-]+) L [\d.-]+ \1$/))
    .find(match => match !== null);

  if (horizontalAxis === undefined) throw new Error('Expected a horizontal x-axis baseline');
  return { barBottoms, xAxisBaseline: Number(horizontalAxis[1]) };
};

describe('分类位置比例尺文档 playground', () => {
  it('controls 只保留 band / point scale 及其 padding', () => {
    const expectedIds = ['segments', 'scaleType', 'paddingInner', 'paddingOuter', 'padding'];

    expect(fieldIdsOf(scaleBandControls)).toEqual(expectedIds);
    expect(fieldIdsOf(englishScaleBandControls)).toEqual(expectedIds);
    expect(previewControlContract.canonicalValues).toEqual({
      scaleType: 'band',
      paddingInner: 0,
      paddingOuter: 0,
      padding: 0.5,
    });
    expect(englishPreviewControlContract.canonicalValues).toEqual(previewControlContract.canonicalValues);
    expect('presets' in previewControlContract).toBe(false);
    expect('presets' in englishPreviewControlContract).toBe(false);
  });

  it('用不同消费者直接显出格宽与点位语义', () => {
    expect(demoSource).toContain("values.scaleType === 'band'");
    expect(demoSource).toContain('<IntervalMark x="segment" y="revenue" />');
    expect(demoSource).toContain('<PathMark x="segment" y="revenue" />');
    expect(demoSource).toContain('<PointMark x="segment" y="revenue" size={6} />');
    expect(demoSource).toContain('type="band"');
    expect(demoSource).toContain('paddingInner={values.paddingInner}');
    expect(demoSource).not.toContain('values.showPath');
    expect(chinesePage).toContain('band 为 interval 提供格宽');
    expect(englishPage).toContain('band supplies bandwidth to intervals');
  });

  it('band 柱形底边贴合横轴基线', () => {
    const { barBottoms, xAxisBaseline } = renderedBandGeometry();

    expect(barBottoms).toHaveLength(5);
    expect(barBottoms).toEqual(barBottoms.map(() => xAxisBaseline));
  });
});
