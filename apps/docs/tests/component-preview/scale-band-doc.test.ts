import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

import {
  previewControlContract,
  scaleBandControls,
} from '../../src/modules/docs/contents/viz/plot/scale/position/scale-band.controls';
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

describe('分类位置比例尺文档 playground', () => {
  it('controls 只保留 band / point scale 及其 padding', () => {
    const expectedIds = ['segments', 'scaleType', 'paddingInner', 'paddingOuter', 'padding'];

    expect(fieldIdsOf(scaleBandControls)).toEqual(expectedIds);
    expect(fieldIdsOf(englishScaleBandControls)).toEqual(expectedIds);
    expect(previewControlContract.canonicalValues).toEqual({
      scaleType: 'band',
      paddingInner: 0.1,
      paddingOuter: 0.05,
      padding: 0.5,
    });
    expect(englishPreviewControlContract.canonicalValues).toEqual(previewControlContract.canonicalValues);
    expect('presets' in previewControlContract).toBe(false);
    expect('presets' in englishPreviewControlContract).toBe(false);
  });

  it('用不同消费者直接显出格宽与点位语义', () => {
    expect(demoSource).toContain("values.scaleType === 'band'");
    expect(demoSource).toContain("type: 'interval'");
    expect(demoSource).toContain("type: 'path'");
    expect(demoSource).toContain("type: 'point'");
    expect(demoSource).not.toContain('values.showPath');
    expect(chinesePage).toContain('band 为 interval 提供格宽');
    expect(englishPage).toContain('band supplies bandwidth to intervals');
  });
});
