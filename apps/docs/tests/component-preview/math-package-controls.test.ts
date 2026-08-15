import { describe, expect, it } from 'vitest';

import { getPreviewControlFields } from '../../src/modules/docs/components/component-preview/controls';
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
