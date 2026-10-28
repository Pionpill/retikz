import { describe, expect, it } from 'vitest';

import { resolveVisiblePreviewControlSections } from '../../src/modules/docs/components/component-preview/controls';
import { nodeLabelPositionControls } from '../../src/modules/docs/contents/kernel/components/node/labels/node-label-position.controls';
import { nodeLabelPositionControls as nodeLabelPositionEnglishControls } from '../../src/modules/docs/contents/kernel/components/node/labels/node-label-position.en.controls';
import { nodeLabelRotatePinControls } from '../../src/modules/docs/contents/kernel/components/node/labels/node-label-rotate-pin.controls';
import { nodeLabelRotatePinControls as nodeLabelRotatePinEnglishControls } from '../../src/modules/docs/contents/kernel/components/node/labels/node-label-rotate-pin.en.controls';

describe('Node 控件', () => {
  it('隐藏不影响居中标签的控件', () => {
    const visibleIds = resolveVisiblePreviewControlSections(nodeLabelPositionControls.sections, {
      positionMode: 'center',
    }).flatMap(section => section.controls.map(field => field.id));

    expect(visibleIds).not.toContain('direction');
    expect(visibleIds).not.toContain('positionAngle');
    expect(visibleIds).not.toContain('boundary');
  });

  it('仅为旋转标签显示保持文字直立的选项', () => {
    const visibleIds = (rotateMode: string) =>
      resolveVisiblePreviewControlSections(nodeLabelRotatePinControls.sections, {
        rotateMode,
        pinStyle: 'none',
      }).flatMap(section => section.controls.map(field => field.id));

    expect(visibleIds('none')).not.toContain('keepUpright');

    for (const rotateMode of ['radial', 'tangent', 'angle']) {
      expect(visibleIds(rotateMode)).toContain('keepUpright');
    }
  });

  it('使英文控件在结构上与中文控件保持一致', () => {
    expect(nodeLabelPositionEnglishControls.sections[0].controls.map(control => control.id)).toEqual(
      nodeLabelPositionControls.sections[0].controls.map(control => control.id),
    );
    expect(
      nodeLabelRotatePinEnglishControls.sections.flatMap(section => section.controls.map(control => control.id)),
    ).toEqual(nodeLabelRotatePinControls.sections.flatMap(section => section.controls.map(control => control.id)));
  });
});
