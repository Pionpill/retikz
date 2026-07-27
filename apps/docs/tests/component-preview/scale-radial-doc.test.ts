import { describe, expect, it } from 'vitest';

import {
  previewControlContract,
  scaleRadialControls,
} from '../../src/modules/docs/contents/viz/plot/scale/position/scale-radial.controls';
import {
  previewControlContract as englishPreviewControlContract,
  scaleRadialControls as englishScaleRadialControls,
} from '../../src/modules/docs/contents/viz/plot/scale/position/scale-radial.en.controls';

describe('径向位置比例尺文档 playground', () => {
  it('使用数据预设驱动并排的 linear / radial 对照', () => {
    const chineseControls = scaleRadialControls.sections.flatMap(section =>
      section.controls.map(control => ({ id: control.id, kind: control.kind })),
    );
    const englishControls = englishScaleRadialControls.sections.flatMap(section =>
      section.controls.map(control => ({ id: control.id, kind: control.kind })),
    );

    expect(chineseControls).toEqual([
      { id: 'dataPreset', kind: 'select' },
      { id: 'squareSteps', kind: 'table' },
      { id: 'evenSteps', kind: 'table' },
      { id: 'rainfall', kind: 'table' },
    ]);
    expect(englishControls).toEqual(chineseControls);
    expect(previewControlContract.canonicalValues).toEqual({ dataPreset: 'square' });
    expect(englishPreviewControlContract.canonicalValues).toEqual(previewControlContract.canonicalValues);
  });

  it('只展示当前数据预设对应的表格', () => {
    const tables = scaleRadialControls.sections
      .flatMap(section => section.controls)
      .filter(control => control.kind === 'table');

    expect(tables).toMatchObject([
      { id: 'squareSteps', visibleWhen: { controlId: 'dataPreset', oneOf: ['square'] } },
      { id: 'evenSteps', visibleWhen: { controlId: 'dataPreset', oneOf: ['even'] } },
      { id: 'rainfall', visibleWhen: { controlId: 'dataPreset', oneOf: ['rainfall'] } },
    ]);
  });
});
